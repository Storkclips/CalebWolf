/*
  # Credit Packages, Sales & Admin Tools

  ## Summary
  Adds admin-configurable credit packages for the Buy Credits page, replacing the
  hardcoded stripe-config.ts values. Admins can set pricing, add bonus credits,
  activate sale discounts, and manually grant bonus credits to any user.

  ## New Tables

  ### `credit_packages`
  Each row represents a purchasable credit bundle shown on the Buy Credits page.
  - `id` (uuid, pk)
  - `name` — display name, e.g. "Starter Pack"
  - `description` — short tagline shown on the card
  - `credits` — number of base credits the buyer receives
  - `bonus_credits` — extra credits added on top (0 = no bonus)
  - `price_cents` — price in USD cents (e.g. 1000 = $10.00)
  - `stripe_price_id` — the Stripe Price ID to pass to checkout
  - `stripe_product_id` — the Stripe Product ID (for reference)
  - `is_featured` — highlights one package as "best value"
  - `sale_active` — when true, uses sale_price_cents instead
  - `sale_price_cents` — discounted price when sale is active
  - `sale_label` — short sale badge text, e.g. "20% off" or "Limited time"
  - `active` — show/hide on the public page
  - `sort_order` — display order
  - `created_at`, `updated_at`

  ### `admin_credit_grants`
  Log of manual bonus credits given to users by an admin.
  - `id` (uuid, pk)
  - `admin_id` (uuid, fk auth.users) — the admin who made the grant
  - `user_id` (uuid, fk auth.users) — the recipient
  - `amount` — credits granted
  - `reason` — admin note/reason
  - `created_at`

  ## Security
  - RLS enabled on both tables
  - Public (anonymous) can read active credit_packages
  - Only admins can insert/update/delete credit_packages
  - Only admins can insert admin_credit_grants
  - Admins can read all admin_credit_grants

  ## Notes
  - Seeded with the three existing Stripe products from stripe-config.ts
  - bonus_credits defaults to 0; set > 0 to show a bonus badge on the card
  - sale_active + sale_price_cents + sale_label work together for sale events
*/

-- ── credit_packages ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  credits int NOT NULL DEFAULT 0,
  bonus_credits int NOT NULL DEFAULT 0,
  price_cents int NOT NULL DEFAULT 0,
  stripe_price_id text NOT NULL DEFAULT '',
  stripe_product_id text NOT NULL DEFAULT '',
  is_featured boolean NOT NULL DEFAULT false,
  sale_active boolean NOT NULL DEFAULT false,
  sale_price_cents int NOT NULL DEFAULT 0,
  sale_label text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active credit packages"
  ON credit_packages FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can read all credit packages"
  ON credit_packages FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can insert credit packages"
  ON credit_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can update credit packages"
  ON credit_packages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can delete credit packages"
  ON credit_packages FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Seed from existing stripe-config.ts values
INSERT INTO credit_packages (name, description, credits, bonus_credits, price_cents, stripe_price_id, stripe_product_id, is_featured, sort_order) VALUES
  ('10 Credits',  'Perfect for trying out our services',   10,  0, 1000, 'price_1SxZ1nQsBFyT5mbBGOll9aOs', 'prod_TvPrfdurV2Tsfe', false, 1),
  ('50 Credits',  'Great value for regular users',         50,  0, 5000, 'price_1SxZBeQsBFyT5mbBL8zVOpbC', 'prod_TvQ1Etq59WqvsE', true,  2),
  ('100 Credits', 'Best value for power users',           100,  0, 10000, 'price_1SxZBLQsBFyT5mbBYS6E6CW1', 'prod_TvQ1JhRCDW1cxw', false, 3)
ON CONFLICT DO NOTHING;

-- ── admin_credit_grants ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_credit_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount int NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_credit_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert credit grants"
  ON admin_credit_grants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can read credit grants"
  ON admin_credit_grants FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
