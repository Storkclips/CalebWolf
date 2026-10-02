/*
# Create magazine publishing and access platform

1. New Tables
- `magazines` stores magazine titles, cover imagery, pricing, publication status, and the editable page count.
- `magazine_pages` stores each page's ordered canvas dimensions, background, and positioned text/image/shape elements.
- `magazine_access_grants` records admin-granted digital access by user or email, including optional expiry.
- `magazine_promotions` stores percentage discounts and limited free-access campaigns.
- `magazine_subscriptions` stores a user's magazine subscription preference and lifecycle.
- `magazine_orders` stores digital and physical magazine purchase records.

2. Security
- Every table has row-level security enabled.
- Published magazines and their pages are publicly readable only when the magazine is published.
- Administrators can manage magazine content, pricing, promotions, grants, and orders.
- Signed-in users can read only their own grants, subscriptions, and orders.
- Grant access is never decided by frontend state alone; policies re-check the authenticated user.

3. Important Notes
- Magazine pages use JSONB elements so the editor can evolve without losing existing artwork.
- The print canvas follows the supplied 8.5 x 11 inch perfect-bound template with 0.12 inch bleed and 0.2 inch safety guidance represented in page metadata.
- No existing tables or columns are removed or changed.
*/

CREATE TABLE IF NOT EXISTS public.magazines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  cover_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden')),
  digital_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (digital_price >= 0),
  physical_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (physical_price >= 0),
  subscription_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (subscription_price >= 0),
  page_count integer NOT NULL DEFAULT 4 CHECK (page_count >= 4),
  format text NOT NULL DEFAULT '8.5x11-perfect-bound',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.magazine_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  magazine_id uuid NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
  page_number integer NOT NULL CHECK (page_number >= 1),
  page_kind text NOT NULL DEFAULT 'inner' CHECK (page_kind IN ('cover', 'inside-cover', 'inner')),
  width_inches numeric(5,2) NOT NULL DEFAULT 8.74,
  height_inches numeric(5,2) NOT NULL DEFAULT 11.24,
  bleed_inches numeric(4,2) NOT NULL DEFAULT 0.12,
  safety_inches numeric(4,2) NOT NULL DEFAULT 0.20,
  background_color text NOT NULL DEFAULT '#ffffff',
  elements jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (magazine_id, page_number)
);

CREATE TABLE IF NOT EXISTS public.magazine_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  magazine_id uuid NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  notified_at timestamptz,
  CHECK (user_id IS NOT NULL OR email IS NOT NULL),
  CHECK (email IS NULL OR position('@' IN email) > 1)
);

CREATE TABLE IF NOT EXISTS public.magazine_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  magazine_id uuid REFERENCES public.magazines(id) ON DELETE CASCADE,
  name text NOT NULL,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  free_access boolean NOT NULL DEFAULT false,
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.magazine_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  magazine_id uuid REFERENCES public.magazines(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.magazine_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  magazine_id uuid NOT NULL REFERENCES public.magazines(id) ON DELETE RESTRICT,
  order_type text NOT NULL CHECK (order_type IN ('digital', 'physical')),
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'fulfilled', 'cancelled')),
  stripe_session_id text,
  shipping_address jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS magazines_status_idx ON public.magazines(status);
CREATE INDEX IF NOT EXISTS magazine_pages_magazine_idx ON public.magazine_pages(magazine_id, page_number);
CREATE INDEX IF NOT EXISTS magazine_grants_user_idx ON public.magazine_access_grants(user_id);
CREATE INDEX IF NOT EXISTS magazine_grants_email_idx ON public.magazine_access_grants(lower(email));
CREATE INDEX IF NOT EXISTS magazine_orders_user_idx ON public.magazine_orders(user_id);

ALTER TABLE public.magazines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published magazines" ON public.magazines;
CREATE POLICY "Public can read published magazines" ON public.magazines FOR SELECT TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS "Admins can manage magazines" ON public.magazines;
CREATE POLICY "Admins can manage magazines" ON public.magazines FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "Public can read published magazine pages" ON public.magazine_pages;
CREATE POLICY "Public can read published magazine pages" ON public.magazine_pages FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM magazines m WHERE m.id = magazine_pages.magazine_id AND m.status = 'published'));
DROP POLICY IF EXISTS "Admins can manage magazine pages" ON public.magazine_pages;
CREATE POLICY "Admins can manage magazine pages" ON public.magazine_pages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "Users can read their magazine grants" ON public.magazine_access_grants;
CREATE POLICY "Users can read their magazine grants" ON public.magazine_access_grants FOR SELECT TO authenticated USING (user_id = auth.uid() OR lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));
DROP POLICY IF EXISTS "Admins can manage magazine grants" ON public.magazine_access_grants;
CREATE POLICY "Admins can manage magazine grants" ON public.magazine_access_grants FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "Public can read active magazine promotions" ON public.magazine_promotions;
CREATE POLICY "Public can read active magazine promotions" ON public.magazine_promotions FOR SELECT TO anon, authenticated USING (active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));
DROP POLICY IF EXISTS "Admins can manage magazine promotions" ON public.magazine_promotions;
CREATE POLICY "Admins can manage magazine promotions" ON public.magazine_promotions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "Users can read own magazine subscriptions" ON public.magazine_subscriptions;
CREATE POLICY "Users can read own magazine subscriptions" ON public.magazine_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage magazine subscriptions" ON public.magazine_subscriptions;
CREATE POLICY "Admins can manage magazine subscriptions" ON public.magazine_subscriptions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "Users can read own magazine orders" ON public.magazine_orders;
CREATE POLICY "Users can read own magazine orders" ON public.magazine_orders FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage magazine orders" ON public.magazine_orders;
CREATE POLICY "Admins can manage magazine orders" ON public.magazine_orders FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));
