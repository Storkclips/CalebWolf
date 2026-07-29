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

  useEffect(() => {
    supabase.from('seo_settings').select('*').maybeSingle().then(({ data }) => {
      if (data) setSeo({ ...defaultSeo, ...data });
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
    <SeoContext.Provider value={{ seo, setDocumentMeta }}>
      {children}
    </SeoContext.Provider>
  );
};

// Hook for page-level SEO overrides
export const usePageSeo = (overrides) => {
  const { setDocumentMeta } = useSeo();
  useEffect(() => {
    setDocumentMeta(overrides);
    // Reset to defaults on unmount
    return () => setDocumentMeta({});
  }, [JSON.stringify(overrides), setDocumentMeta]);
};
