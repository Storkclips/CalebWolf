import { useRef, useEffect, useState } from 'react';

/**
 * Renders an image on a <canvas> instead of an <img> element.
 *
 * Why: canvas elements do not expose "Save image as" in the browser context
 * menu. The image URL is fetched via JS and never placed in the DOM as an
 * <img src>, making casual right-click-save and drag-to-desktop ineffective.
 *
 * Note: screenshots and DevTools network inspection can always capture what
 * is displayed on screen — this protects against casual copying, not
 * determined extraction.
 *
 * Props mirror a subset of <img> for easy drop-in replacement:
 *  - src       : URL to load (should be a proxied/watermarked URL)
 *  - alt       : accessible label
 *  - fit       : 'cover' (default) | 'contain' — matches CSS object-fit
 *  - className / style : applied to the wrapping <div>
 *  - onClick   : forwarded to the wrapping <div>
 */
const ProtectedImage = ({
  src,
  alt = '',
  fit = 'cover',
  className,
  style,
  onClick,
  loading: _loading, // accepted but unused — canvas doesn't need it
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | loaded | error

  useEffect(() => {
    if (!src) return;

    let cancelled = false;
    setStatus('loading');

    const draw = (bitmap) => {
      if (cancelled) { bitmap.close?.(); return; }
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) { bitmap.close?.(); return; }

      const cw = container.clientWidth || bitmap.width;
      const ch = container.clientHeight || bitmap.height;
      canvas.width = cw;
      canvas.height = ch;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, cw, ch);

      if (fit === 'cover') {
        const scale = Math.max(cw / bitmap.width, ch / bitmap.height);
        const dw = bitmap.width * scale;
        const dh = bitmap.height * scale;
        ctx.drawImage(bitmap, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      } else {
        // contain
        const scale = Math.min(cw / bitmap.width, ch / bitmap.height);
        const dw = bitmap.width * scale;
        const dh = bitmap.height * scale;
        ctx.drawImage(bitmap, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      }

      bitmap.close?.();
      if (!cancelled) setStatus('loaded');
    };

    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => createImageBitmap(blob))
      .then(draw)
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => { cancelled = true; };
  }, [src, fit]);

  const block = (e) => e.preventDefault();

  return (
    <div
      ref={containerRef}
      className={`protected-canvas-wrap${className ? ` ${className}` : ''}`}
      style={style}
      onClick={onClick}
    >
      {status === 'loading' && (
        <div className="protected-canvas-shimmer" aria-hidden="true" />
      )}
      {status === 'error' && (
        <div className="protected-canvas-error" aria-label={alt}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      )}
      <canvas
        ref={canvasRef}
        onContextMenu={block}
        onDragStart={block}
        style={{ display: 'block', width: '100%', height: '100%' }}
        role="img"
        aria-label={alt}
      />
    </div>
  );
};

export default ProtectedImage;
