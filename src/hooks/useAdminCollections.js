import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAdminCollections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCollections = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('admin_collections')
      .select('*')
      .order('sort_order', { ascending: true });
    setCollections(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCollections(); }, []);

  return { collections, loading, refetch: fetchCollections };
}

export function useCollectionImages(collectionId) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchImages = async () => {
    if (!collectionId) {
      setImages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('collection_images')
      .select('*')
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: true });
    setImages(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchImages(); }, [collectionId]);

  return { images, loading, refetch: fetchImages };
}

export function useUnlockCodes(collectionId) {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCodes = async () => {
    setLoading(true);
    let query = supabase
      .from('unlock_codes')
      .select('*, admin_collections(title)')
      .order('created_at', { ascending: false });
    if (collectionId) {
      query = query.eq('collection_id', collectionId);
    }
    const { data } = await query;
    setCodes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCodes(); }, [collectionId]);

  return { codes, loading, refetch: fetchCodes };
}

export function useUnlockedCollections() {
  const [unlocked, setUnlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUnlocked = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('unlocked_collections')
      .select('*, admin_collections(id, title, slug, description, cover_url, category, tags, price_per_image, bulk_bundle_label, bulk_bundle_price)')
      .order('created_at', { ascending: false });
    setUnlocked(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchUnlocked(); }, []);

  return { unlocked, loading, refetch: fetchUnlocked };
}
