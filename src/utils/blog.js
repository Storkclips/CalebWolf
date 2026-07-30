import { supabase, storagePathFromUrl } from '../lib/supabase';

export const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export const formatDate = () =>
  new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

const toBoolean = (value) => value === true || value === 'true';

const normalizeImage = (img) => ({
  id: img.id,
  title: img.title,
  url: img.url,
  price: img.price,
  focusX: img.focus_x,
  focusY: img.focus_y,
  altText: img.alt_text,
  caption: img.caption,
  linkUrl: img.link_url,
  openInNewTab: img.open_in_new_tab,
});

export const getBlogPosts = async (includeUnpublished = false) => {
  let query = supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });

  // Public/homepage/blog listing should only show published posts
  // that have either no scheduled_at or a scheduled_at in the past.
  // Admin pages should call getBlogPosts(true).
  if (!includeUnpublished) {
    const now = new Date().toISOString();
    query = query
      .eq('published', true)
      .or(`scheduled_at.is.null,scheduled_at.lte.${now}`);
  }

  const [{ data: posts, error }, { data: allImages }] = await Promise.all([
    query,
    supabase.from('blog_images').select('id, post_id, title, url, price, focus_x, focus_y, alt_text, caption, link_url, open_in_new_tab, sort_order').order('sort_order'),
  ]);

  if (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }

  const imagesByPost = (allImages ?? []).reduce((acc, img) => {
    (acc[img.post_id] ??= []).push(img);
    return acc;
  }, {});

  return (posts ?? []).map((post) => ({
    id: post.id,
    title: post.title,
    date: post.date,
    excerpt: post.excerpt,
    tag: post.tag,
    contentHtml: post.content_html,
    published: post.published === true,
    authorName: post.author_name ?? '',
    authorInitials: post.author_initials ?? '',
    publishDate: post.publish_date ?? '',
    readTime: post.read_time ?? '',
    lastEdited: post.last_edited ?? '',
    scheduledAt: post.scheduled_at ?? null,
    images: (imagesByPost[post.id] ?? []).map(normalizeImage),
  }));
};

export const getBlogPost = async (postId) => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle();

  if (error || !post) {
    console.error('Error fetching blog post:', error);
    return null;
  }

  const { data: profile } = user
    ? await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    : { data: null };

  const isScheduledFuture = post.scheduled_at && new Date(post.scheduled_at) > new Date();
  if ((!post.published || isScheduledFuture) && !profile?.is_admin) {
    return null;
  }

  const { data: images } = await supabase
    .from('blog_images')
    .select('*')
    .eq('post_id', post.id)
    .order('sort_order');

  return {
    id: post.id,
    title: post.title,
    date: post.date,
    excerpt: post.excerpt,
    tag: post.tag,
    contentHtml: post.content_html,
    published: post.published === true,
    authorName: post.author_name ?? '',
    authorInitials: post.author_initials ?? '',
    publishDate: post.publish_date ?? '',
    readTime: post.read_time ?? '',
    lastEdited: post.last_edited ?? '',
    scheduledAt: post.scheduled_at ?? null,
    images: (images ?? []).map(normalizeImage),
  };
};

// Upload a base64 DataURL to Supabase storage and return the public URL.
// If the URL is already a storage URL, returns it unchanged.
const uploadImageIfNeeded = async (img) => {
  if (!img.url) return img;
  // Already uploaded to storage
  if (!img.url.startsWith('data:')) return img;

  const match = img.url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return img;

  const mimeType = match[1];
  const base64 = match[2];
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const byteChars = atob(base64);
  const byteNums = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteNums], { type: mimeType });

  const { error: uploadError } = await supabase.storage.from('gallery').upload(path, blob, { contentType: mimeType });
  if (uploadError) {
    console.error('Image upload failed:', uploadError);
    return img;
  }

  const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(path);
  return { ...img, url: publicUrl };
};

// Ensure an admin_collection exists for this blog post and sync its images.
// Creates the collection if needed (unpublished, not selling).
// Updates existing collection images by blog_image_id so re-saves don't duplicate.
const syncBlogCollection = async (postId, postTitle, images, existingCollectionId) => {
  if (!images?.length) return existingCollectionId ?? null;

  const coverUrl = images[0]?.url || '';
  let collectionId = existingCollectionId ?? null;

  if (!collectionId) {
    const slug = `blog-${slugify(postTitle)}-${postId.slice(0, 8)}`;

    // Check if a collection with this slug already exists (e.g. from a prior save)
    const { data: existing } = await supabase
      .from('admin_collections')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      collectionId = existing.id;
      // Back-fill the collection_id on the post so future saves skip this lookup
      await supabase.from('blog_posts').update({ collection_id: collectionId }).eq('id', postId);
    } else {
      const { data: newColl, error: collError } = await supabase
        .from('admin_collections')
        .insert({
          title: postTitle,
          slug,
          description: '',
          category: 'Blog',
          cover_url: coverUrl,
          tags: [],
          price_per_image: 3,
          is_selling: false,
          is_published: false,
          sort_order: 9999,
        })
        .select('id')
        .single();

      if (collError || !newColl) {
        console.error('Failed to create blog collection:', collError);
        return null;
      }
      collectionId = newColl.id;
    }
  } else {
    // Update cover and title to stay in sync with post
    await supabase
      .from('admin_collections')
      .update({ title: postTitle, cover_url: coverUrl })
      .eq('id', collectionId);
  }

  // Fetch existing collection images for this collection
  const { data: existingColImgs } = await supabase
    .from('collection_images')
    .select('id, blog_image_id')
    .eq('collection_id', collectionId);

  const existingByBlogId = Object.fromEntries(
    (existingColImgs ?? []).filter((r) => r.blog_image_id).map((r) => [r.blog_image_id, r.id])
  );
  const incomingBlogIds = new Set(images.map((img) => img.id));

  // Remove collection images whose blog image was deleted
  const toDelete = (existingColImgs ?? [])
    .filter((r) => r.blog_image_id && !incomingBlogIds.has(r.blog_image_id))
    .map((r) => r.id);

  if (toDelete.length) {
    await supabase.from('collection_images').delete().in('id', toDelete);
  }

  // Upsert each blog image into collection_images
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const existingColImgId = existingByBlogId[img.id];

    if (existingColImgId) {
      await supabase
        .from('collection_images')
        .update({ title: img.title, url: img.url, price: img.price ?? 3, sort_order: i })
        .eq('id', existingColImgId);
    } else {
      await supabase
        .from('collection_images')
        .insert({
          collection_id: collectionId,
          blog_image_id: img.id,
          title: img.title,
          url: img.url,
          price: img.price ?? 3,
          sort_order: i,
          is_published: false,
        });
    }
  }

  return collectionId;
};

export const createBlogPost = async (post) => {
  const published = toBoolean(post.published);

  // Upload any base64 images to storage first
  const uploadedImages = await Promise.all((post.images ?? []).map(uploadImageIfNeeded));

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      id: post.id,
      title: post.title,
      date: post.date || '',
      excerpt: post.excerpt,
      tag: post.tag || '',
      content_html: post.contentHtml || '',
      published,
      author_name: post.authorName || '',
      author_initials: post.authorInitials || '',
      publish_date: post.publishDate || '',
      read_time: post.readTime ? Number(post.readTime) : null,
      last_edited: post.lastEdited || '',
      scheduled_at: post.scheduledAt || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating blog post:', error);
    console.error('Error details:', error.message, error.details, error.hint);
    throw error;
  }

  if (uploadedImages.length > 0) {
    const imageInserts = uploadedImages.map((img, index) => ({
      id: img.id,
      post_id: post.id,
      title: img.title,
      url: img.url,
      price: img.price,
      focus_x: img.focusX || 50,
      focus_y: img.focusY || 50,
      alt_text: img.altText || '',
      caption: img.caption || '',
      link_url: img.linkUrl || '',
      open_in_new_tab: img.openInNewTab || false,
      sort_order: index,
    }));

    const { error: imagesError } = await supabase
      .from('blog_images')
      .insert(imageInserts);

    if (imagesError) {
      console.error('Error creating blog images:', imagesError);
    }

    // Sync collection
    const collectionId = await syncBlogCollection(post.id, post.title, uploadedImages, null);
    if (collectionId) {
      await supabase.from('blog_posts').update({ collection_id: collectionId }).eq('id', post.id);
    }
  }

  return { ...data, images: uploadedImages };
};

export const updateBlogPost = async (postId, updates) => {
  const published = toBoolean(updates.published);

  // Upload any base64 images to storage first
  const uploadedImages = updates.images
    ? await Promise.all(updates.images.map(uploadImageIfNeeded))
    : null;

  // Fetch the current collection_id for this post
  const { data: currentPost } = await supabase
    .from('blog_posts')
    .select('collection_id')
    .eq('id', postId)
    .maybeSingle();

  const updatePayload = {
    title: updates.title,
    date: updates.date || '',
    excerpt: updates.excerpt,
    tag: updates.tag || '',
    content_html: updates.contentHtml || '',
    published,
    author_name: updates.authorName || '',
    author_initials: updates.authorInitials || '',
    publish_date: updates.publishDate || '',
    read_time: updates.readTime ? Number(updates.readTime) : null,
    last_edited: updates.lastEdited || '',
    scheduled_at: updates.scheduledAt || null,
    updated_at: new Date().toISOString(),
  };

  // Sync collection and capture new collection_id if needed
  if (uploadedImages?.length > 0) {
    const collectionId = await syncBlogCollection(
      postId, updates.title, uploadedImages, currentPost?.collection_id ?? null
    );
    if (collectionId) updatePayload.collection_id = collectionId;
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .update(updatePayload)
    .eq('id', postId)
    .select()
    .single();

  if (error) {
    console.error('Error updating blog post:', error);
    console.error('Error details:', error.message, error.details, error.hint);
    throw error;
  }

  if (uploadedImages) {
    await supabase.from('blog_images').delete().eq('post_id', postId);

    if (uploadedImages.length > 0) {
      const imageInserts = uploadedImages.map((img, index) => ({
        id: img.id,
        post_id: postId,
        title: img.title,
        url: img.url,
        price: img.price,
        focus_x: img.focusX || 50,
        focus_y: img.focusY || 50,
        alt_text: img.altText || '',
        caption: img.caption || '',
        link_url: img.linkUrl || '',
        open_in_new_tab: img.openInNewTab || false,
        sort_order: index,
      }));

      const { error: imagesError } = await supabase
        .from('blog_images')
        .insert(imageInserts);

      if (imagesError) {
        console.error('Error updating blog images:', imagesError);
      }
    }
  }

  return { ...data, images: uploadedImages ?? updates.images ?? [] };
};

export const deleteBlogPost = async (postId) => {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('Error deleting blog post:', error);
    throw error;
  }
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const findImageByToken = (images, token) => {
  if (!token) return null;
  const normalized = token.trim().toLowerCase();

  return (
    images?.find((image) => image.id.toLowerCase() === normalized) ??
    images?.find((image) => image.title.toLowerCase() === normalized)
  );
};

const STYLE_KEYS = ['shape', 'border', 'borderWidth', 'borderColor', 'opacity', 'fit', 'gap', 'size', 'align'];

const IMAGE_STYLE_DEFAULTS = {
  size: 'full',
  align: 'center',
};

const parseImageStyle = (token) => {
  const parts = token.split('|');
  const id = parts[0].trim();
  const style = { ...IMAGE_STYLE_DEFAULTS };
  for (let i = 1; i < parts.length; i += 1) {
    const eqIdx = parts[i].indexOf('=');
    if (eqIdx === -1) continue;
    const key = parts[i].slice(0, eqIdx).trim();
    const val = parts[i].slice(eqIdx + 1).trim();
    if (key === 'size') style.size = val;
    else if (key === 'align') style.align = val;
  }
  return { id, style };
};

const imageSizeClass = (size) => {
  if (size === 'small') return 'blog-img-small';
  if (size === 'medium') return 'blog-img-medium';
  if (size === 'large') return 'blog-img-large';
  return 'blog-img-full';
};

const imageAlignClass = (align) => {
  if (align === 'left') return 'blog-img-align-left';
  if (align === 'right') return 'blog-img-align-right';
  return 'blog-img-align-center';
};

const renderImageToken = (token, images) => {
  const { id, style } = parseImageStyle(token);
  const image = findImageByToken(images, id);
  if (!image) return '';
  const focusX = image.focusX ?? 50;
  const focusY = image.focusY ?? 50;
  const altText = image.altText || image.title;
  const caption = image.caption || image.title;
  const linkUrl = image.linkUrl ? escapeHtml(image.linkUrl) : '';
  const linkTarget = image.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
  const sizeCls = imageSizeClass(style.size);
  const alignCls = imageAlignClass(style.align);
  const imageMarkup = `<img class="blog-inline-image ${sizeCls}" style="--frame-position: ${focusX}% ${focusY}%;" data-image-id="${image.id}" data-image-title="${escapeHtml(
    image.title,
  )}" data-link-url="${linkUrl}" src="${image.url}" alt="${escapeHtml(altText)}" />`;
  return `<figure class="blog-inline-figure ${alignCls}">${imageMarkup}<figcaption>${escapeHtml(
    caption,
  )} — click to view or buy.</figcaption></figure>`;
};

const parseGridParts = (value) => {
  const [layoutPart = '', ...segments] = (value ?? '').split('|');

  let tokensPart = '';
  let textPart = '';
  let captionPart = '';
  const styleSegments = [];

  segments.forEach((segment) => {
    if (!segment) return;

    if (segment.startsWith('tokens=')) {
      tokensPart = segment.replace('tokens=', '');
      return;
    }

    if (segment.startsWith('text=')) {
      textPart = segment.replace('text=', '');
      return;
    }

    if (segment.startsWith('caption=')) {
      captionPart = segment.replace('caption=', '');
      return;
    }

    const eqIdx = segment.indexOf('=');
    if (eqIdx !== -1 && STYLE_KEYS.includes(segment.slice(0, eqIdx).trim())) {
      styleSegments.push(segment);
      return;
    }

    if (!tokensPart) {
      tokensPart = segment;
      return;
    }

    captionPart = captionPart ? `${captionPart}|${segment}` : segment;
  });

  const tokens = tokensPart
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  const texts = textPart
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => decodeURIComponent(entry));

  const caption = decodeURIComponent(captionPart || '').trim();
  const style = parseGridStyle(styleSegments);

  return { layout: layoutPart, tokens, texts, caption, style };
};

const GRID_STYLE_DEFAULTS = {
  shape: 'rounded',
  border: 'solid',
  borderWidth: 2,
  borderColor: '#3a3a4a',
  opacity: 1,
  fit: 'cover',
  gap: 12,
};

const parseGridStyle = (segments) => {
  const style = { ...GRID_STYLE_DEFAULTS };
  const knownStyleKeys = ['shape', 'border', 'borderWidth', 'borderColor', 'opacity', 'fit', 'gap'];
  (segments || []).forEach((seg) => {
    if (!seg) return;
    const eqIdx = seg.indexOf('=');
    if (eqIdx === -1) return;
    const key = seg.slice(0, eqIdx).trim();
    const val = seg.slice(eqIdx + 1).trim();
    if (knownStyleKeys.includes(key)) {
      if (key === 'borderWidth' || key === 'gap') style[key] = Number(val) || 0;
      else if (key === 'opacity') style[key] = Math.min(1, Math.max(0, Number(val) || 1));
      else style[key] = val;
    }
  });
  return style;
};

const renderImageGrid = (layout, tokens, texts, caption, images = [], style = GRID_STYLE_DEFAULTS) => {
  const [colsValue, rowsValue] = (layout ?? '').split('x').map((item) => Number(item.trim()));
  const columns = Number.isFinite(colsValue) && colsValue > 0 ? colsValue : 2;
  const rows = Number.isFinite(rowsValue) && rowsValue > 0 ? rowsValue : 2;
  const slots = Math.max(1, columns * rows);
  const tokenList = tokens ?? [];
  const textList = texts ?? [];
  const items = [];

  const radiusClass = style.shape === 'square' ? '0px' : style.shape === 'pill' ? '50%' : '10px';
  const borderStyle = style.border === 'none' ? 'none' : style.border;
  const borderWidth = style.border === 'none' ? '0' : `${style.borderWidth}px`;
  const fitClass = style.fit === 'contain' ? 'contain' : style.fit === 'border' ? 'border' : 'cover';

  for (let index = 0; index < slots; index += 1) {
    const token = tokenList[index];
    const text = textList[index] ?? '';
    const image = findImageByToken(images, token);

    if (!image) {
      items.push('<div class="blog-grid-item blog-grid-item-empty"></div>');
      continue;
    }

    const focusX = image.focusX ?? 50;
    const focusY = image.focusY ?? 50;
    const altText = image.altText || image.title;

    const imageMarkup = `<img class="blog-grid-image blog-grid-fit-${fitClass}" style="--frame-position: ${focusX}% ${focusY}%; border-radius: ${radiusClass}; border: ${borderWidth} ${borderStyle} ${escapeHtml(style.borderColor)}; opacity: ${style.opacity};" data-image-id="${image.id}" data-image-title="${escapeHtml(
      image.title,
    )}" data-link-url="${escapeHtml(image.linkUrl || '')}" src="${image.url}" alt="${escapeHtml(altText)}" />`;

    const safeText = text
      ? escapeHtml(text)
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .join('<br />')
      : '';

    const textMarkup = safeText ? `<div class="blog-grid-item-text">${safeText}</div>` : '';

    const contentMarkup = textMarkup
      ? `<div class="blog-grid-item-content">${imageMarkup}${textMarkup}</div>`
      : imageMarkup;

    items.push(`<div class="blog-grid-item">${contentMarkup}</div>`);
  }

  const gridMarkup = `<div class="blog-image-grid-display" style="--grid-columns: ${columns}; --grid-gap: ${style.gap}px;">${items.join('')}</div>`;

  if (!caption) return gridMarkup;

  const safeCaption = escapeHtml(caption)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('<br />');

  return `${gridMarkup}<p class="blog-grid-caption">${safeCaption}</p>`;
};

const EMAIL_STYLES = {
  h1: 'margin:0 0 16px;font-family:Georgia,serif;font-size:26px;color:#fff;line-height:1.3;',
  h2: 'margin:24px 0 12px;font-family:Georgia,serif;font-size:21px;color:#fff;line-height:1.3;',
  h3: 'margin:20px 0 10px;font-family:Georgia,serif;font-size:17px;color:#fff;line-height:1.3;',
  p: 'margin:0 0 16px;font-size:15px;color:#cfcfd8;line-height:1.75;',
  a: 'color:#f3d27a;text-decoration:none;',
  strong: 'color:#fff;',
  em: 'color:#cfcfd8;',
  blockquote: 'margin:0 0 16px;padding:8px 16px;border-left:3px solid #f3d27a;color:#aaa;font-style:italic;',
  ul: 'margin:0 0 16px 20px;color:#cfcfd8;font-size:15px;line-height:1.75;',
  ol: 'margin:0 0 16px 20px;color:#cfcfd8;font-size:15px;line-height:1.75;',
  li: 'margin:0 0 6px;color:#cfcfd8;font-size:15px;line-height:1.75;',
};

const applyEmailStyles = (html) =>
  html.replace(/<(h1|h2|h3|p|a|strong|em|blockquote|ul|ol|li)(\s[^>]*)?>/gi, (match, tag, attrs) => {
    const style = EMAIL_STYLES[tag.toLowerCase()];
    if (!style) return match;
    if (attrs && /style\s*=/i.test(attrs)) {
      return match.replace(/style\s*=\s*"?[^">]*"?/i, `style="${style}"`);
    }
    return `<${tag}${attrs || ''} style="${style}">`;
  });

const FALLBACK_TEMPLATE = {
  subject_template: '{{post_title}}',
  html_template: `<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a10;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#12121a;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:24px 40px;border-bottom:1px solid #2a2a3a;">
        <p style="margin:0;font-family:Georgia,serif;font-size:18px;color:#f3d27a;letter-spacing:0.08em;text-transform:uppercase;">Caleb Wolf Photography</p>
      </td></tr>
      <tr><td style="padding:0;">
        <img src="{{hero_image}}" alt="" width="600" style="display:block;width:100%;max-width:600px;" />
      </td></tr>
      <tr><td style="padding:32px 40px 8px;">
        <p style="margin:0 0 8px;font-size:12px;color:#f3d27a;text-transform:uppercase;letter-spacing:0.12em;">{{section_label}}</p>
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;color:#ffffff;line-height:1.25;">{{post_title}}</h1>
        <p style="margin:0 0 24px;font-size:13px;color:#888;">By {{author_name}} &middot; {{publish_date}}</p>
      </td></tr>
      <tr><td style="padding:0 40px 8px;">
        <p style="margin:0 0 16px;font-size:16px;color:#dcdce4;line-height:1.7;font-style:italic;">{{excerpt}}</p>
        <div style="border-top:1px solid #2a2a3a;margin:8px 0 24px;"></div>
        {{article_preview}}
      </td></tr>
      <tr><td style="padding:16px 40px 40px;" align="center">
        <a href="{{post_link}}" style="display:inline-block;background:#f3d27a;color:#0a0a10;font-weight:700;font-size:15px;padding:14px 40px;border-radius:8px;text-decoration:none;">Read the Full Article</a>
      </td></tr>
      <tr><td style="padding:0 40px 32px;">
        <div style="border-top:1px solid #2a2a3a;margin:0 0 16px;"></div>
        <p style="margin:0;font-size:12px;color:#555;text-align:center;">You are receiving this because you subscribed to the Caleb Wolf Photography newsletter.</p>
      </td></tr>
    </table>
  </td></tr>
</table>`,
};

const mergeTemplate = (text, values) =>
  text.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');

const buildArticlePreview = (contentHtml, images, maxParagraphs = 3) => {
  let body = contentHtml || '';

  // Inline single images
  body = body.replace(/<image:([^>]+)>/gi, (_, token) => {
    const { id, style } = parseImageStyle(token);
    const image = findImageByToken(images, id);
    if (!image) return '';
    const alt = image.altText || image.title || '';
    const caption = image.caption || image.title || '';
    const sizeMap = { small: '280px', medium: '400px', large: '520px', full: '560px' };
    const maxWidth = sizeMap[style.size] || '560px';
    const alignStyle = style.align === 'left' ? 'margin:0 auto 20px 0' : style.align === 'right' ? 'margin:0 0 20px auto' : 'margin:0 auto 20px';
    return `<table width="100%" cellpadding="0" cellspacing="0" style="${alignStyle};"><tr><td style="padding:0;text-align:${style.align === 'left' ? 'left' : style.align === 'right' ? 'right' : 'center'};">
      <img src="${image.url}" alt="${escapeHtml(alt)}" style="width:100%;max-width:${maxWidth};border-radius:12px;display:inline-block;" />
      <p style="margin:8px 0 0;font-size:13px;color:#888;font-style:italic;">${escapeHtml(caption)}</p>
    </td></tr></table>`;
  });

  // Inline image grids as a table
  body = body.replace(/<image-grid:([^>]+)>/gi, (_, raw) => {
    const { tokens, texts, caption } = parseGridParts(raw);
    const cells = tokens.map((token, i) => {
      const image = findImageByToken(images, token);
      if (!image) return '<td></td>';
      const alt = image.altText || image.title || '';
      const text = (texts[i] || '').trim();
      const textMarkup = text
        ? `<p style="margin:8px 0 0;font-size:13px;color:#aaa;line-height:1.5;">${escapeHtml(text)}</p>`
        : '';
      return `<td style="vertical-align:top;padding:6px;width:50%;">
        <img src="${image.url}" alt="${escapeHtml(alt)}" style="width:100%;border-radius:10px;display:block;" />
        ${textMarkup}
      </td>`;
    });
    const rows = [];
    for (let i = 0; i < cells.length; i += 2) {
      rows.push(`<tr>${cells.slice(i, i + 2).join('')}</tr>`);
    }
    const captionMarkup = caption
      ? `<p style="margin:8px 0 0;font-size:13px;color:#888;font-style:italic;">${escapeHtml(caption)}</p>`
      : '';
    return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">${rows.join('')}</table>${captionMarkup}`;
  });

  body = applyEmailStyles(body);

  // Truncate to first N paragraph-level blocks for the preview
  const blocks = body.split(/<\/?(?:p|h[1-3]|blockquote|ul|ol|table|div)[^>]*>/i).filter((b) => b.trim());
  if (blocks.length > maxParagraphs) {
    const truncated = blocks.slice(0, maxParagraphs).join('</p><p style="margin:0 0 16px;font-size:15px;color:#cfcfd8;line-height:1.75;">');
    return `<p style="margin:0 0 16px;font-size:15px;color:#cfcfd8;line-height:1.75;">${truncated}</p><p style="margin:16px 0 0;font-size:14px;color:#888;font-style:italic;">Continue reading on the site…</p>`;
  }
  return body;
};

export const buildNewsletterEmail = (post, origin = '', template = null) => {
  const postUrl = `${origin}/blog/${post.id}`;
  const title = post.title || 'New post';
  const excerpt = post.excerpt || '';
  const author = post.authorName || 'Caleb Wolf';
  const date = post.publishDate || post.date || '';
  const images = post.images || [];
  const contentHtml = post.contentHtml || '';

  // Pick hero image: first image in the post, or first image in the images array
  const heroImage =
    images.find((img) => contentHtml.includes(`<image:${img.id}`) || contentHtml.includes(`<image:${img.title}`)) ||
    images[0];
  const heroUrl = heroImage?.url || '';
  const heroAlt = heroImage?.altText || heroImage?.title || title;

  const articlePreview = buildArticlePreview(contentHtml, images);

  const values = {
    post_title: escapeHtml(title),
    post_link: escapeHtml(postUrl),
    author_name: escapeHtml(author),
    publish_date: escapeHtml(date),
    excerpt: escapeHtml(excerpt),
    section_label: 'Latest Story',
    hero_image: heroUrl,
    article_preview: articlePreview,
    story_title: escapeHtml(title),
    story_preview: escapeHtml(excerpt),
    story_link: escapeHtml(postUrl),
  };

  const tpl = template || FALLBACK_TEMPLATE;
  const subject = mergeTemplate(tpl.subject_template || title, values) || title;
  const htmlBody = mergeTemplate(tpl.html_template, values);

  return { subject, htmlBody };
};

export const renderBlogContent = (value, images = []) => {
  if (!value) return '';

  const supportsHtml = /<\/?[a-z][\s\S]*>/i.test(
    value.replace(/<image-grid:[^>]+>|<image:[^>]+>/gi, ''),
  );

  const parts = value.split(/<image-grid:([^>]+)>|<image:([^>]+)>/gi);
  const output = [];

  parts.forEach((part, index) => {
    if (index % 3 === 1) {
      if (!part) return;

      const { layout, tokens, texts, caption, style } = parseGridParts(part);
      output.push(renderImageGrid(layout, tokens, texts, caption, images, style));
      return;
    }

    if (index % 3 === 2) {
      if (!part) return;
      const rendered = renderImageToken(part ?? '', images);
      if (rendered) { output.push(rendered); return; }
      output.push(`<p>${escapeHtml(`<image:${part}>`)}</p>`);
      return;
    }

    if (supportsHtml) {
      if (part.trim()) {
        output.push(part);
      }
      return;
    }

    const trimmed = part.trim();

    if (!trimmed) return;

    const paragraphs = trimmed.split(/\n{2,}/g).map((paragraph) =>
      paragraph
        .split('\n')
        .map((line) => escapeHtml(line))
        .join('<br />'),
    );

    paragraphs.forEach((paragraph) => {
      output.push(`<p>${paragraph}</p>`);
    });
  });

  return output.join('');
};