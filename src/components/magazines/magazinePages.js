/**
 * Shared page-slicing model for the magazine platform.
 *
 * Stored print files follow the perfect-bound template: every file carries a
 * 0.12" bleed on all sides, and each cover file is a wide spread laid out as
 * back cover + spine + front cover (outside) or inside front cover + spine +
 * inside back cover (inside). These helpers derive the individual reader
 * pages — one per file region — with their crop rectangles in file pixels.
 */

export const PX_PER_IN = 96;

export const DEFAULT_PRINT_SETTINGS = {
  trimW: 8.5,
  trimH: 11,
  bleed: 0.12,
  spine: 0.25,
};

/**
 * Reduce stored page rows to the ordered reader pages a visitor flips
 * through: front cover, inner pages in reading order, inside back cover,
 * inside front cover, back cover. Each entry carries the file dimensions and
 * the crop rectangle (cropX/cropY/cropW/cropH) of its trim frame.
 */
export function buildReaderPages(pages, settings) {
  const merged = { ...DEFAULT_PRINT_SETTINGS, ...(settings || {}) };
  const trimW = Number(merged.trimW) || 8.5;
  const trimH = Number(merged.trimH) || 11;
  const bleed = Number(merged.bleed) || 0;
  const spine = Number(merged.spine) || 0;

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
      backs.push(panel('Back Cover', bleedPx, 2));
    } else {
      // The inside back cover closes the inner pages; the inside front
      // cover sits at the back of the book, just before the outside back
      // cover.
      backs.push(panel('Inside Back Cover', bleedPx + pagePx + spinePx, 0));
      backs.push(panel('Inside Front Cover', bleedPx, 1));
    }
  });

  const bySlot = (a, b) => a.slot - b.slot;
  return [...fronts.sort(bySlot), ...inners, ...backs.sort(bySlot)];
}

/**
 * Render a saved Fabric.js page at high resolution and crop it to the trim
 * frame, returning a data URL of exactly that region. Shared by the live
 * flipbook and the publish pipeline so both produce identical frames.
 */
export async function renderReaderPage(page, { maxWidth = 1700, format = 'jpeg', quality = 0.9 } = {}) {
  const { canvasEl, fileW, fileH, cropX, cropY, cropW, cropH } = page;
  if (!canvasEl?.json) return '';

  const mod = await import('fabric');
  // fabric@5 ships a CJS bundle whose API lives under the named `fabric`
  // export; Vite's interop does not always provide a default.
  const fabric = mod.fabric ?? mod.default ?? mod;
  if (!fabric?.StaticCanvas) return '';

  const el = document.createElement('canvas');
  el.width = Math.round(fileW);
  el.height = Math.round(fileH);
  const canvas = new fabric.StaticCanvas(el, {
    width: Math.round(fileW),
    height: Math.round(fileH),
    backgroundColor: canvasEl.json.background || '#ffffff',
  });

  try {
    await new Promise((resolve) => {
      try {
        canvas.loadFromJSON(canvasEl.json, () => resolve(), (obj) => obj);
      } catch {
        resolve();
      }
      setTimeout(resolve, 8000);
    });
    canvas.renderAll();
    const multiplier = Math.min(2.5, Math.max(1, maxWidth / cropW));
    return canvas.toDataURL({
      format,
      quality,
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

/**
 * Best available preview for a reader page: the saved thumbnail, or a
 * blank page colored with the page background when no thumbnail exists.
 */
export function readerPagePreviewSrc(page) {
  return page.canvasEl?.src || '';
}
