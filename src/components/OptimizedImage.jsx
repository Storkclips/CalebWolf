import { useState, useEffect, useRef } from 'react';
import { proxyImageUrl, generateSrcSet, IMAGE_SIZES } from '../lib/supabase';

/**
 * Optimized image component with lazy loading, srcset, and placeholder
 */
const OptimizedImage = ({
  src,
  alt,
  className = '',
  width = IMAGE_SIZES.small,
  sizes = '100vw',
  srcSetSizes = ['thumbnail', 'small', 'medium'],
  loading = 'lazy',
  placeholder = true,
  onLoad,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const imgRef = useRef(null);

  useEffect(() => {
    if (loading === 'eager' || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [loading]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const optimizedSrc = proxyImageUrl(src, width);
  const srcSet = generateSrcSet(src, srcSetSizes);

  return (
    <div
      ref={imgRef}
      className={`optimized-image ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--surface-2)',
        ...props.style,
      }}
    >
      {placeholder && !isLoaded && (
        <div className="image-placeholder" style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="placeholder-spinner" style={{
            width: '24px',
            height: '24px',
            border: '2px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}

      {isInView && (
        <img
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={loading}
          onLoad={handleLoad}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          {...props}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OptimizedImage;
