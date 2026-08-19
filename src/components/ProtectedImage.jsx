import { useRef, useEffect, useState } from 'react';

/**
 * Renders an image on a <canvas> for display while also emitting a
 * visually-hidden <img> element for SEO indexing by Google Images.
 *
 * The canvas prevents casual right-click-save. The hidden <img> uses the
 * original (non-proxied) URL so crawlers can fetch and index the photo with
 * its alt text, enabling discovery via "Caleb Wolf Photography" searches.
 */
const ProtectedImage = ({
  src,
  alt = '',
  fit = 'cover',
  className,
  style,
  onClick,
  loading: _loading,
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('idle');

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

  // Derive an indexable URL: strip the /functions/v1/image-proxy/ prefix
  // so the hidden <img> loads the original storage URL that Google can crawl.
  const seoSrc = src
    ? src.replace(/^.*\/functions\/v1\/image-proxy\//, 'https://')
    : src;

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
      {seoSrc && (
        <img
          src={seoSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap',
            border: 0,
            opacity: 0.01,
            pointerEvents: 'none',
          }}
          aria-hidden="false"
        />
      )}
    </div>
  );
};

export default ProtectedImage;
