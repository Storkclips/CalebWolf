/*
  # Create SEO settings table and favicon storage bucket

  ## Purpose
  Allow the admin to configure site-wide SEO metadata (title, description,
  keywords, Open Graph image, canonical URL, robots directives, Twitter card
  type, structured data JSON-LD) and upload a custom favicon — all editable
  from a new "SEO" tab in the admin dashboard.

  ## New Tables
  - `seo_settings` (single row, singleton pattern like `site_identity`)
    - `id` uuid primary key
    - `site_title` text — default <title> for the site
    - `meta_description` text — default meta description
    - `meta_keywords` text — comma-separated keywords
    - `og_title` text — Open Graph title (falls back to site_title)
    - `og_description` text — Open Graph description (falls back to meta_description)
    - `og_image_url` text — Open Graph image URL
    - `twitter_card_type` text — 'summary' or 'summary_large_image'
    - `canonical_base_url` text — base URL for canonical links
    - `robots_index` boolean — whether search engines should index (default true)
    - `robots_follow` boolean — whether search engines should follow links (default true)
    - `json_ld` text — optional JSON-LD structured data string
    - `favicon_url` text — URL to custom favicon in storage bucket
    - `created_at`, `updated_at` timestamps

  ## Storage
  - `favicons` bucket (public) for storing custom favicon files
  - Storage policies allowing public read, admin-only upload

  ## Security
  - RLS enabled on `seo_settings`
  - Admin-only CRUD using `is_admin()` function (same pattern as other admin tables)
  - Public SELECT so anon can read SEO settings (needed for meta tag rendering)
  - A default row is inserted so the singleton always exists
*/

-- ── SEO settings table ──
CREATE TABLE IF NOT EXISTS public.seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_title text DEFAULT 'Caleb Wolf Photography',
  meta_description text DEFAULT 'Cinematic photography portfolio, pricing, and blog by Caleb Wolf.',
  meta_keywords text DEFAULT '',
  og_title text DEFAULT '',
  og_description text DEFAULT '',
  og_image_url text DEFAULT '',
  twitter_card_type text DEFAULT 'summary_large_image',
  canonical_base_url text DEFAULT '',
  robots_index boolean DEFAULT true,
  robots_follow boolean DEFAULT true,
  json_ld text DEFAULT '',
  favicon_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;

-- Public can read SEO settings (needed for meta tags on every page)
DROP POLICY IF EXISTS "public_read_seo_settings" ON public.seo_settings;
CREATE POLICY "public_read_seo_settings"
  ON public.seo_settings FOR SELECT
  TO anon, authenticated USING (true);

-- Admins can do everything
DROP POLICY IF EXISTS "admin_all_seo_settings" ON public.seo_settings;
CREATE POLICY "admin_all_seo_settings"
  ON public.seo_settings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Insert default row if not exists
INSERT INTO public.seo_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.seo_settings);

-- ── Favicons storage bucket ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('favicons', 'favicons', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for favicons bucket
DROP POLICY IF EXISTS "public_read_favicons" ON storage.objects;
CREATE POLICY "public_read_favicons"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'favicons');

-- Admin upload to favicons bucket
DROP POLICY IF EXISTS "admin_upload_favicons" ON storage.objects;
CREATE POLICY "admin_upload_favicons"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'favicons' AND is_admin());

-- Admin update/delete in favicons bucket
DROP POLICY IF EXISTS "admin_update_favicons" ON storage.objects;
CREATE POLICY "admin_update_favicons"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'favicons' AND is_admin())
  WITH CHECK (bucket_id = 'favicons' AND is_admin());

DROP POLICY IF EXISTS "admin_delete_favicons" ON storage.objects;
CREATE POLICY "admin_delete_favicons"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'favicons' AND is_admin());
