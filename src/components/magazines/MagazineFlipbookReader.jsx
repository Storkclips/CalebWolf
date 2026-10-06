import { useEffect, useState } from 'react';

const FLIP_MS = 650;
const DEFAULT_PAGE_ASPECT = 8.5 / 11;

function useIsNarrow() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

/**
 * Full-screen reader: closed cover, then side-by-side spreads, closing on
 * the back cover at the end. Turning a page animates a single sheet
 * pivoting on the spine; the destination pages are pre-set underneath so
 * the swap when the sheet lands is seamless. Opening from either closed
 * cover is instant; closing onto either cover animates the book narrowing
 * in sync with the sheet. On narrow screens the reader shows one page at
 * a time and turns the full sheet from the left edge.
 */
export default function MagazineFlipbookReader({ pages, title, onClose }) {
  const [spread, setSpread] = useState(0); // 0 = cover
  const [aspect, setAspect] = useState(DEFAULT_PAGE_ASPECT);
  const [turning, setTurning] = useState(null); // 'next' | 'prev' | 'closing'
  const [closedBack, setClosedBack] = useState(false); // resting on the closed back cover
  const isMobile = useIsNarrow();

  const total = pages.length;

  const atRest = turning === null;
  const destSpread = turning === 'next' ? spread + 1 : turning === 'prev' ? spread - 1 : spread;

  const idx = isMobile ? spread : spread * 2;
  const destIdx = isMobile ? destSpread : destSpread * 2;

  // The final readable spread pairs the last inner page with the outside
  // back cover; from there the next turn closes the book.
  const coverClosed = spread === 0;
  const onFinalSpread = !isMobile && spread > 0 && spread * 2 + 1 >= total;
  const closing = turning === 'closing';
  const closedEnd = closedBack || closing;

  const canNext = isMobile ? spread + 1 < total : !closedBack;
  const canPrev = spread > 0;

  const currentRight = pages[idx] || '';
  const currentLeft = pages[spread * 2 - 1] || '';
  const targetRight = pages[destIdx] || '';
  const targetLeft = pages[destIdx - 1] || '';

  // Closed back cover: the final turn folds the last page over — its
  // reverse face is the outside back cover — and the book narrows to a
  // single centered page, mirroring the front cover's closed state.
  const endCover = pages[total - 1] || '';

  // Once closed on the back cover, the cover rests on the LEFT half —
  // exactly where the flipping sheet landed — and the right half
  // collapses, so there's no swap when the sheet settles.
  const shownLeft = closedBack
    ? endCover
    : closing ? currentLeft : turning === 'prev' ? targetLeft : currentLeft;
  const effectiveRightIdx = turning === 'next' ? destIdx : idx;
  const rightIsBackCover = !isMobile && effectiveRightIdx === total - 1;
  const shownRight = closedBack
    ? ''
    : rightIsBackCover ? '' : turning === 'next' ? targetRight : currentRight;

  // The closing sheet is the blank page with the back cover on its outer
  // (under) face — as it folds shut the cover arrives with it, then rests
  // on the closed book once it lands.
  const sheetFront = turning === 'closing'
    ? ''
    : turning === 'next'
      ? currentRight
      : isMobile ? targetRight : currentLeft;
  const sheetBack = turning === 'closing'
    ? endCover
    : turning === 'next'
      ? (isMobile ? targetRight : targetLeft)
      : (isMobile ? currentRight : targetRight);

  function turnNext() {
    if (turning || !canNext) return;
    // Opening the cover has no sheet animation — the book just opens to
    // pages 1–2. The closing flip back to the cover stays animated.
    if (spread === 0) {
      setSpread(1);
      return;
    }
    // The final turn closes the book: the last page folds over, its
    // reverse face — the outside back cover — lands as the cover, and the
    // book narrows to a single centered page.
    if (onFinalSpread) {
      setTurning('closing');
      window.setTimeout(() => {
        setClosedBack(true);
        setTurning(null);
      }, FLIP_MS);
      return;
    }
    setTurning('next');
    window.setTimeout(() => {
      setSpread((s) => s + 1);
      setTurning(null);
    }, FLIP_MS);
  }

  function turnPrev() {
    if (turning || !canPrev) return;
    // Opening from either closed cover is instant — the back cover mirrors
    // the front cover's instant open.
    if (closedBack) {
      setClosedBack(false);
      return;
    }
    setTurning('prev');
    window.setTimeout(() => {
      setSpread((s) => s - 1);
      setTurning(null);
    }, FLIP_MS);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') turnNext();
      if (e.key === 'ArrowLeft') turnPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function handleImgLoad(e) {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) {
      setAspect(naturalWidth / naturalHeight);
    }
  }

  const bookStyle = { '--page-aspect': aspect };
  const shown = turning === 'closing' || closedBack ? spread : atRest ? spread : destSpread;

  return (
    <div className="magbook">
      <header className="magbook__bar">
        <span className="magbook__title">{title}</span>
        <button className="magbook__close" type="button" onClick={onClose} aria-label="Close reader">
          ×
        </button>
      </header>

      <div
        className={`magbook__book${coverClosed || closedBack ? ' magbook__book--closed' : ''}${closedBack ? ' magbook__book--end-closed' : ''}`}
        style={bookStyle}
      >
        <div className="magbook__half magbook__half--left">
          {!coverClosed && (
            <div className="magbook__face magbook__face--verso" onClick={turnPrev}>
              <div className="magbook__page">
                {shownLeft ? <img src={shownLeft} alt="" draggable={false} onLoad={handleImgLoad} /> : null}
              </div>
            </div>
          )}
        </div>

        <div className="magbook__half magbook__half--right">
          <div className="magbook__face magbook__face--recto" onClick={turnNext}>
            <div className="magbook__page" style={rightIsBackCover ? { background: '#f7f4ee' } : undefined}>
              {shownRight ? <img src={shownRight} alt="" draggable={false} onLoad={handleImgLoad} /> : null}
            </div>
          </div>
        </div>

        {turning && (
          <div
            className={`magbook__sheet magbook__sheet--${closing ? 'next' : turning}`}
            style={{ animationDuration: `${FLIP_MS}ms` }}
          >
            <div className={`magbook__sheet-face${closing ? ' magbook__sheet-face--paper' : ''}`}>
              {sheetFront ? <img src={sheetFront} alt="" draggable={false} /> : null}
            </div>
            <div className={`magbook__sheet-face magbook__sheet-face--back${closing && !sheetBack ? ' magbook__sheet-face--paper' : ''}`}>
              {sheetBack ? <img src={sheetBack} alt="" draggable={false} /> : null}
            </div>
          </div>
        )}

        {!coverClosed && !closedBack && <div className="magbook__spine" />}
      </div>

      <div className="magbook__controls">
        <button type="button" onClick={turnPrev} disabled={!canPrev}>←</button>
        <span>
          {shown === 0
            ? 'Cover'
            : isMobile
              ? `Page ${shown} of ${total - 1}`
              : shown * 2 >= total - 1
                ? 'Back cover'
                : `${shown * 2 - 1}–${shown * 2} · ${total} pages`}
        </span>
        <button type="button" onClick={turnNext} disabled={!canNext}>→</button>
      </div>
    </div>
  );
}
