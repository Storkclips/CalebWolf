import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageFlip } from 'page-flip';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function MagazineViewer({ manifest, pages, slug }) {
  const bookRef = useRef(null);
  const stageRef = useRef(null);
  const pageFlipRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [thumbsOpen, setThumbsOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const pageWidth = Number(manifest.pageWidth || manifest.width || 850);
  const pageHeight = Number(manifest.pageHeight || manifest.height || 1100);
  const ratio = pageWidth / pageHeight;
  const lastPage = Math.max(0, pages.length - 1);
  const storageKey = `magazine-reader:${slug}:page`;

  const spreadLabel = useMemo(() => {
    if (!pages.length) return '0 / 0';
    return `${currentPage + 1} / ${pages.length}`;
  }, [currentPage, pages.length]);

  const destroyBook = useCallback(() => {
    const instance = pageFlipRef.current;
    if (instance) {
      try {
        instance.destroy();
      } catch {
        // PageFlip can already be destroyed during React StrictMode cleanup.
      }
      pageFlipRef.current = null;
    }
    if (bookRef.current) bookRef.current.innerHTML = '';
    setReady(false);
  }, []);

  useEffect(() => {
    if (!bookRef.current || !pages.length) return undefined;

    destroyBook();

    const book = bookRef.current;
    const nodes = pages.map((page, index) => {
      const node = document.createElement('div');
      node.className = 'magazine-reader__page';
      node.dataset.pageIndex = String(index);

      if (index === 0 || index === pages.length - 1) {
        node.dataset.density = 'hard';
        node.classList.add('magazine-reader__page--cover');
      }

      const img = document.createElement('img');
      img.src = page.src;
      img.alt = page.alt || `${manifest.title || slug} page ${index + 1}`;
      img.draggable = false;
      img.decoding = 'async';
      node.appendChild(img);

      return node;
    });

    nodes.forEach((node) => book.appendChild(node));

    const savedPage = clamp(Number(localStorage.getItem(storageKey) || 0), 0, lastPage);

    const pageFlip = new PageFlip(book, {
      width: pageWidth,
      height: pageHeight,
      size: 'stretch',
      minWidth: 280,
      maxWidth: 1500,
      minHeight: Math.round(280 / ratio),
      maxHeight: Math.round(1500 / ratio),
      maxShadowOpacity: 0.34,
      showCover: manifest.showCover !== false,
      usePortrait: true,
      mobileScrollSupport: false,
      swipeDistance: 25,
      flippingTime: Number(manifest.flippingTime || 850),
      autoSize: true,
      drawShadow: true,
      clickEventForward: true,
      startPage: savedPage,
      showPageCorners: true,
      disableFlipByClick: false,
    });

    pageFlip.loadFromHTML(nodes);
    pageFlipRef.current = pageFlip;

    const updatePage = (event) => {
      const index = typeof event?.data === 'number'
        ? event.data
        : pageFlip.getCurrentPageIndex();
      setCurrentPage(index);
      localStorage.setItem(storageKey, String(index));
    };

    pageFlip.on('init', updatePage);
    pageFlip.on('flip', updatePage);
    pageFlip.on('update', updatePage);
    pageFlip.on('changeState', (event) => {
      stageRef.current?.classList.toggle('is-turning', event?.data === 'flipping');
    });

    setCurrentPage(savedPage);
    setReady(true);

    return destroyBook;
  }, [destroyBook, lastPage, manifest, pageHeight, pageWidth, pages, ratio, slug, storageKey]);

  const goPrev = useCallback(() => pageFlipRef.current?.flipPrev('bottom'), []);
  const goNext = useCallback(() => pageFlipRef.current?.flipNext('bottom'), []);
  const goTo = useCallback((index) => {
    pageFlipRef.current?.flip(clamp(index, 0, lastPage), 'bottom');
  }, [lastPage]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'Home') goTo(0);
      if (event.key === 'End') goTo(lastPage);
      if (event.key.toLowerCase() === 'f') stageRef.current?.requestFullscreen?.();
      if (event.key === 'Escape') setThumbsOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, goTo, lastPage]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await stageRef.current?.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  return (
    <section className="magazine-reader" ref={stageRef}>
      <header className="magazine-reader__toolbar">
        <div className="magazine-reader__toolbar-left">
          <button type="button" className="magazine-reader__icon-btn" onClick={goPrev} disabled={!ready || currentPage <= 0} aria-label="Previous page">‹</button>
          <button type="button" className="magazine-reader__icon-btn" onClick={goNext} disabled={!ready || currentPage >= lastPage} aria-label="Next page">›</button>
          <span className="magazine-reader__counter">{spreadLabel}</span>
        </div>

        <div className="magazine-reader__toolbar-right">
          <button type="button" onClick={() => setThumbsOpen((value) => !value)}>Pages</button>
          <button type="button" onClick={() => setZoom((value) => clamp(value - 0.1, 0.65, 1.5))}>−</button>
          <span className="magazine-reader__zoom">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => clamp(value + 0.1, 0.65, 1.5))}>+</button>
          <button type="button" onClick={toggleFullscreen}>Fullscreen</button>
        </div>
      </header>

      <div className="magazine-reader__viewport">
        <div className="magazine-reader__ambient-shadow" aria-hidden="true" />
        <div className="magazine-reader__stack magazine-reader__stack--left" aria-hidden="true" />
        <div className="magazine-reader__stack magazine-reader__stack--right" aria-hidden="true" />

        <div
          className="magazine-reader__book-scale"
          style={{ transform: `scale(${zoom})` }}
        >
          <div ref={bookRef} className="magazine-reader__book" />
        </div>
      </div>

      {thumbsOpen ? (
        <aside className="magazine-reader__thumb-drawer" aria-label="Magazine pages">
          <div className="magazine-reader__thumb-head">
            <strong>Pages</strong>
            <button type="button" onClick={() => setThumbsOpen(false)}>×</button>
          </div>
          <div className="magazine-reader__thumb-grid">
            {pages.map((page, index) => (
              <button
                type="button"
                key={`${page.src}-${index}`}
                className={index === currentPage ? 'is-current' : ''}
                onClick={() => {
                  goTo(index);
                  setThumbsOpen(false);
                }}
              >
                <img src={page.src} alt={`Page ${index + 1}`} loading="lazy" />
                <span>{index + 1}</span>
              </button>
            ))}
          </div>
        </aside>
      ) : null}
    </section>
  );
}
