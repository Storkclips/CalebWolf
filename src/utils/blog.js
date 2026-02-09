import { supabase } from '../lib/supabase';

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

export const getBlogPosts = async (includeUnpublished = false) => {
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeUnpublished) {
    const { data: profile } = user
      ? await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      : { data: null };

    if (!profile?.is_admin) {
      query = query.eq('published', true);
    }
  }

  const { data: posts, error } = await query;

  if (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }

  const postsWithImages = await Promise.all(
    posts.map(async (post) => {
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
        published: post.published,
        images: images?.map((img) => ({
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
        })) || [],
      };
    })
  );

  return postsWithImages;
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
    published: post.published,
    images: images?.map((img) => ({
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
    })) || [],
  };
};

export const createBlogPost = async (post) => {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      id: post.id,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt,
      tag: post.tag,
      content_html: post.contentHtml,
      published: post.published ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating blog post:', error);
    throw error;
  }

  if (post.images?.length > 0) {
    const imageInserts = post.images.map((img, index) => ({
      id: img.id,
      post_id: post.id,
      title: img.title,
      url: img.url,
      price: img.price,
      focus_x: img.focusX || 50,
      focus_y: img.focusY || 50,
      alt_text: img.altText,
      caption: img.caption,
      link_url: img.linkUrl,
      open_in_new_tab: img.openInNewTab || false,
      sort_order: index,
    }));

    const { error: imagesError } = await supabase
      .from('blog_images')
      .insert(imageInserts);

    if (imagesError) {
      console.error('Error creating blog images:', imagesError);
    }
  }

  return data;
};

export const updateBlogPost = async (postId, updates) => {
  const { error } = await supabase
    .from('blog_posts')
    .update({
      title: updates.title,
      date: updates.date,
      excerpt: updates.excerpt,
      tag: updates.tag,
      content_html: updates.contentHtml,
      published: updates.published ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);

  if (error) {
    console.error('Error updating blog post:', error);
    throw error;
  }

  if (updates.images) {
    await supabase.from('blog_images').delete().eq('post_id', postId);

    if (updates.images.length > 0) {
      const imageInserts = updates.images.map((img, index) => ({
        id: img.id,
        post_id: postId,
        title: img.title,
        url: img.url,
        price: img.price,
        focus_x: img.focusX || 50,
        focus_y: img.focusY || 50,
        alt_text: img.altText,
        caption: img.caption,
        link_url: img.linkUrl,
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
  value
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
    )}" src="${image.url}" alt="${escapeHtml(altText)}" />`;
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
        )}" src="${image.url}" alt="${escapeHtml(altText)}" />`;
        const linkedMarkup = linkUrl
          ? `<a href="${linkUrl}"${linkTarget}>${imageMarkup}</a>`
          : imageMarkup;
        output.push(
          `<figure class="blog-inline-figure">${linkedMarkup}<figcaption>${escapeHtml(
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
