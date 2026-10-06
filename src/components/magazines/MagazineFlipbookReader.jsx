const FLIP_MS = 700;

function SheetFace({ className, src, bg }) {
  return (
    <div className={className}>
      <div className="magbook__page" style={bg ? { background: bg } : undefined}>
        {src ? <img src={src} alt="" draggable={false} /> : null}
      </div>
    </div>
  );
}

/**
 * Full-screen flipbook reader. Click the right page to turn forward, the
 * left page to turn back. Page index 0 is the front cover; after that the
 * pages are shown as side-by-side spreads.
 */
export default function MagazineFlipbookReader({ pages, title, onClose }) {
  const [sheetIndex, setSheetIndex] = useState(0); // 0 = closed on the cover
  const [turning, setTurning] = useState(null); // 'next' | 'prev'

  const total = pages.length;
  const closed = sheetIndex === 0;
  const left = closed ? null : pages[sheetIndex * 2 - 1] || '';
  const right = closed ? pages[0] || '' : pages[sheetIndex * 2] || '';
  const canNext = sheetIndex * 2 + 1 < total;
  const canPrev = sheetIndex > 0;

  function flipNext() {
    if (turning || !canNext) return;
    setTurning('next');
    window.setTimeout(() => {
      setSheetIndex((c) => c + 1);
      setTurning(null);
    }, FLIP_MS / 2);
  }

  function flipPrev() {
    if (turning || !canPrev) return;
    setTurning('prev');
    window.setTimeout(() => {
      setSheetIndex((c) => c - 1);
      setTurning(null);
    }, FLIP_MS / 2);
  }

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
            <div className="magbook__face magbook__face--verso" onClick={flipPrev}>
              <SheetFace className="magbook__page-wrap" src={left} />
            </div>
          )}
        </div>

        <div className="magbook__half magbook__half--right">
          <div className="magbook__face magbook__face--recto" onClick={flipNext}>
            <SheetFace className="magbook__page-wrap" src={right} />
          </div>

          {turning === 'next' && (
            <div
              className="magbook__sheet"
              style={{ animation: `magbook-turn-next ${FLIP_MS}ms ease-in-out forwards` }}
            >
              <SheetFace className="magbook__face magbook__face--front" src={right} />
              <SheetFace
                className="magbook__face magbook__face--back"
                src={pages[sheetIndex * 2 + 1] || ''}
              />
            </div>
          )}

          {turning === 'prev' && (
            <div
              className="magbook__sheet"
              style={{ animation: `magbook-turn-prev ${FLIP_MS}ms ease-in-out forwards` }}
            >
              <SheetFace
                className="magbook__face magbook__face--front"
                src={pages[sheetIndex * 2 - 1] || ''}
              />
              <SheetFace
                className="magbook__face magbook__face--back"
                src={pages[(sheetIndex - 1) * 2] || ''}
              />
            </div>
          )}
        </div>

        <div className="magbook__spine" />
      </div>

      <div className="magbook__controls">
        <button type="button" onClick={flipPrev} disabled={!canPrev}>←</button>
        <span>{closed ? 'Cover' : `${sheetIndex * 2 - 1}–${sheetIndex * 2}`} · {total} pages</span>
        <button type="button" onClick={flipNext} disabled={!canNext}>→</button>
      </div>
    </div>
  );
}
