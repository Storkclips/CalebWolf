/*
  # Create themes and gallery_images tables for image management

  1. New Tables
    - `themes`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `slug` (text, unique, not null)
      - `cover_url` (text)
      - `sort_order` (integer, default 0)
      - `is_published` (boolean, default true)
      - `created_at` (timestamptz)
    - `gallery_images`
      - `id` (uuid, primary key)
      - `theme_id` (uuid, FK to themes)
      - `title` (text, not null)
      - `url` (text, not null)
      - `price` (integer, credits cost, default 3)
      - `is_published` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Public SELECT on published rows (anon + authenticated)
    - INSERT/UPDATE/DELETE restricted to authenticated users

  3. Seed Data
    - Pre-populated with themes and images from existing hardcoded collections
*/

CREATE TABLE IF NOT EXISTS themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  cover_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published themes"
  ON themes FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Authenticated users can insert themes"
  ON themes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update themes"
  ON themes FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete themes"
  ON themes FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  url text NOT NULL,
  price integer NOT NULL DEFAULT 3,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published images"
  ON gallery_images FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Authenticated users can insert images"
  ON gallery_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update images"
  ON gallery_images FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete images"
  ON gallery_images FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_gallery_images_theme ON gallery_images(theme_id);

-- Seed themes
INSERT INTO themes (name, slug, cover_url, sort_order) VALUES
  ('Weddings', 'weddings', 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80', 1),
  ('Landscapes', 'landscapes', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1000&q=80', 2),
  ('Wildlife', 'wildlife', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80', 3),
  ('Editorial', 'editorial', 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1000&q=80', 4),
  ('Portraits', 'portraits', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1000&q=80', 5),
  ('Adventure', 'adventure', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80', 6);

-- Seed images for each theme
INSERT INTO gallery_images (theme_id, title, url, price)
SELECT t.id, v.title, v.url, v.price
FROM themes t
CROSS JOIN LATERAL (
  VALUES
    ('Hawthorne ceremony first look', 'https://images.unsplash.com/photo-1520854221050-0f4caff449fb?auto=format&fit=crop&w=1200&q=80', 4),
    ('City Hall vows exchange', 'https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?auto=format&fit=crop&w=1200&q=80', 4),
    ('Sunset reception candids', 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80', 4),
    ('Bridal portrait golden hour', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80', 3),
    ('Ring detail macro', 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80', 3),
    ('Ceremony aisle moment', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', 4)
) AS v(title, url, price)
WHERE t.slug = 'weddings';

INSERT INTO gallery_images (theme_id, title, url, price)
SELECT t.id, v.title, v.url, v.price
FROM themes t
CROSS JOIN LATERAL (
  VALUES
    ('Columbia Gorge at dawn', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80', 2),
    ('Misty forest trail', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80', 2),
    ('Glacier-fed river blue hour', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', 2),
    ('Coastal fog at Cannon Beach', 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80', 2)
) AS v(title, url, price)
WHERE t.slug = 'landscapes';

INSERT INTO gallery_images (theme_id, title, url, price)
SELECT t.id, v.title, v.url, v.price
FROM themes t
CROSS JOIN LATERAL (
  VALUES
    ('Wolf pack at rest', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', 3),
    ('Elk at twilight', 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80', 3),
    ('Raptor in flight', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80', 3),
    ('Fox in autumn leaves', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80', 3)
) AS v(title, url, price)
WHERE t.slug = 'wildlife';

INSERT INTO gallery_images (theme_id, title, url, price)
SELECT t.id, v.title, v.url, v.price
FROM themes t
CROSS JOIN LATERAL (
  VALUES
    ('Orchid macro study', 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80', 2),
    ('Monstera shadow play', 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1200&q=80', 2),
    ('Fern detail soft light', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80', 2),
    ('Dried florals still life', 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80', 2)
) AS v(title, url, price)
WHERE t.slug = 'editorial';

INSERT INTO gallery_images (theme_id, title, url, price)
SELECT t.id, v.title, v.url, v.price
FROM themes t
CROSS JOIN LATERAL (
  VALUES
    ('Golden hour in the city', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80', 3),
    ('Studio minimalism', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80', 3),
    ('Editorial contrast', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80', 3),
    ('Lakeside calm portrait', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', 3)
) AS v(title, url, price)
WHERE t.slug = 'portraits';

INSERT INTO gallery_images (theme_id, title, url, price)
SELECT t.id, v.title, v.url, v.price
FROM themes t
CROSS JOIN LATERAL (
  VALUES
    ('Snowy summit sunrise', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', 3),
    ('Alpine meadow wildflowers', 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80', 3),
    ('Forest creek crossing', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80', 3),
    ('Evening bonfire camp', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80', 3)
) AS v(title, url, price)
WHERE t.slug = 'adventure';