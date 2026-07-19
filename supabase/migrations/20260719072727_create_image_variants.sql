/*
# Create image_variants table

Stores multiple downloadable file variants per gallery image.
Buyers can choose from labelled options (e.g. "Web 2000px", "Print Quality", "Original PNG")
instead of always getting a single file.

1. New Tables
   - `image_variants`
     - `id` (uuid, PK)
     - `image_id` (uuid, FK → gallery_images.id, CASCADE DELETE)
     - `label` (text) — display name shown to buyer, e.g. "Web (2000px)"
     - `url` (text) — full public storage URL, same format as gallery_images.url
     - `sort_order` (int, default 0) — controls display order in picker
     - `created_at` (timestamptz)

2. Security
   - RLS enabled.
   - Any authenticated user can SELECT (public catalog of download options).
   - Only admin users (profiles.is_admin = true) can INSERT / UPDATE / DELETE.
*/

CREATE TABLE IF NOT EXISTS image_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id uuid NOT NULL REFERENCES gallery_images(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE image_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_variants" ON image_variants;
CREATE POLICY "auth_select_variants" ON image_variants FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_variants" ON image_variants;
CREATE POLICY "admin_insert_variants" ON image_variants FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_variants" ON image_variants;
CREATE POLICY "admin_update_variants" ON image_variants FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "admin_delete_variants" ON image_variants;
CREATE POLICY "admin_delete_variants" ON image_variants FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX IF NOT EXISTS idx_image_variants_image_id ON image_variants(image_id);
