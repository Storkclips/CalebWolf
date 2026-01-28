import { defaultBlogPosts } from '../data';

export const BLOG_STORAGE_KEY = 'calebwolf.blogPosts';

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

export const getStoredPosts = () => {
  if (typeof window === 'undefined') {
    return defaultBlogPosts;
  }

  try {
    const stored = window.localStorage.getItem(BLOG_STORAGE_KEY);
    if (!stored) return defaultBlogPosts;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultBlogPosts;
  } catch (error) {
    return defaultBlogPosts;
  }
};

export const savePosts = (posts) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(posts));
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
