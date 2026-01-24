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

export const renderBlogContent = (value, images = []) => {
  if (!value) return '';

  const supportsHtml = /<\/?[a-z][\s\S]*>/i.test(value.replace(/<image:[^>]+>/gi, ''));
  const parts = value.split(/<image:([^>]+)>/gi);
  const output = [];

  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      const image = findImageByToken(images, part);
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
