/*
  # Admin Collections & Unlock Codes

  1. New Tables
    - `admin_collections`
      - `id` (uuid, primary key) - unique collection identifier
      - `title` (text) - display name of the collection
      - `slug` (text, unique) - URL-friendly identifier
      - `description` (text) - collection description
      - `category` (text) - e.g. Weddings, Portraits
      - `cover_url` (text) - cover image URL
      - `tags` (jsonb) - array of tag strings
      - `price_per_image` (integer) - credit price per image
      - `bulk_bundle_label` (text) - bundle name
      - `bulk_bundle_price` (integer) - bundle price in credits
      - `is_selling` (boolean) - whether collection is available for purchase
      - `is_published` (boolean) - whether collection is visible at all
      - `sort_order` (integer) - display ordering
      - `created_at` (timestamptz) - creation timestamp

    - `collection_images`
      - `id` (uuid, primary key)
      - `collection_id` (uuid, FK to admin_collections)
      - `title` (text) - image title
      - `url` (text) - image URL
      - `price` (integer) - individual credit price
      - `sort_order` (integer) - display ordering
      - `is_published` (boolean) - visibility flag
      - `created_at` (timestamptz)

    - `unlock_codes`
      - `id` (uuid, primary key)
      - `code` (text, unique) - the code users enter
      - `collection_id` (uuid, FK to admin_collections)
      - `max_uses` (integer) - how many times the code can be redeemed (0 = unlimited)
      - `times_used` (integer) - current redemption count
      - `is_active` (boolean) - whether the code is still valid
      - `expires_at` (timestamptz, nullable) - optional expiry
      - `created_at` (timestamptz)

    - `unlocked_collections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to profiles)
      - `collection_id` (uuid, FK to admin_collections)
      - `unlock_code_id` (uuid, FK to unlock_codes)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - admin_collections: public can SELECT published, authenticated admin can manage
    - collection_images: public can SELECT published, authenticated admin can manage
    - unlock_codes: only admin can manage
    - unlocked_collections: authenticated users can read own, admin can manage
*/

CREATE TABLE IF NOT EXISTS admin_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  slug text UNIQUE NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_per_image integer NOT NULL DEFAULT 3,
  bulk_bundle_label text NOT NULL DEFAULT '',
  bulk_bundle_price integer NOT NULL DEFAULT 0,
  is_selling boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published collections"
  ON admin_collections FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE POLICY "Anon can view published collections"
  ON admin_collections FOR SELECT
  TO anon
  USING (is_published = true);

CREATE POLICY "Service role manages collections"
  ON admin_collections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


CREATE TABLE IF NOT EXISTS collection_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES admin_collections(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  price integer NOT NULL DEFAULT 3,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE collection_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published collection images"
  ON collection_images FOR SELECT
  TO authenticated
  USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM admin_collections
      WHERE admin_collections.id = collection_images.collection_id
      AND admin_collections.is_published = true
    )
  );

CREATE POLICY "Anon can view published collection images"
  ON collection_images FOR SELECT
  TO anon
  USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM admin_collections
      WHERE admin_collections.id = collection_images.collection_id
      AND admin_collections.is_published = true
    )
  );

CREATE POLICY "Service role manages collection images"
  ON collection_images FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


CREATE TABLE IF NOT EXISTS unlock_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  collection_id uuid NOT NULL REFERENCES admin_collections(id) ON DELETE CASCADE,
  max_uses integer NOT NULL DEFAULT 0,
  times_used integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE unlock_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages unlock codes"
  ON unlock_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


CREATE TABLE IF NOT EXISTS unlocked_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES admin_collections(id) ON DELETE CASCADE,
  unlock_code_id uuid REFERENCES unlock_codes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, collection_id)
);

ALTER TABLE unlocked_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocked collections"
  ON unlocked_collections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unlocked collections"
  ON unlocked_collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages unlocked collections"
  ON unlocked_collections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
