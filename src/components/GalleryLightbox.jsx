import { useEffect, useRef, useState, useCallback } from 'react';
import { proxyImageUrl } from '../lib/supabase';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const SCROLL_FACTOR = 0.0012;

const GalleryLightbox = ({
  image,           // { id, src|url, title, price? }
  imageList,       // full array for prev/next navigation
  onClose,
  onNavigate,      // (dir: -1|1) => void
  footer,          // JSX rendered in the footer actions area
  meta,            // string shown as subtitle
  imageUrlKey = 'src', // which key holds the URL ('src' or 'url')
}) => {
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 }); // transform-origin %
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const mediaRef = useRef(null);
  const lastPinchDist = useRef(null);

  const imgUrl = image?.[imageUrlKey] ?? image?.src ?? image?.url ?? '';
  const idx = imageList ? imageList.findIndex((i) => i.id === image.id) : -1;

  // Reset zoom when image changes
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setOrigin({ x: 50, y: 50 });
  }, [image?.id]);

  // Close on Escape, navigate on arrow keys
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNavigate) onNavigate(1);
      if (e.key === 'ArrowLeft' && onNavigate) onNavigate(-1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onNavigate]);

  const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const applyZoom = useCallback((newScale, pivotX, pivotY) => {
    const clamped = clampScale(newScale);
    setOrigin({ x: pivotX, y: pivotY });
    setScale(clamped);
    if (clamped === MIN_SCALE) setTranslate({ x: 0, y: 0 });
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = mediaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pivotX = ((e.clientX - rect.left) / rect.width) * 100;
    const pivotY = ((e.clientY - rect.top) / rect.height) * 100;
    const delta = -e.deltaY * SCROLL_FACTOR;
    applyZoom(scale * (1 + delta), pivotX, pivotY);
  }, [scale, applyZoom]);

  // Attach wheel as non-passive so we can preventDefault
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Double-click to reset zoom
  const handleDoubleClick = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setOrigin({ x: 50, y: 50 });
  };

  // Drag to pan when zoomed
  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !dragStart) return;
    setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Touch pinch zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length !== 2 || lastPinchDist.current === null) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    const ratio = dist / lastPinchDist.current;
    lastPinchDist.current = dist;
    const midX = ((e.touches[0].clientX + e.touches[1].clientX) / 2);
    const midY = ((e.touches[0].clientY + e.touches[1].clientY) / 2);
    const rect = mediaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pivotX = ((midX - rect.left) / rect.width) * 100;
    const pivotY = ((midY - rect.top) / rect.height) * 100;
    applyZoom(scale * ratio, pivotX, pivotY);
  };

  const handleTouchEnd = () => { lastPinchDist.current = null; };

  const isZoomed = scale > 1;

  return (
    <div
      className="ss-lightbox"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ss-lightbox-panel">
        <button className="ss-lb-close" type="button" onClick={onClose}>✕</button>

        {onNavigate && imageList && (
          <>
            <button
              className="ss-lb-nav ss-lb-prev"
              type="button"
              onClick={() => onNavigate(-1)}
              disabled={idx === 0}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              className="ss-lb-nav ss-lb-next"
              type="button"
              onClick={() => onNavigate(1)}
              disabled={idx === imageList.length - 1}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Image area */}
        <div
          ref={mediaRef}
          className="ss-lb-media protected-img"
          onContextMenu={(e) => e.preventDefault()}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
        >
          <img
            ref={imgRef}
            src={proxyImageUrl(imgUrl, 1400)}
            alt={image.title}
            draggable={false}
            style={{
              transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
              transformOrigin: `${origin.x}% ${origin.y}%`,
              transition: isDragging ? 'none' : 'transform 80ms ease-out',
            }}
          />
          {scale > 1 && (
            <div className="ss-lb-zoom-hint">Double-click to reset</div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="ss-lb-zoom-bar">
          <button
            className="ss-lb-zoom-btn"
            type="button"
            onClick={() => applyZoom(scale / 1.4, 50, 50)}
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <span className="ss-lb-zoom-level">{Math.round(scale * 100)}%</span>
          <button
            className="ss-lb-zoom-btn"
            type="button"
            onClick={() => applyZoom(scale * 1.4, 50, 50)}
            disabled={scale >= MAX_SCALE}
            aria-label="Zoom in"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
        </div>

        <div className="ss-lb-footer">
          <div className="ss-lb-info">
            <p className="ss-lb-title">{image.title}</p>
            {meta && <p className="ss-lb-meta">{meta}</p>}
          </div>
          <div className="ss-lb-actions">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GalleryLightbox;
