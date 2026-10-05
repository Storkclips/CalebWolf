import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageFlip } from 'page-flip';
import { proxyImageUrl } from '../../lib/supabase';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const PX_PER_IN = 96;
const PORTRAIT_BREAKPOINT = 820;

const DEFAULT_SETTINGS = {
  trimW: 8.5,
  trimH: 11,
  bleed: 0.12,
  spine: 0.25,
};

/**
 * Turn the stored print files (which include bleed margins, and whose cover
 * files are back-cover + spine + front-cover spreads) into the individual
 * reader pages a visitor flips through, matching the studio's own digital
 * export order: front cover, inside front cover, inner pages, inside back
 * cover, back cover.
 */
function buildReaderPages(pages, settings) {
  const trimW = Number(settings.trimW) || 8.5;
  const trimH = Number(settings.trimH) || 11;
  const bleed = Number(settings.bleed) || 0;
  const spine = Number(settings.spine) || 0;

  const bleedPx = bleed * PX_PER_IN;
  const pagePx = trimW * PX_PER_IN;
  const trimHpx = trimH * PX_PER_IN;
  const spinePx = spine * PX_PER_IN;

  const fronts = [];
  const inners = [];
  const backs = [];

  pages.forEach((row, rowIndex) => {
    const canvasEl = row.elements?.find((e) => e.type === 'canvas');
    if (!canvasEl) {
      // Legacy admin page: overlay elements on a plain trim-frame page.
      inners.push({
        key: `row-${rowIndex}`,
        label: `Page ${row.page_number ?? rowIndex + 1}`,
        row,
        canvasEl: null,
        fileW: pagePx + bleedPx * 2,
        fileH: trimHpx + bleedPx * 2,
        cropX: bleedPx,
        cropY: bleedPx,
        cropW: pagePx,
        cropH: trimHpx,
      });
      return;
    }

    const jsonW = Number(canvasEl.json?.width) || 0;
    const kind = row.page_kind;
    const isSpread =
      (kind === 'cover' || kind === 'inside-cover') &&
      (jsonW === 0 || jsonW > (pagePx + bleedPx * 2) * 1.4);

    if (!isSpread) {
      inners.push({
        key: `row-${rowIndex}`,
        label: `Page ${row.page_number ?? rowIndex + 1}`,
        row,
        canvasEl,
        fileW: pagePx + bleedPx * 2,
        fileH: trimHpx + bleedPx * 2,
        cropX: bleedPx,
        cropY: bleedPx,
        cropW: pagePx,
        cropH: trimHpx,
      });
      return;
    }

    const fileW = pagePx * 2 + spinePx + bleedPx * 2;
    const fileH = trimHpx + bleedPx * 2;
    const panel = (label, panelCropX, slot) => ({
      key: `row-${rowIndex}:${label}`,
      label,
      row,
      canvasEl,
      fileW,
      fileH,
      cropX: panelCropX,
      cropY: bleedPx,
      cropW: pagePx,
      cropH: trimHpx,
      slot,
    });

    if (kind === 'cover') {
      fronts.push(panel('Front Cover', bleedPx + pagePx + spinePx, 0));
      backs.push(panel('Back Cover', bleedPx, 1));
    } else {
      fronts.push(panel('Inside Front Cover', bleedPx, 1));
      backs.push(panel('Inside Back Cover', bleedPx + pagePx + spinePx, 0));
    }
  });

  const bySlot = (a, b) => a.slot - b.slot;
  return [...fronts.sort(bySlot), ...inners, ...backs.sort(bySlot)];
}

/**
 * Render the saved Fabric.js page at high resolution and crop it to the
 * requested trim-frame region (in file pixels), returning a JPEG data URL
 * of exactly that region.
 */
async function renderCanvasJsonHighRes(json, fileW, fileH, cropX, cropY, cropW, cropH) {
  if (!json) return '';
  const mod = await import('fabric');
  const fabric = mod.default ?? mod;
  if (!fabric?.StaticCanvas) return '';

  const el = document.createElement('canvas');
  el.width = Math.round(fileW);
  el.height = Math.round(fileH);
  const canvas = new fabric.StaticCanvas(el, {
    width: Math.round(fileW),
    height: Math.round(fileH),
    backgroundColor: json.background || '#ffffff',
  });

  try {
    await new Promise((resolve) => {
      try {
        canvas.loadFromJSON(json, () => resolve(), (obj) => obj);
      } catch {
        resolve();
      }
      setTimeout(resolve, 8000);
    });
    canvas.renderAll();
    const multiplier = clamp(1700 / cropW, 1, 2.5);
    return fabric.util.toDataURL(el, {
      format: 'jpeg',
      quality: 0.9,
      multiplier,
      left: Math.round(cropX),
      top: Math.round(cropY),
      width: Math.round(cropW),
      height: Math.round(cropH),
    });
  } catch {
    return '';
  } finally {
    canvas.dispose();
  }
}

function applyElementStyles(div, element) {
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

function buildPageNode(readerPage, index, totalCount) {
  const { row, canvasEl, fileW, fileH, cropX, cropY, cropW, cropH } = readerPage;

  const node = document.createElement('div');
  node.className = 'magazine-flip__page';
  if (index === 0 || index === totalCount - 1) {
    node.classList.add('magazine-flip__page--cover');
  }
  node.style.background = row.background_color || '#ffffff';

  if (canvasEl) {
    const img = document.createElement('img');
    // Scale the full print file (bleed included) so only its trim-frame
    // region fills the page box: covers crop their panel out of the spread.
    img.style.position = 'absolute';
    img.style.width = `${(fileW / cropW) * 100}%`;
    img.style.height = `${(fileH / cropH) * 100}%`;
    img.style.left = `${-(cropX / cropW) * 100}%`;
    img.style.top = `${-(cropY / cropH) * 100}%`;
    img.src = canvasEl.src || '';
    img.dataset.pageIndex = String(index);
    img.dataset.elementId = canvasEl.id || `page-${index}`;
    img.draggable = false;
    img.decoding = 'async';
    img.alt = '';
    node.appendChild(img);
  }

  (row.elements || [])
    .filter((e) => e.type !== 'canvas')
    .forEach((element) => {
      const div = document.createElement('div');
      div.className = 'magazine-flip__element';
      applyElementStyles(div, element);
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

export default function MagazineFlipbook({ pages = [], title = 'Magazine', settings = DEFAULT_SETTINGS }) {
  const bookRef = useRef(null);
  const stageRef = useRef(null);
  const flipRef = useRef(null);
  const pageIndexRef = useRef(0);
  const hiResCacheRef = useRef(new Map());

  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [thumbsOpen, setThumbsOpen] = useState(false);
  const [hiRes, setHiRes] = useState({});
  const [portrait, setPortrait] = useState(
    () => window.innerWidth < PORTRAIT_BREAKPOINT,
  );

  const mergedSettings = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
  }), [settings]);

  const readerPages = useMemo(
    () => buildReaderPages(pages, mergedSettings),
    [pages, mergedSettings],
  );

  const lastPage = Math.max(0, readerPages.length - 1);

  useEffect(() => {
    const onResize = () => setPortrait(window.innerWidth < PORTRAIT_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Upgrade pages from the saved thumbnails to high-resolution renders,
  // one at a time, reusing any already-rendered page in this session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let i = 0; i < readerPages.length; i += 1) {
        if (cancelled) return;
        const rp = readerPages[i];
        if (!rp.canvasEl?.json) continue;
        const key = `${rp.canvasEl.id || `row-${i}`}:${rp.label}`;
        let url = hiResCacheRef.current.get(key);
        if (!url) {
          url = await renderCanvasJsonHighRes(rp.canvasEl.json, rp.fileW, rp.fileH, rp.cropX, rp.cropY, rp.cropW, rp.cropH);
          if (cancelled) return;
          if (!url) continue;
          hiResCacheRef.current.set(key, url);
        }
        setHiRes((prev) => ({ ...prev, [i]: url }));
      }
    })();
    return () => { cancelled = true; };
  }, [readerPages]);

  // Swap finished renders into the mounted book without rebuilding it.
  useEffect(() => {
    const imgs = bookRef.current?.querySelectorAll('img[data-page-index]');
    imgs?.forEach((img) => {
      const url = hiRes[Number(img.dataset.pageIndex)];
      if (url && img.src !== url) {
        img.classList.add('hires-loading');
        img.onload = () => {
          img.classList.remove('hires-loading');
          img.classList.add('hires-loaded');
          img.onload = null;
        };
        img.src = url;
      }
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

  const trimW = Number(mergedSettings.trimW) || 8.5;
  const trimH = Number(mergedSettings.trimH) || 11;

  useEffect(() => {
    if (!bookRef.current || !readerPages.length) return undefined;
    destroyBook();

    const book = bookRef.current;
    const nodes = readerPages.map((rp, index) => buildPageNode(rp, index, readerPages.length));
    nodes.forEach((node) => book.appendChild(node));

    const startPage = clamp(pageIndexRef.current, 0, lastPage);

    const flip = new PageFlip(book, {
      width: Math.round(trimW * 100),
      height: Math.round(trimH * 100),
      size: 'stretch',
      minWidth: 280,
      maxWidth: 1500,
      showCover: true,
      usePortrait: portrait,
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
      pageIndexRef.current = index;
      setCurrent(index);
    };
    flip.on('init', onFlip);
    flip.on('flip', onFlip);

    if (startPage > 0) flip.turnToPage(startPage);
    setCurrent(flip.getCurrentPageIndex());
    setReady(true);

    return destroyBook;
  }, [destroyBook, lastPage, readerPages, portrait, trimW, trimH]);

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
    } catch { /* fullscreen unavailable */ }
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement
        || event.target instanceof HTMLTextAreaElement
        || event.target?.isContentEditable) return;
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

  const progress = readerPages.length
    ? Math.round(((current + 1) / readerPages.length) * 100)
    : 0;
  const label = readerPages.length === 0
    ? '0 / 0'
    : current === 0
      ? `${readerPages[0].label} · ${readerPages.length} pages`
      : `${current + 1} / ${readerPages.length} · ${readerPages[current]?.label || ''}`;

  if (!readerPages.length) return null;

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

        {!ready && <div className="magazine-flip__skeleton" aria-hidden="true" />}

        <div
          className="magazine-flip__scale"
          style={{ transform: `scale(${zoom})` }}
        >
          <div ref={bookRef} className="magazine-flip__book" title={title} />
        </div>

        <button
          type="button"
          className="magazine-flip__arrow magazine-flip__arrow--left"
          onClick={goPrev}
          disabled={!ready || current <= 0}
          aria-label="Previous page"
        >
          ‹
        </button>
        <button
          type="button"
          className="magazine-flip__arrow magazine-flip__arrow--right"
          onClick={goNext}
          disabled={!ready || current >= lastPage}
          aria-label="Next page"
        >
          ›
        </button>

        <div
          className="magazine-flip__progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="magazine-flip__progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {thumbsOpen ? (
        <aside className="magazine-flip__thumbs" aria-label="Magazine pages">
          <div className="magazine-flip__thumbs-head">
            <strong>Pages</strong>
            <button type="button" onClick={() => setThumbsOpen(false)} aria-label="Close page list">×</button>
          </div>
          <div className="magazine-flip__thumbs-grid">
            {readerPages.map((rp, index) => {
              const src = hiRes[index] || rp.canvasEl?.src || '';
              return (
                <button
                  type="button"
                  key={rp.key}
                  className={index === current ? 'is-current' : ''}
                  onClick={() => {
                    goTo(index);
                    setThumbsOpen(false);
                  }}
                >
                  {src
                    ? <img src={src} alt={rp.label} loading="lazy" />
                    : <span className="magazine-flip__thumbs-blank" style={{ background: rp.row.background_color || '#fff' }} />}
                  <span>{index + 1} · {rp.label}</span>
                </button>
              );
            })}
          </div>
        </aside>
      ) : null}
    </section>
  );
}
