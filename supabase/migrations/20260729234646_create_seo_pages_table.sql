/*
  # Create per-page SEO overrides table

  ## Purpose
  Allow the admin to customize SEO metadata (title, description, Open Graph,
  robots, JSON-LD) for individual pages — Home, Collections, Explore, My Library,
  Pricing, About, Blog, Contact, Buy Credits — from the SEO tab in the admin
  dashboard. Each page can override the site-wide defaults. Fields left blank
  fall back to the global seo_settings values.

  ## New Tables
  - `seo_pages` (one row per page key)
    - `id` uuid primary key
    - `page_key` text UNIQUE — slug identifying the page (e.g. 'home', 'about')
    - `site_title` text — page-specific <title>
    - `meta_description` text — page-specific meta description
    - `og_title` text — page-specific Open Graph title
    - `og_description` text — page-specific Open Graph description
    - `og_image_url` text — page-specific Open Graph image
    - `robots_index` boolean — whether this page should be indexed (default true)
    - `robots_follow` boolean — whether links on this page should be followed (default true)
    - `json_ld` text — page-specific structured data
    - `created_at`, `updated_at` timestamps

  ## Security
  - RLS enabled on `seo_pages`
  - Public SELECT so anon can read page SEO (needed for meta tag rendering)
  - Admin-only CRUD using is_admin() function
*/

CREATE TABLE IF NOT EXISTS public.seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text UNIQUE NOT NULL,
  site_title text DEFAULT '',
  meta_description text DEFAULT '',
  og_title text DEFAULT '',
  og_description text DEFAULT '',
  og_image_url text DEFAULT '',
  robots_index boolean DEFAULT true,
  robots_follow boolean DEFAULT true,
  json_ld text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

-- Public can read page SEO settings
DROP POLICY IF EXISTS "public_read_seo_pages" ON public.seo_pages;
CREATE POLICY "public_read_seo_pages"
  ON public.seo_pages FOR SELECT
  TO anon, authenticated USING (true);

-- Admins can do everything
DROP POLICY IF EXISTS "admin_all_seo_pages" ON public.seo_pages;
CREATE POLICY "admin_all_seo_pages"
  ON public.seo_pages FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
