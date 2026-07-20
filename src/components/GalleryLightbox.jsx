import { useEffect, useRef, useState, useCallback } from 'react';
import { proxyImageUrl, displayImageUrl } from '../lib/supabase';
import ProtectedImage from './ProtectedImage';

const SharePanel = ({ imageId, title, onClose }) => {
  const [copied, setCopied] = useState(false);
  const panelRef = useRef(null);
  const shareUrl = `${window.location.origin}/image/${imageId}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const socials = [
    {
      label: 'X / Twitter',
      color: '#000',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
        </svg>
      ),
    },
    {
      label: 'Facebook',
      color: '#1877f2',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.884v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
      ),
    },
    {
      label: 'Pinterest',
      color: '#e60023',
      href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
        </svg>
      ),
    },
    {
      label: 'Instagram',
      color: '#e1306c',
      href: null, // Instagram doesn't support direct share URLs — show copy instead
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="ss-lb-share-panel" ref={panelRef}>
      <p className="ss-lb-share-heading">Share this image</p>
      <div className="ss-lb-share-socials">
        {socials.map((s) =>
          s.href ? (
            <a
              key={s.label}
              className="ss-lb-share-social"
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ '--social-color': s.color }}
              title={`Share on ${s.label}`}
            >
              {s.icon}
              <span>{s.label}</span>
            </a>
          ) : (
            <button
              key={s.label}
              type="button"
              className="ss-lb-share-social"
              style={{ '--social-color': s.color }}
              title={`Copy link to share on ${s.label}`}
              onClick={copyLink}
            >
              {s.icon}
              <span>{s.label}</span>
              <span className="ss-lb-share-social-note">Copy link</span>
            </button>
          )
        )}
      </div>
      <div className="ss-lb-share-link-row">
        <span className="ss-lb-share-link-text">{shareUrl}</span>
        <button type="button" className="ss-lb-share-copy-btn" onClick={copyLink}>
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy link
            </>
          )}
        </button>
      </div>
    </div>
  );
};

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
  const [shareOpen, setShareOpen] = useState(false);
  const imgRef = useRef(null);
  const mediaRef = useRef(null);
  const lastPinchDist = useRef(null);

  const imgUrl = image?.[imageUrlKey] ?? image?.src ?? image?.url ?? '';
  const webpUrl = image?.webp_url ?? null;
  const idx = imageList ? imageList.findIndex((i) => i.id === image.id) : -1;

  // Reset zoom and share panel when image changes
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setOrigin({ x: 50, y: 50 });
    setShareOpen(false);
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
          <ProtectedImage
            src={displayImageUrl(imgUrl, webpUrl, 1400)}
            alt={image.title}
            fit="contain"
            style={{
              width: '100%',
              height: '100%',
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

        {shareOpen && (
          <SharePanel
            imageId={image.id}
            title={image.title}
            onClose={() => setShareOpen(false)}
          />
        )}

        <div className="ss-lb-footer">
          <div className="ss-lb-info">
            <p className="ss-lb-title">{image.title}</p>
            {meta && <p className="ss-lb-meta">{meta}</p>}
          </div>
          <div className="ss-lb-actions">
            {footer}
            <button
              type="button"
              className={`ss-lb-share-btn${shareOpen ? ' active' : ''}`}
              onClick={() => setShareOpen((o) => !o)}
              aria-label="Share image"
              title="Share"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GalleryLightbox;
