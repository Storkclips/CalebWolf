/*
# Gate magazine free access by promotion, not by zero price

1. Plain-English explanation
   - Before, any magazine with a digital price of $0 was automatically free
     for everyone. That meant the admin "Mark as free" toggle appeared to do
     nothing when unmarking: the magazine stayed free because its price was
     still zero.
   - Now free-for-everyone access is controlled ONLY by the active
     "free for everyone" promotion (the toggle). Unmarking the toggle locks
     the magazine again, and normal rules apply (buy the issue or subscribe).
   - Magazines that should be free must be marked with the toggle.

2. Modified tables (policies only, no data changes)
   - `magazine_pages`: public read policy no longer treats
     `digital_price = 0` as free. Free access now requires an active
     free-access promotion, an entitlement, an active subscription, an
     access grant, a paid digital order, or admin status.
   - `magazine_reader_pages`: public read policy was previously open to all
     published magazines' pages. It now applies the same access rules as
     `magazine_pages`, so pre-rendered reader images are protected too.

3. Security changes
   - Both public SELECT policies now check `magazine_promotions` for an
     active free-access campaign (`free_access = true`, `active = true`,
     started, not ended).
   - Admin access continues via `is_current_user_admin()`.
   - No privileges are widened; the reader-pages policy is tightened.

4. Important notes
   - Run once; both statements drop and recreate their policies idempotently.
   - Any magazine previously relying on "price 0 = free" must be marked free
     with the admin toggle to stay publicly readable.
*/

DROP POLICY IF EXISTS "Public can read published magazine pages" ON public.magazine_pages;

CREATE POLICY "Public can read published magazine pages"
ON public.magazine_pages
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM magazines m
    WHERE m.id = magazine_pages.magazine_id
      AND m.status = 'published'
      AND (
        is_current_user_admin()
        OR (
          EXISTS (
            SELECT 1
            FROM magazine_promotions p
            WHERE p.magazine_id = m.id
              AND p.free_access = true
              AND p.active = true
              AND p.starts_at <= now()
              AND (p.ends_at IS NULL OR p.ends_at > now())
          )
        )
        OR (
          EXISTS (
            SELECT 1
            FROM magazine_entitlements e
            WHERE e.magazine_id = m.id
              AND e.user_id = auth.uid()
              AND e.revoked_at IS NULL
          )
        )
        OR (
          EXISTS (
            SELECT 1
            FROM magazine_subscriptions s
            WHERE s.user_id = auth.uid()
              AND s.status IN ('active', 'trialing')
              AND (s.current_period_end IS NULL OR s.current_period_end > now())
          )
        )
        OR (
          EXISTS (
            SELECT 1
            FROM magazine_access_grants g
            WHERE g.magazine_id = m.id
              AND (
                g.user_id = auth.uid()
                OR lower(g.email) = lower(auth_user_email())
              )
              AND (g.expires_at IS NULL OR g.expires_at > now())
          )
        )
        OR (
          EXISTS (
            SELECT 1
            FROM magazine_orders o
            WHERE o.magazine_id = m.id
              AND o.user_id = auth.uid()
              AND o.order_type = 'digital'
              AND o.status IN ('paid', 'fulfilled')
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "Public can read published magazine reader pages" ON magazine_reader_pages;

CREATE POLICY "Public can read published magazine reader pages"
ON magazine_reader_pages
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM magazines m
    WHERE m.id = magazine_reader_pages.magazine_id
      AND (
        is_current_user_admin()
        OR (
          m.status = 'published'
          AND (
            EXISTS (
              SELECT 1
              FROM magazine_promotions p
              WHERE p.magazine_id = m.id
                AND p.free_access = true
                AND p.active = true
                AND p.starts_at <= now()
                AND (p.ends_at IS NULL OR p.ends_at > now())
            )
            OR (
              EXISTS (
                SELECT 1
                FROM magazine_entitlements e
                WHERE e.magazine_id = m.id
                  AND e.user_id = auth.uid()
                  AND e.revoked_at IS NULL
              )
            )
            OR (
              EXISTS (
                SELECT 1
                FROM magazine_subscriptions s
                WHERE s.user_id = auth.uid()
                  AND s.status IN ('active', 'trialing')
                  AND (s.current_period_end IS NULL OR s.current_period_end > now())
              )
            )
            OR (
              EXISTS (
                SELECT 1
                FROM magazine_access_grants g
                WHERE g.magazine_id = m.id
                  AND (
                    g.user_id = auth.uid()
                    OR lower(g.email) = lower(auth_user_email())
                  )
                  AND (g.expires_at IS NULL OR g.expires_at > now())
              )
            )
            OR (
              EXISTS (
                SELECT 1
                FROM magazine_orders o
                WHERE o.magazine_id = m.id
                  AND o.user_id = auth.uid()
                  AND o.order_type = 'digital'
                  AND o.status IN ('paid', 'fulfilled')
              )
            )
          )
        )
      )
  )
);