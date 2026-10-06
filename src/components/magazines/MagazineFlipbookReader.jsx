import { useState } from 'react';

/**
 * Full-screen static reader. Shows the cover alone, then side-by-side
 * spreads. Click the right page (or →) to move forward, the left page
 * (or ←) to move back. Page changes are instant — no flip animation.
 */
export default function MagazineFlipbookReader({ pages, title, onClose }) {
  const [spread, setSpread] = useState(0); // 0 = cover

  const total = pages.length;
  const closed = spread === 0;
  const left = closed ? null : pages[spread * 2 - 1] || '';
  const right = closed ? pages[0] || '' : pages[spread * 2] || '';
  const canNext = spread * 2 + 1 < total;
  const canPrev = spread > 0;

  return (
    <div className="magbook">
      <header className="magbook__bar">
        <span className="magbook__title">{title}</span>
        <button className="magbook__close" type="button" onClick={onClose} aria-label="Close reader">
          ×
        </button>
      </header>

      <div className={`magbook__book${closed ? ' magbook__book--closed' : ''}`}>
        <div className="magbook__half magbook__half--left">
          {!closed && (
            <div className="magbook__face magbook__face--verso" onClick={() => canPrev && setSpread((s) => s - 1)}>
              <div className="magbook__page">
                {left ? <img src={left} alt="" draggable={false} /> : null}
              </div>
            </div>
          )}
        </div>

        <div className="magbook__half magbook__half--right">
          <div className="magbook__face magbook__face--recto" onClick={() => canNext && setSpread((s) => s + 1)}>
            <div className="magbook__page">
              {right ? <img src={right} alt="" draggable={false} /> : null}
            </div>
          </div>
        </div>

        {!closed && <div className="magbook__spine" />}
      </div>

      <div className="magbook__controls">
        <button type="button" onClick={() => setSpread((s) => s - 1)} disabled={!canPrev}>←</button>
        <span>{closed ? 'Cover' : `${spread * 2 - 1}–${spread * 2}`} · {total} pages</span>
        <button type="button" onClick={() => setSpread((s) => s + 1)} disabled={!canNext}>→</button>
      </div>
    </div>
  );
}
