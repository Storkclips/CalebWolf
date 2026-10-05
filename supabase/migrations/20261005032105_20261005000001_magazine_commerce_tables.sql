/*
# Magazine commerce: entitlements, settings, subscriptions billing fields, and autosave

1. New Tables
- `magazine_entitlements` — permanent per-user per-magazine access records with source tracking
  (subscription_release, one_time_purchase, admin_grant), Stripe identifiers, and revocation support.
- `magazine_settings` — singleton admin-controlled settings for the magazine subscription offering,
  Stripe product/price IDs, homepage widget copy, and feature flags.

2. Modified Tables
- `magazines` — adds `autosave_json` (JSONB working draft) and `autosaved_at` (timestamp) for
  real-time autosave without creating version noise.
- `magazine_subscriptions` — adds Stripe billing detail columns: `stripe_customer_id`,
  `stripe_price_id`, `current_period_start`, `current_period_end`, `cancel_at_period_end`,
  `canceled_at`. Also adds a unique index on `user_id` to support upserts.

3. Security
- RLS enabled on all new tables.
- Users can read their own entitlements and cannot write them directly (server only via service role).
- magazine_settings is readable by all; writable only by admins.
- Admins have full access to all tables via the existing is_current_user_admin() helper.

4. Important Notes
- magazine_entitlements has a UNIQUE (user_id, magazine_id) constraint — upserts are idempotent.
- magazine_settings is a singleton; only one row is expected.
- autosave_json stores the full pages array as JSON so the editor can recover from browser crashes.
*/

-- ─── Extend magazines with autosave fields ───────────────────────────────────
ALTER TABLE public.magazines
  ADD COLUMN IF NOT EXISTS autosave_json jsonb,
  ADD COLUMN IF NOT EXISTS autosaved_at timestamptz;

-- ─── Extend magazine_subscriptions with Stripe billing detail ─────────────────
ALTER TABLE public.magazine_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS magazine_subscriptions_user_id_idx
  ON public.magazine_subscriptions(user_id);

-- ─── magazine_entitlements ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.magazine_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  magazine_id uuid NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('subscription_release', 'one_time_purchase', 'admin_grant')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, magazine_id)
);

ALTER TABLE public.magazine_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own entitlements" ON public.magazine_entitlements;
CREATE POLICY "Users can read own entitlements"
  ON public.magazine_entitlements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND revoked_at IS NULL);

DROP POLICY IF EXISTS "Admins can select magazine_entitlements" ON public.magazine_entitlements;
CREATE POLICY "Admins can select magazine_entitlements"
  ON public.magazine_entitlements FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can insert magazine_entitlements" ON public.magazine_entitlements;
CREATE POLICY "Admins can insert magazine_entitlements"
  ON public.magazine_entitlements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update magazine_entitlements" ON public.magazine_entitlements;
CREATE POLICY "Admins can update magazine_entitlements"
  ON public.magazine_entitlements FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete magazine_entitlements" ON public.magazine_entitlements;
CREATE POLICY "Admins can delete magazine_entitlements"
  ON public.magazine_entitlements FOR DELETE
  TO authenticated
  USING (public.is_current_user_admin());

-- ─── magazine_settings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.magazine_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_enabled boolean NOT NULL DEFAULT false,
  subscription_product_id text,
  subscription_price_id text,
  subscription_price_display text NOT NULL DEFAULT '0.00',
  subscription_currency text NOT NULL DEFAULT 'usd',
  subscription_interval text NOT NULL DEFAULT 'month',
  trial_days integer NOT NULL DEFAULT 0,
  promotion_codes_enabled boolean NOT NULL DEFAULT false,
  homepage_widget_enabled boolean NOT NULL DEFAULT false,
  homepage_widget_title text NOT NULL DEFAULT 'Read every issue.',
  homepage_widget_copy text NOT NULL DEFAULT 'Subscribe to access the full magazine library. New issues released during your subscription are permanently added to your collection.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.magazine_settings ENABLE ROW LEVEL SECURITY;

-- Seed a default row so apps always have something to read
INSERT INTO public.magazine_settings DEFAULT VALUES
  ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Public can read magazine settings" ON public.magazine_settings;
CREATE POLICY "Public can read magazine settings"
  ON public.magazine_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update magazine settings" ON public.magazine_settings;
CREATE POLICY "Admins can update magazine settings"
  ON public.magazine_settings FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- ─── Update magazine_pages access to also accept entitlements ─────────────────
DROP POLICY IF EXISTS "Public can read published magazine pages" ON public.magazine_pages;
CREATE POLICY "Public can read published magazine pages"
  ON public.magazine_pages FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.magazines m
      WHERE m.id = magazine_pages.magazine_id
        AND m.status = 'published'
        AND (
          m.digital_price = 0
          OR public.is_current_user_admin()
          OR EXISTS (
            SELECT 1 FROM public.magazine_entitlements e
            WHERE e.magazine_id = m.id
              AND e.user_id = auth.uid()
              AND e.revoked_at IS NULL
          )
          OR EXISTS (
            SELECT 1 FROM public.magazine_subscriptions s
            WHERE s.user_id = auth.uid()
              AND s.status IN ('active', 'trialing')
              AND (s.current_period_end IS NULL OR s.current_period_end > now())
          )
          OR EXISTS (
            SELECT 1 FROM public.magazine_access_grants g
            WHERE g.magazine_id = m.id
              AND (g.user_id = auth.uid() OR lower(g.email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())))
              AND (g.expires_at IS NULL OR g.expires_at > now())
          )
          OR EXISTS (
            SELECT 1 FROM public.magazine_orders o
            WHERE o.magazine_id = m.id
              AND o.user_id = auth.uid()
              AND o.order_type = 'digital'
              AND o.status IN ('paid', 'fulfilled')
          )
        )
    )
  );
