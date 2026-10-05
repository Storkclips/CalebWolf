/*
# Store magazine reader pages in the database

1. Plain-English explanation
   - The magazine publisher used to upload pre-cut, high-resolution page
     images to the `magazine-pages` storage bucket. That storage route is
     unreliable in this environment, so the images are now stored directly
     in the database as base64 data URLs, one row per reader page.

2. New Tables
   - `magazine_reader_pages`
     - `id` (uuid, primary key)
     - `magazine_id` (uuid, references magazines, cascade delete)
     - `page_index` (integer, 0-based reader order: front cover = 0)
     - `label` (text, human-readable page label, e.g. "Front Cover")
     - `image` (text, base64 data URL of the rendered high-res page)
     - `created_at` (timestamp)
     - UNIQUE (magazine_id, page_index) so re-publishing replaces cleanly

3. Security
   - RLS enabled on `magazine_reader_pages`.
   - Public (anon + authenticated) can read rows only when the parent
     magazine is published, or when the current user is an admin (draft
     preview). This mirrors the existing magazine_pages gating.
   - Admins (authenticated, is_current_user_admin()) can insert, update,
     and delete rows — used by the publish pipeline.
*/

CREATE TABLE IF NOT EXISTS magazine_reader_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  magazine_id uuid NOT NULL REFERENCES magazines(id) ON DELETE CASCADE,
  page_index integer NOT NULL,
  label text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (magazine_id, page_index)
);

ALTER TABLE magazine_reader_pages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS magazine_reader_pages_magazine_idx
  ON magazine_reader_pages (magazine_id, page_index);

DROP POLICY IF EXISTS "Public can read published magazine reader pages" ON magazine_reader_pages;
CREATE POLICY "Public can read published magazine reader pages"
ON magazine_reader_pages FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM magazines m
    WHERE m.id = magazine_reader_pages.magazine_id
      AND (m.status = 'published' OR is_current_user_admin())
  )
);

DROP POLICY IF EXISTS "Admins can insert magazine reader pages" ON magazine_reader_pages;
CREATE POLICY "Admins can insert magazine reader pages"
ON magazine_reader_pages FOR INSERT
TO authenticated
WITH CHECK (is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update magazine reader pages" ON magazine_reader_pages;
CREATE POLICY "Admins can update magazine reader pages"
ON magazine_reader_pages FOR UPDATE
TO authenticated
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete magazine reader pages" ON magazine_reader_pages;
CREATE POLICY "Admins can delete magazine reader pages"
ON magazine_reader_pages FOR DELETE
TO authenticated
USING (is_current_user_admin());
