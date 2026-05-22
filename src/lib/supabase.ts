import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const STORAGE_PUBLIC_PREFIX = `${supabaseUrl}/storage/v1/object/public/gallery/`;
const FUNCTIONS_BASE = `${supabaseUrl}/functions/v1/image-proxy`;

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
 */
export function proxyImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  const path = storagePathFromUrl(url);
  if (!path) return url; // external URL — pass through
  return `${FUNCTIONS_BASE}?path=${encodeURIComponent(path)}`;
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
