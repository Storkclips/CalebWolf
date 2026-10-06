import { useEffect, useState } from 'react';

const FLIP_MS = 650;
const DEFAULT_PAGE_ASPECT = 8.5 / 11;

/**
 * Full-screen reader: cover alone, then side-by-side spreads. Turning a
 * page animates a single sheet pivoting on the spine; the underlying
 * faces pre-show the destination page so the swap at the end is seamless.
 */
export default function MagazineFlipbookReader({ pages, title, onClose }) {
  const [spread, setSpread] = useState(0); // 0 = cover
  const [aspect, setAspect] = useState(DEFAULT_PAGE_ASPECT);
  const [turning, setTurning] = useState(null); // 'next' | 'prev'

  const total = pages.length;
  const closed = spread === 0;
  const canNext = spread * 2 + 1 < total;
  const canPrev = spread > 0;

  const left = closed ? null : pages[spread * 2 - 1] || '';
  const right = closed ? pages[0] || '' : pages[spread * 2] || '';

  // While a turn is in flight the sheet covers the face it lands on, so
  // that face can already show the page it will hold after the turn.
  const shownLeft = turning === 'prev' ? pages[spread * 2 - 3] || '' : left;
  const shownRight = turning === 'next' ? pages[spread * 2 + 2] || '' : right;

  function turnNext() {
    if (turning || !canNext) return;
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

          {turning === 'next' && (
            <div
              className="magbook__sheet magbook__sheet--next"
              style={{ animationDuration: `${FLIP_MS}ms` }}
            >
              <div className="magbook__sheet-face">
                {right ? <img src={right} alt="" draggable={false} /> : null}
              </div>
              <div className="magbook__sheet-face magbook__sheet-face--back">
                {pages[spread * 2 + 1] ? <img src={pages[spread * 2 + 1]} alt="" draggable={false} /> : null}
              </div>
            </div>
          )}

          {turning === 'prev' && (
            <div
              className="magbook__sheet magbook__sheet--prev"
              style={{ animationDuration: `${FLIP_MS}ms` }}
            >
              <div className="magbook__sheet-face">
                {left ? <img src={left} alt="" draggable={false} /> : null}
              </div>
              <div className="magbook__sheet-face magbook__sheet-face--back">
                {pages[(spread - 1) * 2] ? <img src={pages[(spread - 1) * 2]} alt="" draggable={false} /> : null}
              </div>
            </div>
          )}
        </div>

        {!closed && <div className="magbook__spine" />}
      </div>

      <div className="magbook__controls">
        <button type="button" onClick={turnPrev} disabled={!canPrev}>←</button>
        <span>{closed ? 'Cover' : `${spread * 2 - 1}–${spread * 2}`} · {total} pages</span>
        <button type="button" onClick={turnNext} disabled={!canNext}>→</button>
      </div>
    </div>
  );
}
