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
 * Full-screen reader: cover alone, then side-by-side spreads. Turning a
 * page animates a single sheet pivoting on the spine; the destination
 * pages are pre-set underneath so the swap when the sheet lands is
 * seamless. On narrow screens the reader shows one page at a time and
 * turns the full sheet from the left edge.
 */
export default function MagazineFlipbookReader({ pages, title, onClose }) {
  const [spread, setSpread] = useState(0); // 0 = cover
  const [aspect, setAspect] = useState(DEFAULT_PAGE_ASPECT);
  const [turning, setTurning] = useState(null); // 'next' | 'prev'
  const isMobile = useIsNarrow();

  const total = pages.length;
  // While closed on the cover the book is half width. Opening is instant
  // (turnNext skips the animation from the cover); closing animates via a
  // CSS transition defined on the --closed state.
  const closed = spread === 0;

  const atRest = turning === null;
  const destSpread = turning === 'next' ? spread + 1 : turning === 'prev' ? spread - 1 : spread;

  const idx = isMobile ? spread : spread * 2;
  const destIdx = isMobile ? destSpread : destSpread * 2;

  const canNext = isMobile ? spread + 1 < total : spread * 2 + 1 < total;
  const canPrev = spread > 0;

  const currentRight = pages[idx] || '';
  const currentLeft = closed ? '' : pages[spread * 2 - 1] || '';
  const targetRight = pages[destIdx] || '';
  const targetLeft = pages[destIdx - 1] || '';

  // Faces under the sheet: on a forward turn the right face is covered
  // from the start so it can show the destination; the left face stays
  // until the sheet lands over it (except when opening the cover, where
  // the left page is genuinely underneath). A backward turn mirrors that.
  const shownLeft = turning === 'prev' ? targetLeft : currentLeft;
  const shownRight = turning === 'next' ? targetRight : currentRight;

  // The moving sheet: forward it carries the current right page over to
  // the left; backward it carries the current left page back to the
  // right. On mobile the sheet is the full page.
  const sheetFront = turning === 'next'
    ? currentRight
    : isMobile ? targetRight : currentLeft;
  const sheetBack = turning === 'next'
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
    setTurning('next');
    window.setTimeout(() => {
      setSpread((s) => s + 1);
      setTurning(null);
    }, FLIP_MS);
  }

function turnPrev() {
    if (turning || !canPrev) return;
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
  const shown = atRest ? spread : destSpread;

  return (
    <div className="magbook">
      <header className="magbook__bar">
        <span className="magbook__title">{title}</span>
        <button className="magbook__close" type="button" onClick={onClose} aria-label="Close reader">
          ×
        </button>
      </header>

      <div
        className={`magbook__book${closed ? ' magbook__book--closed' : ''}`}
        style={bookStyle}
      >
        <div className="magbook__half magbook__half--left">
          {!closed && (
            <div className="magbook__face magbook__face--verso" onClick={turnPrev}>
              <div className="magbook__page">
                {shownLeft ? <img src={shownLeft} alt="" draggable={false} onLoad={handleImgLoad} /> : null}
              </div>
            </div>
          )}
        </div>

        <div className="magbook__half magbook__half--right">
          <div className="magbook__face magbook__face--recto" onClick={turnNext}>
            <div className="magbook__page">
              {shownRight ? <img src={shownRight} alt="" draggable={false} onLoad={handleImgLoad} /> : null}
            </div>
          </div>
        </div>

        {turning && (
          <div
            className={`magbook__sheet magbook__sheet--${turning}`}
            style={{ animationDuration: `${FLIP_MS}ms` }}
          >
            <div className="magbook__sheet-face">
              {sheetFront ? <img src={sheetFront} alt="" draggable={false} /> : null}
            </div>
            <div className="magbook__sheet-face magbook__sheet-face--back">
              {sheetBack ? <img src={sheetBack} alt="" draggable={false} /> : null}
            </div>
          </div>
        )}

        {!closed && <div className="magbook__spine" />}
      </div>

      <div className="magbook__controls">
        <button type="button" onClick={turnPrev} disabled={!canPrev}>←</button>
        <span>
          {shown === 0
            ? 'Cover'
            : isMobile
              ? `Page ${shown} of ${total - 1}`
              : `${shown * 2 - 1}–${shown * 2} · ${total} pages`}
        </span>
        <button type="button" onClick={turnNext} disabled={!canNext}>→</button>
      </div>
    </div>
  );
}
