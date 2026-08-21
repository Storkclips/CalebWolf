/*
# Create license settings table

## Purpose
Stores the editable image license agreement text displayed at checkout and on
the public /license page. The agreement is authored in HTML using the rich text
editor in the admin dashboard.

## Changes
- New table: `license_settings` with a single row pattern (like site_identity).
  Columns: `id` (uuid PK), `content_html` (text, default ''), `updated_at` (timestamptz).

## Security
- RLS enabled. Only authenticated admins can write.
- All visitors (anon + authenticated) can read — the license is public content.
*/

CREATE TABLE IF NOT EXISTS license_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_html text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE license_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_license_settings"
  ON license_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admin_write_license_settings"
  ON license_settings FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

INSERT INTO license_settings (content_html)
SELECT '<h1>Image License Agreement</h1><p>By purchasing and downloading images from Caleb Wolf Photography, you agree to the following license terms:</p><h2>Personal Use</h2><p>You may use downloaded images for personal, non-commercial purposes including wallpapers, social media posts, and personal prints.</p><h2>Commercial Use</h2><p>Commercial use requires a separate commercial license. Contact us for details.</p><h2>Restrictions</h2><p>You may not resell, redistribute, or sublicense the images. You may not use the images in AI training datasets.</p><h2>Credit</h2><p>Attribution to Caleb Wolf Photography is appreciated but not required for personal use.</p>'
WHERE NOT EXISTS (SELECT 1 FROM license_settings);
