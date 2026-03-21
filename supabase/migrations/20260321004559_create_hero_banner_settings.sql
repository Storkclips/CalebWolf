/*
  # Create hero banner settings table

  1. New Tables
    - `hero_settings`
      - `id` (uuid, primary key)
      - `title` (text) - Main hero title
      - `subtitle` (text) - Hero subtitle/tagline
      - `image_url` (text) - Hero banner image URL
      - `cta_text` (text) - Call to action button text
      - `cta_link` (text) - Call to action button link
      - `is_active` (boolean) - Whether this hero is active
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `hero_settings` table
    - Add policy for public read access to active hero
    - Add policy for authenticated admins to manage hero settings
*/

CREATE TABLE IF NOT EXISTS hero_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  cta_text text NOT NULL DEFAULT 'Explore Gallery',
  cta_link text NOT NULL DEFAULT '/collections',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hero_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active hero"
  ON hero_settings
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert hero settings"
  ON hero_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update hero settings"
  ON hero_settings
  FOR UPDATE
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

CREATE POLICY "Admins can delete hero settings"
  ON hero_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

INSERT INTO hero_settings (title, subtitle, image_url, cta_text, cta_link, is_active)
VALUES (
  'Caleb Wolf Photography',
  'Capturing moments that last forever',
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=2000&q=80',
  'Explore Gallery',
  '/collections',
  true
);