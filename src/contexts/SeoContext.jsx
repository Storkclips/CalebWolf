import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const defaultSeo = {
  site_title: 'Caleb Wolf Photography',
  meta_description: 'Cinematic photography portfolio, pricing, and blog by Caleb Wolf.',
  meta_keywords: '',
  og_title: '',
  og_description: '',
  og_image_url: '',
  twitter_card_type: 'summary_large_image',
  canonical_base_url: '',
  robots_index: true,
  robots_follow: true,
  json_ld: '',
  favicon_url: '',
};

const SeoContext = createContext(defaultSeo);

export const useSeo = () => useContext(SeoContext);

export const SeoProvider = ({ children }) => {
  const [seo, setSeo] = useState(defaultSeo);
  const [pageSeoMap, setPageSeoMap] = useState({});

  useEffect(() => {
    supabase.from('seo_settings').select('*').maybeSingle().then(({ data }) => {
      if (data) setSeo({ ...defaultSeo, ...data });
    });
    supabase.from('seo_pages').select('*').then(({ data }) => {
      if (data) {
        const map = {};
        data.forEach((row) => { map[row.page_key] = row; });
        setPageSeoMap(map);
      }
    });
  }, []);

  // Update favicon link when favicon_url changes
  useEffect(() => {
    if (!seo.favicon_url) return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = seo.favicon_url;
  }, [seo.favicon_url]);

  const setDocumentMeta = useCallback((overrides) => {
    const merged = { ...seo, ...overrides };
    // Title
    document.title = merged.site_title || defaultSeo.site_title;

    // Description
    const setMeta = (name, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[name='${name}']`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const setProp = (property, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[property='${property}']`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', merged.meta_description);
    if (merged.meta_keywords) setMeta('keywords', merged.meta_keywords);

    // Robots
    const robotsParts = [];
    robotsParts.push(merged.robots_index ? 'index' : 'noindex');
    robotsParts.push(merged.robots_follow ? 'follow' : 'nofollow');
    setMeta('robots', robotsParts.join(', '));

    // Open Graph
    setProp('og:title', merged.og_title || merged.site_title);
    setProp('og:description', merged.og_description || merged.meta_description);
    setProp('og:type', 'website');
    if (merged.og_image_url) setProp('og:image', merged.og_image_url);

    // Twitter
    setMeta('twitter:card', merged.twitter_card_type);
    setMeta('twitter:title', merged.og_title || merged.site_title);
    setMeta('twitter:description', merged.og_description || merged.meta_description);
    if (merged.og_image_url) setMeta('twitter:image', merged.og_image_url);

    // Canonical
    if (merged.canonical_base_url) {
      let link = document.querySelector("link[rel='canonical']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = merged.canonical_base_url + window.location.pathname;
    }

    // JSON-LD structured data
    let script = document.querySelector("script[type='application/ld+json']");
    if (merged.json_ld) {
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = merged.json_ld;
    } else if (script) {
      script.remove();
    }
  }, [seo]);

  return (
    <SeoContext.Provider value={{ seo, pageSeoMap, setDocumentMeta }}>
      {children}
    </SeoContext.Provider>
  );
};

// Hook for page-level SEO overrides
// Usage: usePageSeo('home', { site_title: '...', meta_description: '...', ... })
// The pageKey string identifies the page in the seo_pages table.
// The defaults object is used when the admin hasn't customized that page yet.
export const usePageSeo = (pageKey, defaults = {}) => {
  const { setDocumentMeta, pageSeoMap } = useSeo();
  const dbOverrides = pageSeoMap[pageKey];
  useEffect(() => {
    if (dbOverrides) {
      setDocumentMeta({
        site_title: dbOverrides.site_title || defaults.site_title,
        meta_description: dbOverrides.meta_description || defaults.meta_description,
        og_title: dbOverrides.og_title || defaults.og_title,
        og_description: dbOverrides.og_description || defaults.og_description,
        og_image_url: dbOverrides.og_image_url || defaults.og_image_url,
        robots_index: dbOverrides.robots_index ?? defaults.robots_index,
        robots_follow: dbOverrides.robots_follow ?? defaults.robots_follow,
        json_ld: dbOverrides.json_ld || defaults.json_ld,
      });
    } else {
      setDocumentMeta(defaults);
    }
    return () => setDocumentMeta({});
  }, [pageKey, JSON.stringify(defaults), dbOverrides, setDocumentMeta]);
};
