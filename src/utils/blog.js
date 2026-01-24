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
