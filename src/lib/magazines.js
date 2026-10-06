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
      page_count, published_at, updated_at
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

  let query = supabase.from('magazines').select('*').eq('slug', slug);
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
    src: studioPage.thumb || '',
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
 * Resolve whether a user has access to a magazine.
 * Returns { granted: boolean, reason: string }.
 *
 * Reasons: admin, free, entitlement, subscription, unauthenticated, locked
 */
export async function resolveAccess(userId, isAdmin, magazineId, digitalPrice) {
  if (isAdmin) return { granted: true, reason: 'admin' };
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
