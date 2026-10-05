import { useCallback, useEffect, useRef, useState } from 'react';
import { PageFlip } from 'page-flip';
import { proxyImageUrl } from '../../lib/supabase';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const HI_RES_WIDTH = 1600;

/**
 * Render a saved Fabric.js page JSON to a high-resolution JPEG data URL.
 * Falls back to empty string so the caller can keep the low-res thumb.
 */
async function renderCanvasJsonHighRes(json) {
  if (!json) return '';
  const mod = await import('fabric');
  const fabric = mod.default ?? mod;
  if (!fabric?.StaticCanvas) return '';

  const baseW = Number(json.width) || 850;
  const baseH = Number(json.height) || 1100;
  const multiplier = clamp(HI_RES_WIDTH / baseW, 1, 2.5);

  const el = document.createElement('canvas');
  el.width = baseW;
  el.height = baseH;
  const canvas = new fabric.StaticCanvas(el, {
    width: baseW,
    height: baseH,
    backgroundColor: json.background || '#ffffff',
  });

  try {
    await new Promise((resolve, reject) => {
      canvas.loadFromJSON(json, () => resolve(), (obj) => obj);
      // loadFromJSON does not reject; guard with a timeout in case images hang.
      setTimeout(resolve, 8000);
    });
    canvas.renderAll();
    return canvas.toDataURL({ format: 'jpeg', quality: 0.88, multiplier });
  } catch {
    return '';
  } finally {
    canvas.dispose();
  }
}

function setElementStyles(div, element) {
  div.className = 'magazine-flip__element';
  div.style.left = `${element.x || 0}%`;
  div.style.top = `${element.y || 0}%`;
  div.style.width = `${element.w || 100}%`;
  div.style.height = `${element.h || 100}%`;
  div.style.zIndex = element.zIndex || 1;
  if (element.color) div.style.color = element.color;
  if (element.type === 'shape') {
    div.style.background = element.fill || 'transparent';
    if (element.radius) div.style.borderRadius = `${element.radius / 10}cqw`;
  }
  if (element.type === 'text') {
    if (element.fontFamily) div.style.fontFamily = element.fontFamily;
    if (element.fontSize) div.style.fontSize = `${element.fontSize / 10}cqw`;
    if (element.weight) div.style.fontWeight = element.weight;
    if (element.align) div.style.textAlign = element.align;
  }
}

function buildPageNode(page, index, totalCount) {
  const node = document.createElement('div');
  node.className = 'magazine-flip__page';
  if (index === 0 || index === totalCount - 1) {
    node.classList.add('magazine-flip__page--cover');
  }
  node.style.background = page.background_color || '#ffffff';

  const elements = page.elements || [];
  const canvasEl = elements.find((e) => e.type === 'canvas');

  if (canvasEl) {
    const img = document.createElement('img');
    img.src = canvasEl.src || '';
    img.dataset.pageIndex = String(index);
    img.draggable = false;
    img.decoding = 'async';
    img.alt = '';
    node.appendChild(img);
  }

  elements
    .filter((e) => e.type !== 'canvas')
    .forEach((element) => {
      const div = document.createElement('div');
      setElementStyles(div, element);
      if (element.type === 'image' && element.src) {
        const img = document.createElement('img');
        img.src = proxyImageUrl(element.src, 1400);
        img.alt = element.alt || '';
        img.style.objectFit = element.fit || 'cover';
        img.draggable = false;
        div.appendChild(img);
      } else if (element.type === 'text') {
        if (element.html) div.innerHTML = element.html;
        else div.textContent = element.text || '';
      }
      node.appendChild(div);
    });

  return node;
}

export default function MagazineFlipbook({ pages = [], title = 'Magazine' }) {
  const bookRef = useRef(null);
  const stageRef = useRef(null);
  const flipRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [thumbsOpen, setThumbsOpen] = useState(false);
  const [hiRes, setHiRes] = useState({});

  const lastPage = Math.max(0, pages.length - 1);

  // Render high-resolution page images one by one, replacing the thumbs.
  useEffect(() => {
    let cancelled = false;
    setHiRes({});
    (async () => {
      for (let i = 0; i < pages.length; i += 1) {
        if (cancelled) return;
        const canvasEl = pages[i]?.elements?.find((e) => e.type === 'canvas');
        if (!canvasEl?.json) continue;
        const url = await renderCanvasJsonHighRes(canvasEl.json);
        if (cancelled) return;
        if (url) setHiRes((prev) => ({ ...prev, [i]: url }));
      }
    })();
    return () => { cancelled = true; };
  }, [pages]);

  // Swap loaded page images in-place (the flipbook itself stays mounted).
  useEffect(() => {
    const imgs = bookRef.current?.querySelectorAll('img[data-page-index]');
    imgs?.forEach((img) => {
      const url = hiRes[Number(img.dataset.pageIndex)];
      if (url) img.src = url;
    });
  }, [hiRes, ready]);

  const destroyBook = useCallback(() => {
    const flip = flipRef.current;
    if (flip) {
      try { flip.destroy(); } catch { /* already destroyed */ }
      flipRef.current = null;
    }
    if (bookRef.current) bookRef.current.innerHTML = '';
    setReady(false);
  }, []);

  useEffect(() => {
    if (!bookRef.current || !pages.length) return undefined;
    destroyBook();

    const book = bookRef.current;
    const nodes = pages.map((page, index) => buildPageNode(page, index, pages.length));
    nodes.forEach((node) => book.appendChild(node));

    const flip = new PageFlip(book, {
      width: 850,
      height: 1100,
      size: 'stretch',
      minWidth: 280,
      maxWidth: 1500,
      showCover: true,
      usePortrait: true,
      mobileScrollSupport: false,
      swipeDistance: 25,
      flippingTime: 800,
      drawShadow: true,
      clickEventForward: false,
      showPageCorners: true,
    });

    flip.loadFromHTML(nodes);
    flipRef.current = flip;

    const onFlip = (event) => {
      const index = typeof event?.data === 'number'
        ? event.data
        : flip.getCurrentPageIndex();
      setCurrent(index);
    };
    flip.on('init', onFlip);
    flip.on('flip', onFlip);

    setCurrent(flip.getCurrentPageIndex());
    setReady(true);

    return destroyBook;
  }, [destroyBook, pages]);

  const goPrev = useCallback(() => flipRef.current?.flipPrev('bottom'), []);
  const goNext = useCallback(() => flipRef.current?.flipNext('bottom'), []);
  const goTo = useCallback((index) => {
    flipRef.current?.flip(clamp(index, 0, lastPage), 'bottom');
  }, [lastPage]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await stageRef.current?.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch { /* fullscreen not available */ }
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'Home') goTo(0);
      if (event.key === 'End') goTo(lastPage);
      if (event.key.toLowerCase() === 'f') toggleFullscreen();
      if (event.key === 'Escape') setThumbsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, goTo, lastPage, toggleFullscreen]);

  const label = pages.length === 0
    ? '0 / 0'
    : current === 0
      ? `Cover · ${pages.length} pages`
      : `${current + 1} / ${pages.length}`;

  return (
    <section className="magazine-flip" ref={stageRef}>
      <header className="magazine-flip__toolbar">
        <div className="magazine-flip__toolbar-left">
          <button type="button" className="magazine-flip__icon-btn" onClick={goPrev} disabled={!ready || current <= 0} aria-label="Previous page">‹</button>
          <button type="button" className="magazine-flip__icon-btn" onClick={goNext} disabled={!ready || current >= lastPage} aria-label="Next page">›</button>
          <span className="magazine-flip__counter">{label}</span>
        </div>
        <div className="magazine-flip__toolbar-right">
          <button type="button" onClick={() => setThumbsOpen((v) => !v)}>Pages</button>
          <button type="button" onClick={() => setZoom((v) => clamp(v - 0.1, 0.65, 1.6))} aria-label="Zoom out">−</button>
          <span className="magazine-flip__zoom">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((v) => clamp(v + 0.1, 0.65, 1.6))} aria-label="Zoom in">+</button>
          <button type="button" onClick={toggleFullscreen}>Fullscreen</button>
        </div>
      </header>

      <div className="magazine-flip__viewport">
        <div className="magazine-flip__ambient" aria-hidden="true" />
        <div
          className="magazine-flip__scale"
          style={{ transform: `scale(${zoom})` }}
        >
          <div ref={bookRef} className="magazine-flip__book" title={title} />
        </div>
      </div>

      {thumbsOpen ? (
        <aside className="magazine-flip__thumbs" aria-label="Magazine pages">
          <div className="magazine-flip__thumbs-head">
            <strong>Pages</strong>
            <button type="button" onClick={() => setThumbsOpen(false)} aria-label="Close page list">×</button>
          </div>
          <div className="magazine-flip__thumbs-grid">
            {pages.map((page, index) => {
              const src = hiRes[index]
                || page.elements?.find((e) => e.type === 'canvas')?.src
                || '';
              return (
                <button
                  type="button"
                  key={index}
                  className={index === current ? 'is-current' : ''}
                  onClick={() => {
                    goTo(index);
                    setThumbsOpen(false);
                  }}
                >
                  {src
                    ? <img src={src} alt={`Page ${index + 1}`} loading="lazy" />
                    : <span className="magazine-flip__thumbs-blank" style={{ background: page.background_color || '#fff' }} />}
                  <span>{index + 1}</span>
                </button>
              );
            })}
          </div>
        </aside>
      ) : null}
    </section>
  );
}
