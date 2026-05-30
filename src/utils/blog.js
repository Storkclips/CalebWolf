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

  // Public/homepage/blog listing should only show published posts.
  // Admin pages should call getBlogPosts(true).
  if (!includeUnpublished) {
    query = query.eq('published', true);
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

  if (!post.published && !profile?.is_admin) {
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

const parseGridParts = (value) => {
  const [layoutPart = '', ...segments] = (value ?? '').split('|');

  let tokensPart = '';
  let textPart = '';
  let captionPart = '';

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

  return { layout: layoutPart, tokens, texts, caption };
};

const renderImageGrid = (layout, tokens, texts, caption, images = []) => {
  const [colsValue, rowsValue] = (layout ?? '').split('x').map((item) => Number(item.trim()));
  const columns = Number.isFinite(colsValue) && colsValue > 0 ? colsValue : 2;
  const rows = Number.isFinite(rowsValue) && rowsValue > 0 ? rowsValue : 2;
  const slots = Math.max(1, columns * rows);
  const tokenList = tokens ?? [];
  const textList = texts ?? [];
  const items = [];

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

    const imageMarkup = `<img class="blog-grid-image" style="--frame-position: ${focusX}% ${focusY}%;" data-image-id="${image.id}" data-image-title="${escapeHtml(
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

  const gridMarkup = `<div class="blog-image-grid-display" style="--grid-columns: ${columns};">${items.join('')}</div>`;

  if (!caption) return gridMarkup;

  const safeCaption = escapeHtml(caption)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('<br />');

  return `${gridMarkup}<p class="blog-grid-caption">${safeCaption}</p>`;
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

      const { layout, tokens, texts, caption } = parseGridParts(part);
      output.push(renderImageGrid(layout, tokens, texts, caption, images));
      return;
    }

    if (index % 3 === 2) {
      if (!part) return;

      const image = findImageByToken(images, part ?? '');

      if (image) {
        const focusX = image.focusX ?? 50;
        const focusY = image.focusY ?? 50;
        const altText = image.altText || image.title;
        const caption = image.caption || image.title;
        const linkUrl = image.linkUrl ? escapeHtml(image.linkUrl) : '';
        const linkTarget = image.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';

        const imageMarkup = `<img class="blog-inline-image" style="--frame-position: ${focusX}% ${focusY}%;" data-image-id="${image.id}" data-image-title="${escapeHtml(
          image.title,
        )}" data-link-url="${linkUrl}" src="${image.url}" alt="${escapeHtml(altText)}" />`;

        output.push(
          `<figure class="blog-inline-figure">${imageMarkup}<figcaption>${escapeHtml(
            caption,
          )} — click to view or buy.</figcaption></figure>`,
        );

        return;
      }

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