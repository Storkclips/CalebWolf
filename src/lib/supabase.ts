import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const STORAGE_PUBLIC_PREFIX = `${supabaseUrl}/storage/v1/object/public/gallery/`;
const FUNCTIONS_BASE = `${supabaseUrl}/functions/v1/image-proxy`;

// Image size presets for responsive images
export const IMAGE_SIZES = {
  thumbnail: 300,    // Grid thumbnails
  small: 600,        // Cards and small previews
  medium: 900,       // Detail pages
  large: 1200,       // Large previews
  xlarge: 1600,      // Full-screen hero images
  full: 2400,        // Full resolution downloads
} as const;

/**
 * Given a full public Supabase storage URL for the gallery bucket,
 * return the relative storage path (e.g. "images/abc.jpg").
 */
export function storagePathFromUrl(url: string): string | null {
  if (!url) return null;
  if (url.startsWith(STORAGE_PUBLIC_PREFIX)) {
    return url.slice(STORAGE_PUBLIC_PREFIX.length);
  }
  // Already a path (no host)
  if (!url.startsWith('http')) return url;
  return null;
}

/**
 * Convert a gallery storage URL into a watermarked preview URL served
 * through the image-proxy edge function. Non-gallery URLs are passed through.
 *
 * @param url - The image URL
 * @param width - Target width (defaults to IMAGE_SIZES.small)
 */
export function proxyImageUrl(url: string | undefined | null, width?: number): string {
  if (!url) return '';
  const path = storagePathFromUrl(url);
  if (!path) return url; // external URL — pass through
  const w = width ?? IMAGE_SIZES.small;
  return `${FUNCTIONS_BASE}?path=${encodeURIComponent(path)}&w=${w}`;
}

/**
 * Generate a srcset string for responsive images
 * @param url - The image URL
 * @param sizes - Array of size presets to include
 */
export function generateSrcSet(
  url: string | undefined | null,
  sizes: readonly (keyof typeof IMAGE_SIZES)[] = ['thumbnail', 'small', 'medium']
): string {
  if (!url) return '';
  const path = storagePathFromUrl(url);
  if (!path) return url; // external URL -- pass through

  return sizes
    .map(size => `${FUNCTIONS_BASE}?path=${encodeURIComponent(path)}&w=${IMAGE_SIZES[size]} ${IMAGE_SIZES[size]}w`)
    .join(', ');
}

/**
 * Request a short-lived signed URL for the original file so a logged-in
 * user can download the full-resolution version.
 * Returns null on failure.
 */
export async function getSignedDownloadUrl(
  url: string,
  accessToken: string,
): Promise<string | null> {
  const path = storagePathFromUrl(url);
  if (!path) return url; // external URL — return as-is
  try {
    const res = await fetch(
      `${FUNCTIONS_BASE}?path=${encodeURIComponent(path)}&download=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.url ?? null;
  } catch {
    return null;
  }
}

const missingEnv = !supabaseUrl || !supabaseAnonKey;
const missingEnvMessage =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.';

const missingSupabase = new Proxy(() => undefined, {
  get: () => missingSupabase,
  apply: () => {
    throw new Error(missingEnvMessage);
  },
});

if (missingEnv) {
  console.warn(missingEnvMessage);
}

type SupabaseClient = ReturnType<typeof createClient>;

export const supabase: SupabaseClient = missingEnv
  ? (missingSupabase as unknown as SupabaseClient)
  : createClient(supabaseUrl, supabaseAnonKey);
