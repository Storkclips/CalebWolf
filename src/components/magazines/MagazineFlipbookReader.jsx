import { useEffect, useState } from 'react';

const FLIP_MS = 650;
const SLIDE_MS = 450; // must match the book slide transition in CSS
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
 * the swap when the sheet lands is seamless. Opening the front cover
 * folds the cover onto the empty space left of the centered book — page
 * two is revealed in the cover's place — then the assembled spread
 * slides to center; closing back to the front cover mirrors it — the
 * book stays put while the cover folds home, then the closed book glides
 * to center. Closing on the back cover does the same from the opposite
 * side: the last page folds onto the back cover in place, then the
 * closed book glides to center. On narrow screens the reader shows one
 * page at a time and turns the full sheet from the left edge.
 */
export default function MagazineFlipbookReader({ pages, title, onClose }) {
  const [spread, setSpread] = useState(0); // 0 = cover
  const [aspect, setAspect] = useState(DEFAULT_PAGE_ASPECT);
  const [turning, setTurning] = useState(null); // 'next' | 'prev' | 'opening' | 'openingBack' | 'closing'
  const [closedBack, setClosedBack] = useState(false); // resting on the closed back cover
  const isMobile = useIsNarrow();

  const total = pages.length;

  const atRest = turning === null;
  const destSpread =
    turning === 'next' || turning === 'opening'
      ? spread + 1
      : turning === 'prev' || turning === 'closingFront'
        ? spread - 1
        : spread;
  const idx = isMobile ? spread : spread * 2;
  const destIdx = isMobile ? destSpread : destSpread * 2;

  // The final readable spread pairs the last inner page with the outside
  // back cover; from there the next turn closes the book.
  const closing = turning === 'closing';
  const opening = turning === 'opening';
  const openingBack = turning === 'openingBack';
  const closingFront = turning === 'closingFront';
  // On desktop the book keeps its closed, centered geometry through the
  // cover fold — the spread only assembles when the slide starts. On
  // mobile the closed class drops at flip start so the book widens under
  // the turning sheet.
  const coverClosed =
    spread === 0 &&
    (turning === null || (turning === 'opening' && !isMobile) || turning === 'closingSlide');
  const onFinalSpread = !isMobile && spread > 0 && spread * 2 + 1 >= total;

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
  // collapses, so there's no swap when the sheet settles. During the
  // opening folds the halves beneath stay as the sheet will leave them:
  // the front open keeps the left blank (the first page rides in on the
  // sheet's underside) and the back reopen shows the final spread, which
  // the lifting cover uncovers as it folds home.
  const shownLeft = closedBack
    ? endCover
    : closingFront
      ? ''
      : closing || opening || openingBack
        ? currentLeft
        : turning === 'prev'
          ? targetLeft
          : currentLeft;
  const showingDest = turning === 'next' || turning === 'opening';
  const effectiveRightIdx = showingDest ? destIdx : idx;
  const rightIsBackCover = !isMobile && effectiveRightIdx === total - 1;
  const shownRight = closedBack
    ? ''
    : rightIsBackCover
      ? ''
      : closingFront
        ? currentRight
        : showingDest
          ? targetRight
          : currentRight;

  // The opening-back sheet is the closing fold played in reverse: blank
  // paper on its front face, the back cover on its underside — it lifts
  // off the left half carrying the cover home to the right.
  const sheetFront = opening
    ? pages[0] || ''
    : closing || openingBack
      ? ''
      : turning === 'next'
        ? currentRight
        : isMobile ? targetRight : currentLeft;
  const sheetBack = closing || openingBack
    ? endCover
    : turning === 'next' || turning === 'opening'
      ? (isMobile ? targetRight : targetLeft)
      : (isMobile ? currentRight : targetRight);

  function turnNext() {
    if (turning || !canNext) return;
    // Opening the cover: the book widens while the cover lifts off the
    // right half and folds onto the left, revealing pages 1–2 — the sheet
    // covers the space appearing beneath it, so nothing shows before it
    // should.
    if (spread === 0) {
      if (isMobile) {
        setTurning('opening');
        window.setTimeout(() => {
          setSpread(1);
          setTurning(null);
        }, FLIP_MS);
      } else {
        // Phase 1: the book stays put, centered, and the cover folds onto
        // the empty space left of the spine. Phase 2: the assembled
        // spread glides to center.
        setTurning('opening');
        window.setTimeout(() => {
          // The spread assembles (closed -> open geometry) in the same
          // frame the slide starts, so the pages land exactly where the
          // sheet left them and glide to center together.
          setSpread(1);
          setTurning('sliding');
          window.setTimeout(() => {
            setTurning(null);
          }, SLIDE_MS);
        }, FLIP_MS);
      }
      return;
    }
    // The final turn closes the book: the last page folds over, its
    // reverse face — the outside back cover — lands as the cover, and the
    // book narrows to a single centered page.
    if (onFinalSpread) {
      // Mirror of the front close: the book keeps its spread geometry
      // while the last page folds over — its reverse face, the outside
      // back cover, lands on the left half — then snaps to the closed
      // footprint under the landed cover and glides to center.
      setTurning('closing');
      window.setTimeout(() => {
        setClosedBack(true);
        setTurning('closingSlideBack');
        window.setTimeout(() => {
          setTurning(null);
        }, SLIDE_MS);
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
    // Reopening from the back cover plays the closing fold in reverse:
    // the book widens while the cover lifts off the left half and folds
    // back home to the right, uncovering the final spread beneath it.
    if (closedBack) {
      setTurning('openingBack');
      setClosedBack(false);
      window.setTimeout(() => {
        setTurning(null);
      }, FLIP_MS);
      return;
    }
    if (!isMobile && spread === 1) {
      // Mirror of the open, phase 1: the book keeps its spread geometry
      // while the cover sheet folds from the left half home onto the
      // right. Phase 2: the book snaps to its closed footprint (already
      // sitting under the landed cover) and glides to center.
      setTurning('closingFront');
      window.setTimeout(() => {
        setSpread(0);
        setTurning('closingSlide');
        window.setTimeout(() => {
          setTurning(null);
        }, SLIDE_MS);
      }, FLIP_MS);
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
  const sheetClass =
    closing ? 'next'
      : opening ? 'opening'
        : openingBack ? 'openingBack'
          : closingFront ? 'prev'
            : turning;

  return (
    <div className="magbook">
      <header className="magbook__bar">
        <span className="magbook__title">{title}</span>
        <button className="magbook__close" type="button" onClick={onClose} aria-label="Close reader">
          ×
        </button>
      </header>

      <div
        className={`magbook__book${coverClosed || closedBack ? ' magbook__book--closed' : ''}${closedBack ? ' magbook__book--end-closed' : ''}${opening ? (isMobile ? ' magbook__book--opening-m' : ' magbook__book--opening') : ''}${turning === 'sliding' ? ' magbook__book--sliding' : ''}${closingFront ? ' magbook__book--closing-front' : ''}${turning === 'closingSlide' ? ' magbook__book--closing-slide' : ''}${turning === 'closingSlideBack' ? ' magbook__book--closing-slide-back' : ''}`}
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
            <div className="magbook__page" style={rightIsBackCover && !closedBack && !closing ? { background: '#f7f4ee' } : undefined}>
              {shownRight ? <img src={shownRight} alt="" draggable={false} onLoad={handleImgLoad} /> : null}
            </div>
          </div>
        </div>

        {turning && turning !== 'sliding' && turning !== 'closingSlide' && turning !== 'closingSlideBack' && (
          <div
            className={`magbook__sheet magbook__sheet--${sheetClass}`}
            style={{ animationDuration: `${FLIP_MS}ms` }}
          >
            <div className={`magbook__sheet-face${closing || openingBack ? ' magbook__sheet-face--paper' : ''}`}>
              {sheetFront ? <img src={sheetFront} alt="" draggable={false} /> : null}
            </div>
            <div className={`magbook__sheet-face magbook__sheet-face--back${(closing || opening || openingBack) && !sheetBack ? ' magbook__sheet-face--paper' : ''}`}>
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
