import { supabase, proxyImageUrl } from './supabase';

/**
 * Convert a CSS declaration string ("letter-spacing: .08em; line-height: 1.2")
 * into a React style object.
 */
export function inlineCss(value = '') {
  return value.split(';').reduce((styles, declaration) => {
    const [property, ...parts] = declaration.split(':');
    if (!property || !parts.length) return styles;
    const key = property.trim().replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return { ...styles, [key]: parts.join(':').trim() };
  }, {});
}

/**
 * Return the best available cover image URL for a magazine record.
 * Prefers cover_url, then legacy field names, then first page thumb.
 */
export function getCoverSource(magazine) {
  if (!magazine) return '';
  return (
    magazine.cover_url ||
    magazine.cover ||
    magazine.coverImage ||
    magazine.thumbnail ||
    ''
  );
}

/**
 * Fetch all published magazines for the public listing.
 * Never returns drafts or hidden magazines.
 */
export async function fetchMagazineIndex() {
  const { data, error } = await supabase
    .from('magazines')
    .select(`
      id, title, slug, description, cover_url, status,
      digital_price, physical_price, subscription_price,
      page_count, published_at, updated_at, is_spotlight
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch a single magazine by slug, including its pages.
 * Only returns published magazines for public readers.
 * Pass { includeDrafts: true } for admin preview.
 *
 * Pages are loaded from magazine_pages (the canonical published content),
 * NOT from project_json or autosave_json.
 */
export async function fetchMagazineBySlug(slug, { includeDrafts = false } = {}) {
  if (!slug) throw new Error('Magazine slug is required.');

  let query = supabase
    .from('magazines')
    .select(`
      id, title, slug, description, cover_url, status,
      digital_price, physical_price, subscription_price,
      page_count, published_at, updated_at
    `)
    .eq('slug', slug);
  if (!includeDrafts) query = query.eq('status', 'published');

  const { data: magazine, error: magazineError } = await query.maybeSingle();

  if (magazineError) throw magazineError;
  if (!magazine) throw new Error(`Could not find magazine "${slug}".`);

  const { data: pages, error: pagesError } = await supabase
    .from('magazine_pages')
    .select('*')
    .eq('magazine_id', magazine.id)
    .order('page_number', { ascending: true });

  if (pagesError) throw pagesError;

  return {
    ...magazine,
    pages: pages || [],
    pageCount: pages?.length || magazine.page_count || 0,
  };
}

/**
 * Return a cover image URL safe for <img> tags. Data/blob URLs are returned
 * as-is; storage and external URLs go through the image proxy for resizing.
 */
export function getCoverDisplayUrl(url, width) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  return proxyImageUrl(url, width);
}

/**
 * Safely construct a magazine_pages row from editor page data.
 * Strips any existing primary keys or magazine_ids to prevent
 * cross-magazine contamination during the destructive replace on save.
 */
export function serializeMagazinePage(page, magazineId) {
  return {
    magazine_id: magazineId,
    page_number: page.page_number,
    page_kind: page.page_kind || 'inner',
    background_color: page.background_color || '#ffffff',
    elements: page.elements || [],
  };
}

/**
 * Convert a project_json page (from the iframe Studio) into a
 * magazine_pages row. The iframe Studio stores Fabric.js canvas
 * snapshots — we preserve the raw json and thumbnail but wrap them
 * in the elements field so the reader can render them.
 *
 * The page_kind mapping follows the editor's page type names.
 */
export function serializeStudioPage(studioPage, index, magazineId) {
  const kindMap = {
    'cover-outside': 'cover',
    'cover-inside': 'inside-cover',
    'inner': 'inner',
  };
  const kind = kindMap[studioPage.type] || 'inner';
  const bg = studioPage.json?.background || '#ffffff';

  const elements = [{
    id: studioPage.id || `page-${index}`,
    type: 'canvas',
    // The heavy preview thumbnail is intentionally dropped: the flipbook
    // renders from the canvas JSON, and the low-res thumb can outweigh it.
    src: '',
    json: studioPage.json || null,
    x: 0, y: 0, w: 100, h: 100,
    zIndex: 0,
  }];

  return {
    magazine_id: magazineId,
    page_number: index + 1,
    page_kind: kind,
    background_color: bg,
    elements,
  };
}

/**
 * Move the Studio's embedded project images out of the database and into
 * the magazine-pages storage bucket. Fabric page JSON arrives with every
 * photo embedded as a base64 data URL, which can make a single magazine
 * record weigh tens of megabytes; each unique image is uploaded once and
 * the stored project keeps a public URL (plus a crossOrigin flag so the
 * canvas stays exportable). If an upload fails the image stays embedded
 * so saving never breaks.
 */
function walkFabricObjects(objects, fn) {
  (objects || []).forEach((obj) => {
    fn(obj);
    if (Array.isArray(obj.objects)) walkFabricObjects(obj.objects, fn);
  });
}

function embeddedImageSrc(obj) {
  if (!obj || obj.type !== 'image') return '';
  if (typeof obj.assetDataUrl === 'string' && obj.assetDataUrl.startsWith('data:')) return obj.assetDataUrl;
  if (typeof obj.src === 'string' && obj.src.startsWith('data:')) return obj.src;
  return '';
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(',');
  const mime = (meta.match(/^data:([^;]+)/) || [])[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), mime };
}

function assetPath(dataUrl) {
  let hash = 5381;
  for (let i = 0; i < dataUrl.length; i += 1) {
    hash = ((hash << 5) + hash + dataUrl.charCodeAt(i)) | 0;
  }
  const mime = (dataUrl.slice(0, 60).match(/^data:([^;,]+)/) || [])[1] || 'image/png';
  const ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
  return `${Math.abs(hash).toString(36)}-${dataUrl.length.toString(36)}.${ext}`;
}

export async function externalizeProjectAssets(magazineId, project) {
  if (!magazineId || !project || typeof window === 'undefined') return project;

  const dataUrls = new Set();
  Object.values(project.assets || {}).forEach((asset) => {
    if (typeof asset?.dataUrl === 'string' && asset.dataUrl.startsWith('data:')) {
      dataUrls.add(asset.dataUrl);
    }
  });
  (project.pages || []).forEach((page) => {
    walkFabricObjects(page?.json?.objects, (obj) => {
      const src = embeddedImageSrc(obj);
      if (src) dataUrls.add(src);
    });
  });
  if (!dataUrls.size) return project;

  const bucket = supabase.storage.from('magazine-pages');
  const publicUrls = new Map();
  for (const dataUrl of dataUrls) {
    try {
      const { blob, mime } = dataUrlToBlob(dataUrl);
      const path = `${magazineId}/assets/${assetPath(dataUrl)}`;
      const { error } = await bucket.upload(path, blob, { contentType: mime, upsert: true });
      if (error) throw error;
      const { data } = bucket.getPublicUrl(path);
      if (data?.publicUrl) publicUrls.set(dataUrl, data.publicUrl);
    } catch (err) {
      console.warn('Magazine asset upload failed; keeping it embedded.', err);
    }
  }
  if (!publicUrls.size) return project;

  const replace = (value) => publicUrls.get(value);
  Object.values(project.assets || {}).forEach((asset) => {
    const url = replace(asset?.dataUrl);
    if (url) asset.dataUrl = url;
  });
  (project.pages || []).forEach((page) => {
    walkFabricObjects(page?.json?.objects, (obj) => {
      if (!obj || obj.type !== 'image') return;
      const url = replace(obj.assetDataUrl) || replace(obj.src);
      if (url) {
        obj.src = url;
        obj.assetDataUrl = url;
        obj.crossOrigin = 'anonymous';
      }
    });
  });
  return project;
}

/**
 * Fetch the ids of magazines currently free for everyone (an active
 * free-access campaign). Public data — readable by signed-out visitors.
 */
export async function fetchFreeMagazineIds() {
  const { data, error } = await supabase
    .from('magazine_promotions')
    .select('magazine_id')
    .eq('free_access', true)
    .eq('active', true)
    .gte('starts_at', '1970-01-01');
  if (error) return new Set();
  return new Set((data || []).map((r) => r.magazine_id));
}

/**
 * Resolve whether a user has access to a magazine.
 * Returns { granted: boolean, reason: string }.
 *
 * Reasons: admin, free, entitlement, subscription, unauthenticated, locked
 */
export async function resolveAccess(userId, isAdmin, magazineId, digitalPrice) {
  if (isAdmin) return { granted: true, reason: 'admin' };
  const freeIds = await fetchFreeMagazineIds();
  if (freeIds.has(magazineId)) return { granted: true, reason: 'free' };
  if (!digitalPrice || digitalPrice === 0) return { granted: true, reason: 'free' };
  if (!userId) return { granted: false, reason: 'unauthenticated' };

  const [entitlementRes, subscriptionRes] = await Promise.all([
    supabase
      .from('magazine_entitlements')
      .select('id')
      .eq('user_id', userId)
      .eq('magazine_id', magazineId)
      .is('revoked_at', null)
      .maybeSingle(),
    supabase
      .from('magazine_subscriptions')
      .select('id, status, current_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle(),
  ]);

  if (entitlementRes.data) return { granted: true, reason: 'entitlement' };

  const sub = subscriptionRes.data;
  if (sub) {
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
    if (!periodEnd || periodEnd > new Date()) return { granted: true, reason: 'subscription' };
  }

  return { granted: false, reason: 'locked' };
}

export { proxyImageUrl };
