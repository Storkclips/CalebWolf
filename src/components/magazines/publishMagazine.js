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
 * 2. Render each at high resolution and send it to the
 *    `magazine-publish-pages` edge function, which verifies the caller is
 *    an admin and stores it in the `magazine_reader_pages` table
 *    (base64 data URL, one row per reader page). Re-publishing upserts
 *    over the previous images.
 * 3. Rows beyond the current page count from an earlier publish are
 *    pruned via the same function.
 */

const PUBLISH_MAX_WIDTH = 1700;
const PUBLISH_MAX_WIDTH_OVERSUBSCRIBED = 1200;
const PAGE_UPLOAD_GAP_MS = 400;
const PAGE_UPLOAD_RETRIES = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isTransientDbError(message) {
  if (!message) return false;
  return (
    message.includes('57014') ||
    message.includes('57P03') ||
    message.includes('timeout') ||
    message.includes('not accepting connections')
  );
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  if (!base64) throw new Error('Invalid image data.');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function renderPageBlob(readerPage, maxWidth = PUBLISH_MAX_WIDTH) {
  let dataUrl = await renderReaderPage(readerPage, {
    maxWidth,
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

async function callPublishFunction(payload, { retries = PAGE_UPLOAD_RETRIES } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Your session expired — sign in again and retry.');
  }

  let lastError = '';
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) {
      // The database briefly stops accepting connections under load;
      // back off before retrying the same page.
      await sleep(2000 * attempt);
    }
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/magazine-publish-pages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(payload),
        },
      );

      const json = await response.json().catch(() => ({}));
      if (response.ok) return json;
      lastError = json.error || `Publish request failed (${response.status}).`;
      if (!isTransientDbError(lastError)) throw new Error(lastError);
    } catch (err) {
      if (err instanceof TypeError) {
        lastError = 'Network error while uploading a page.';
      } else {
        throw err;
      }
    }
  }
  throw new Error(lastError || 'Could not upload a page after several tries.');
}

export async function publishMagazinePages(magazine, pages, settings, onProgress = () => {}) {
  const magazineId = magazine.id;
  if (!magazineId) throw new Error('Save the magazine before publishing.');

  const readerPages = buildReaderPages(pages, settings || DEFAULT_PRINT_SETTINGS);
  if (!readerPages.length) throw new Error('This magazine has no pages to publish.');

  onProgress({ done: 0, total: readerPages.length, step: 'Rendering pages' });

  const uploaded = [];
  // Try full resolution first; if the database starts rejecting under the
  // write load, fall back to smaller images that are lighter to store.
  let maxWidth = PUBLISH_MAX_WIDTH;
  for (let i = 0; i < readerPages.length; i += 1) {
    const page = readerPages[i];
    let rendered = await renderPageBlob(page, maxWidth);
    if (!rendered) {
      uploaded.push({
        index: i,
        label: page.label,
        file: `${padIndex(i)}.webp`,
        stored: 'missing',
      });
      onProgress({ done: i + 1, total: readerPages.length, step: 'Rendering pages' });
      continue;
    }

    try {
      const base64 = btoa(
        Array.from(rendered.bytes, (byte) => String.fromCharCode(byte)).join(''),
      );
      await callPublishFunction({
        magazine_id: magazineId,
        page_index: i,
        label: page.label,
        image: `data:${rendered.contentType};base64,${base64}`,
      });
      uploaded.push({
        index: i,
        label: page.label,
        file: `${padIndex(i)}.webp`,
        stored: 'database',
      });
    } catch (err) {
      if (maxWidth > PUBLISH_MAX_WIDTH_OVERSUBSCRIBED) {
        maxWidth = PUBLISH_MAX_WIDTH_OVERSUBSCRIBED;
        i -= 1; // re-render and re-upload this page at the smaller size
        onProgress({
          done: i + 1,
          total: readerPages.length,
          step: 'Database busy — retrying at smaller size',
        });
        await sleep(PAGE_UPLOAD_GAP_MS * 4);
        continue;
      }
      throw err;
    }

    onProgress({ done: i + 1, total: readerPages.length, step: 'Rendering pages' });
    await sleep(PAGE_UPLOAD_GAP_MS);
  }

  return uploaded;
}

/**
 * Remove stored reader pages beyond the current page count (left over from
 * a previous publish with more pages).
 */
export async function pruneOldPublishedPages(magazineId, keepCount) {
  await callPublishFunction({ magazine_id: magazineId, prune_from_index: keepCount });
}
