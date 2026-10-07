/*
# Expose magazine cover (reader page 0) to the public

1. Plain-English explanation
   - The previous security fix locked all pre-rendered magazine page images
     away from signed-out visitors. That included page 0 — the front cover —
     so the magazine catalog, homepage spotlights, and unlock cards lost
     their high-resolution covers and fell back to the low-resolution
     editor thumbnail (or a broken image).
   - Now signed-out visitors can read ONLY page 0 (the cover) of published
     magazines. Every inner page stays protected by the same rules as
     before: free promotion, purchase, subscription, grant, or admin.

2. Modified tables (policies only, no data changes)
   - `magazine_reader_pages`: the public SELECT policy gains one extra
     branch — rows with page_index = 0 whose parent magazine is published
     are readable by everyone. All other rows keep the full access checks.

3. Security changes
   - Only the front cover is exposed. Inner pages (page_index >= 1) remain
     gated. Draft magazines' covers remain admin-only.
*/

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
            magazine_reader_pages.page_index = 0
            OR EXISTS (
              SELECT 1
              FROM magazine_promotions p
              WHERE p.magazine_id = m.id
                AND p.free_access = true
                AND p.active = true
                AND p.starts_at <= now()
                AND (p.ends_at IS NULL OR p.ends_at > now())
            )
            OR EXISTS (
              SELECT 1
              FROM magazine_entitlements e
              WHERE e.magazine_id = m.id
                AND e.user_id = auth.uid()
                AND e.revoked_at IS NULL
            )
            OR EXISTS (
              SELECT 1
              FROM magazine_subscriptions s
              WHERE s.user_id = auth.uid()
                AND s.status IN ('active', 'trialing')
                AND (s.current_period_end IS NULL OR s.current_period_end > now())
            )
            OR EXISTS (
              SELECT 1
              FROM magazine_access_grants g
              WHERE g.magazine_id = m.id
                AND (
                  g.user_id = auth.uid()
                  OR lower(g.email) = lower(auth_user_email())
                )
                AND (g.expires_at IS NULL OR g.expires_at > now())
            )
            OR EXISTS (
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
);