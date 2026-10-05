import { supabase } from '../../lib/supabase';
import {
  buildReaderPages,
  renderReaderPage,
  DEFAULT_PRINT_SETTINGS,
} from './magazinePages';

/**
 * Publishes a magazine's stored print files as ready-to-serve reader pages:
 *
 * 1. Slice the stored print files into the ordered reader pages
 *    (front cover, inside front cover, inner pages, inside back cover,
 *    back cover), cropping each to its trim frame.
 * 2. Render each at high resolution and upload it to the `magazine-pages`
 *    storage bucket as a zero-padded numbered WebP:
 *    `<magazine_id>/000.webp`, `001.webp`, ...
 * 3. Record the ordered file list and labels on the magazine row in
 *    `project_json.published_pages` so the public flipbook can serve the
 *    pre-cut images directly instead of re-rendering artwork in the browser.
 */

const PUBLISH_MAX_WIDTH = 1700;

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  if (!base64) throw new Error('Invalid image data.');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function renderPageBlob(readerPage) {
  let dataUrl = await renderReaderPage(readerPage, {
    maxWidth: PUBLISH_MAX_WIDTH,
    format: 'webp',
    quality: 0.92,
  });

  if (!dataUrl) {
    // Fabric failed (rare): fall back to drawing the saved thumbnail onto a
    // canvas and cropping it to the trim frame so publishing still works.
    const src = readerPage.canvasEl?.src;
    if (!src) return null;
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Page thumbnail failed to load.'));
      el.src = src;
    });
    const out = document.createElement('canvas');
    out.width = Math.round(readerPage.cropW);
    out.height = Math.round(readerPage.cropH);
    const ctx = out.getContext('2d');
    ctx.fillStyle = readerPage.row?.background_color || '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(
      img,
      readerPage.cropX, readerPage.cropY, readerPage.cropW, readerPage.cropH,
      0, 0, out.width, out.height,
    );
    dataUrl = out.toDataURL('image/webp', 0.92);
  }

  return { bytes: dataUrlToBytes(dataUrl), contentType: 'image/webp' };
}

function padIndex(index) {
  return String(index).padStart(3, '0');
}

export async function publishMagazinePages(magazine, pages, settings, onProgress = () => {}) {
  const magazineId = magazine.id;
  if (!magazineId) throw new Error('Save the magazine before publishing.');

  const readerPages = buildReaderPages(pages, settings || DEFAULT_PRINT_SETTINGS);
  if (!readerPages.length) throw new Error('This magazine has no pages to publish.');

  const prefix = `${magazineId}`;
  onProgress({ done: 0, total: readerPages.length, step: 'Rendering pages' });

  const uploaded = [];
  for (let i = 0; i < readerPages.length; i += 1) {
    const page = readerPages[i];
    const fileName = `${prefix}/${padIndex(i)}.webp`;
    const rendered = await renderPageBlob(page);
    if (rendered) {
      const { error } = await supabase.storage
        .from('magazine-pages')
        .upload(fileName, rendered.bytes, {
          contentType: rendered.contentType,
          upsert: true,
        });
      if (error) throw new Error(`Could not upload page ${i}: ${error.message}`);
      const { data } = supabase.storage.from('magazine-pages').getPublicUrl(fileName);
      uploaded.push({
        index: i,
        label: page.label,
        file: padIndex(i),
        path: fileName,
        url: data.publicUrl,
      });
    } else {
      uploaded.push({
        index: i,
        label: page.label,
        file: padIndex(i),
        path: fileName,
        url: '',
      });
    }
    onProgress({ done: i + 1, total: readerPages.length, step: 'Rendering pages' });
  }

  return uploaded;
}

/**
 * Remove any numbered page files beyond the current page count (left over
 * from a previous publish with more pages).
 */
export async function pruneOldPublishedPages(magazineId, keepCount) {
  const { data, error } = await supabase.storage
    .from('magazine-pages')
    .list(magazineId, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (error || !data) return;

  const stale = data.filter((obj) => {
    const match = /^(\d{3})\.webp$/.exec(obj.name);
    return match && Number(match[1]) >= keepCount;
  });

  if (stale.length) {
    await supabase.storage
      .from('magazine-pages')
      .remove(stale.map((obj) => `${magazineId}/${obj.name}`));
  }
}
