import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/StoreContext';

/**
 * Custom hook for adding items to cart with toast notification
 * Consolidates duplicate logic across ExplorePage, CollectionsPage, and GalleryPage
 */
export function useAddToCartWithToast() {
  const { addToCart } = useStore();
  const [message, setMessage] = useState('');

  const handleAdd = useCallback((image, collectionTitle = 'Gallery') => {
    const result = addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle,
      preview: image.url || image.src,
    });
    setMessage(result?.alreadyOwned ? 'You already own this image.' : 'Added to cart');
    return result;
  }, [addToCart]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 2400);
    return () => clearTimeout(timer);
  }, [message]);

  return { handleAdd, message, clearMessage: () => setMessage('') };
}
