export const MAGAZINE_ROOT = '/magazines';

export function normalizeMagazineEntry(entry) {
  if (typeof entry === 'string') return { slug: entry };
  if (entry && typeof entry === 'object') {
    return {
      ...entry,
      slug: entry.slug || entry.folder || entry.id || '',
    };
  }
  return { slug: '' };
}

export function normalizeAssetPath(slug, value) {
  if (!value) return '';
  if (/^(?:https?:|data:|blob:)/i.test(value)) return value;
  const clean = String(value).replace(/^\.?\//, '');
  if (clean.startsWith('magazines/')) return `/${clean}`;
  return `${MAGAZINE_ROOT}/${encodeURIComponent(slug)}/${clean}`;
}

export function buildPageList(slug, manifest) {
  if (Array.isArray(manifest?.pages) && manifest.pages.length) {
    return manifest.pages.map((page, index) => {
      if (typeof page === 'string') {
        return {
          index,
          file: page,
          src: normalizeAssetPath(slug, page),
          label: String(index).padStart(3, '0'),
        };
      }

      const file = page?.file || page?.src || page?.path || '';
      return {
        ...page,
        index,
        file,
        src: normalizeAssetPath(slug, file),
        label: page?.label || String(index).padStart(3, '0'),
      };
    });
  }

  const count = Math.max(0, Number(manifest?.pageCount || manifest?.totalPages || 0));
  const extension = String(manifest?.pageExtension || manifest?.extension || 'webp').replace(/^\./, '');
  const padding = Math.max(1, Number(manifest?.zeroPad || manifest?.padding || 3));
  const start = Number.isFinite(Number(manifest?.startPage)) ? Number(manifest.startPage) : 0;

  return Array.from({ length: count }, (_, index) => {
    const number = start + index;
    const label = String(number).padStart(padding, '0');
    const file = `pages/${label}.${extension}`;
    return {
      index,
      file,
      src: normalizeAssetPath(slug, file),
      label,
    };
  });
}

export async function fetchMagazineManifest(slug, signal) {
  const response = await fetch(
    `${MAGAZINE_ROOT}/${encodeURIComponent(slug)}/manifest.json`,
    { cache: 'no-store', signal },
  );

  if (!response.ok) {
    throw new Error(`Could not load manifest for “${slug}” (${response.status}).`);
  }

  const manifest = await response.json();
  return {
    ...manifest,
    slug,
  };
}

export async function fetchMagazineIndex(signal) {
  const response = await fetch(`${MAGAZINE_ROOT}/index.json`, {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Could not load /magazines/index.json (${response.status}).`);
  }

  const data = await response.json();
  const raw = Array.isArray(data) ? data : data.magazines;

  if (!Array.isArray(raw)) {
    throw new Error('magazines/index.json must contain a "magazines" array.');
  }

  return raw.map(normalizeMagazineEntry).filter((item) => item.slug);
}

export function getCoverSource(slug, manifest, pages) {
  const cover = manifest?.cover || manifest?.coverImage || manifest?.thumbnail;
  if (cover) return normalizeAssetPath(slug, cover);
  return pages?.[0]?.src || '';
}
