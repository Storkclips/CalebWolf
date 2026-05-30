/*
  # Create site_identity table

  Stores the navbar/footer brand configuration.

  1. New Tables
    - `site_identity`
      - `id` (uuid, primary key)
      - `logo_mode` (text) — 'name' | 'svg' | 'both'
      - `site_name` (text) — display name shown when mode is 'name' or 'both'
      - `logo_svg_path` (text) — SVG <path d="..."> data for the logo mark
      - `logo_svg_viewbox` (text) — viewBox attribute, e.g. "0 0 24 24"
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Authenticated users can read (navbar must load for all users)
    - Only admin users can update (checked via profiles.is_admin)

  3. Seed
    - Insert one default row so the app always has a record
*/

CREATE TABLE IF NOT EXISTS site_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_mode text NOT NULL DEFAULT 'name',
  site_name text NOT NULL DEFAULT 'Caleb Wolf',
  logo_svg_path text NOT NULL DEFAULT '',
  logo_svg_viewbox text NOT NULL DEFAULT '0 0 24 24',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site identity"
  ON site_identity FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can update site identity"
  ON site_identity FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Seed a single default row (idempotent)
INSERT INTO site_identity (logo_mode, site_name, logo_svg_path, logo_svg_viewbox)
SELECT 'name', 'Caleb Wolf', '', '0 0 24 24'
WHERE NOT EXISTS (SELECT 1 FROM site_identity);
