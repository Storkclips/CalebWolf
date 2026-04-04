/*
  # Pricing, Print Sizes, and Print Orders

  ## New Tables

  ### `session_pricing`
  Stores editable session/service pricing shown on the menu board pricing page.
  - `id` (uuid, pk)
  - `category` — e.g. "General Photography", "Business Photography Plan"
  - `label` — service name, e.g. "Professional Headshot"
  - `price_display` — display string, e.g. "$45" or "$150/mo"
  - `sort_order` — for ordering within a category
  - `notes` — optional footnote text
  - `active` — show/hide toggle

  ### `print_sizes`
  Admin-configurable print sizes with base price and additional print price.
  - `id` (uuid, pk)
  - `category` — e.g. "Small Prints", "Professional Print"
  - `label` — e.g. "Card (2.1\" x 3.4\")"
  - `description` — optional extra info
  - `base_price` (numeric)
  - `additional_price` (numeric) — price per extra print
  - `sort_order`
  - `active`

  ### `print_orders`
  Orders placed by users for individual photo prints.
  - `id` (uuid, pk)
  - `user_id` (uuid, fk auth.users)
  - `image_id` — references gallery image (text, flexible)
  - `image_title`
  - `image_url`
  - `print_size_id` (uuid, fk print_sizes)
  - `print_size_label`
  - `quantity` (int)
  - `unit_price` (numeric)
  - `total_price` (numeric)
  - `status` — pending / confirmed / printed / shipped / delivered / cancelled
  - `customer_name`
  - `customer_email`
  - `shipping_address` (text)
  - `notes`
  - `created_at`
  - `updated_at`

  ### `digital_image_purchases`
  Records when a user buys a digital image at a fixed price (separate from credits).
  - `id` (uuid, pk)
  - `user_id` (uuid, fk auth.users)
  - `image_id`
  - `image_title`
  - `image_url`
  - `price` (numeric)
  - `created_at`

  ## Security
  - RLS enabled on all tables
  - Admins (checked via profiles.is_admin) can do everything
  - Public can read active session_pricing and print_sizes
  - Authenticated users can read/insert their own orders and purchases
*/

-- ── session_pricing ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS session_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  price_display text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE session_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active session pricing"
  ON session_pricing FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can insert session pricing"
  ON session_pricing FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can update session pricing"
  ON session_pricing FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can delete session pricing"
  ON session_pricing FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- seed default data
INSERT INTO session_pricing (category, label, price_display, sort_order, notes) VALUES
  ('General Photography', 'Professional Headshot', '$45', 1, ''),
  ('General Photography', 'Family Session', '$150', 2, ''),
  ('General Photography', 'Couples Shoot', '$65', 3, ''),
  ('General Photography', 'Pets Session', '$125', 4, 'All prices may vary depending travel and other expenses. *Non-profit plans are volunteer positions that is exempt from paying for Event Coverage, reach out to inquire for availability'),
  ('Business Photography Plan', '5-10 Photos', '$150/mo', 1, ''),
  ('Business Photography Plan', '25-30 Photos', '$450/mo', 2, ''),
  ('Business Photography Plan', '40+ Photos', '$550/mo', 3, ''),
  ('Business Photography Plan', 'Non-Profit', '$FREE*', 4, 'All prices may be negotiated depending on various factors like travel and other expenses. Downtown Salem, Oregon, businesses only, unless specific plans are negotiated! *Non-profit plans are volunteer positions that is exempt from paying for Event Coverage, reach out to inquire for availability.')
ON CONFLICT DO NOTHING;

-- ── print_sizes ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS print_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  additional_price numeric(10,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE print_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active print sizes"
  ON print_sizes FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can insert print sizes"
  ON print_sizes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can update print sizes"
  ON print_sizes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can delete print sizes"
  ON print_sizes FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- seed default print sizes
INSERT INTO print_sizes (category, label, description, base_price, additional_price, sort_order) VALUES
  ('Small Prints', 'Card (2.1" x 3.4")', 'Card sized print', 15.50, 2.50, 1),
  ('Small Prints', 'L Sized (3.5" x 4.7")', 'L sized print', 15.50, 2.50, 2),
  ('Small Prints', 'Postcard (4" x 6")', 'Postcard sized print', 15.50, 2.50, 3),
  ('Professional Print', '8.5" x 11"', 'Professional print, 3-5 business days', 25.00, 10.50, 1)
ON CONFLICT DO NOTHING;

-- ── print_orders ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS print_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  image_id text NOT NULL DEFAULT '',
  image_title text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  print_size_id uuid REFERENCES print_sizes(id) ON DELETE SET NULL,
  print_size_label text NOT NULL DEFAULT '',
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  shipping_address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE print_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own print orders"
  ON print_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own print orders"
  ON print_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all print orders"
  ON print_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can update print orders"
  ON print_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ── digital_image_purchases ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS digital_image_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  image_id text NOT NULL DEFAULT '',
  image_title text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE digital_image_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own digital purchases"
  ON digital_image_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own digital purchases"
  ON digital_image_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all digital purchases"
  ON digital_image_purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
