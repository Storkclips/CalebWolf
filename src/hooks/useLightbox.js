import { useCallback } from 'react';

/**
 * Custom hook for lightbox navigation logic
 * Consolidates duplicate navigation logic across multiple pages
 */
export function useLightboxNavigation(imageList, currentImage, setCurrentImage) {
  const navigate = useCallback((dir) => {
    if (!currentImage || !imageList) return;
    const idx = imageList.findIndex((i) => i.id === currentImage.id);
    const next = idx + dir;
    if (next >= 0 && next < imageList.length) setCurrentImage(imageList[next]);
  }, [imageList, currentImage, setCurrentImage]);

  return { navigate };
}
