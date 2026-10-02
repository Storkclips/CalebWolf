/*
# Gate paid magazine pages

1. Security Changes
- Public visitors can read pages for free published magazines.
- Paid published magazine pages require the signed-in user to have a matching active access grant or paid order.
- Administrators retain access for editing and review.

2. Important Notes
- The magazine cover/listing remains discoverable, but paid artwork is not exposed by the page table to unauthorised callers.
*/

DROP POLICY IF EXISTS "Public can read published magazine pages" ON public.magazine_pages;
CREATE POLICY "Public can read published magazine pages" ON public.magazine_pages FOR SELECT TO anon, authenticated USING (
  EXISTS (
    SELECT 1 FROM magazines m
    WHERE m.id = magazine_pages.magazine_id
      AND m.status = 'published'
      AND (
        m.digital_price = 0
        OR EXISTS (
          SELECT 1 FROM magazine_access_grants g
          WHERE g.magazine_id = m.id
            AND (g.user_id = auth.uid() OR lower(g.email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())))
            AND (g.expires_at IS NULL OR g.expires_at > now())
        )
        OR EXISTS (
          SELECT 1 FROM magazine_orders o
          WHERE o.magazine_id = m.id AND o.user_id = auth.uid() AND o.order_type = 'digital' AND o.status IN ('paid', 'fulfilled')
        )
      )
  )
);
