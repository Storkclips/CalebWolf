import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useThemes() {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchThemes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('themes')
      .select('*')
      .order('sort_order', { ascending: true });
    setThemes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchThemes(); }, []);

  return { themes, loading, refetch: fetchThemes };
}

export function useGalleryImages(themeSlug) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from('gallery_images')
        .select('*, themes(name, slug)')
        .order('created_at', { ascending: false });

      if (themeSlug) {
        const { data: theme } = await supabase
          .from('themes')
          .select('id')
          .eq('slug', themeSlug)
          .maybeSingle();
        if (theme) {
          query = query.eq('theme_id', theme.id);
        }
      }

      const { data } = await query;
      setImages(data ?? []);
      setLoading(false);
    };
    fetch();
  }, [themeSlug]);

  return { images, loading };
}

export function useAllGalleryImages() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gallery_images')
      .select('*, themes(name, slug)')
      .order('created_at', { ascending: false });
    setImages(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  return { images, loading, refetch: fetchAll };
}

export function usePurchasedImages() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('purchases')
        .select('items, created_at')
        .order('created_at', { ascending: false });

      const allItems = (data ?? []).flatMap((p) =>
        (p.items ?? []).map((item) => ({ ...item, purchasedAt: p.created_at }))
      );
      setImages(allItems);
      setLoading(false);
    };
    fetch();
  }, []);

  return { images, loading };
}
