/*
# Fix magazine_pages public SELECT policy — auth.users permission denied

## Problem
The public SELECT policy on `magazine_pages` references `auth.users` directly
in a subquery to resolve email-based access grants:

    (SELECT users.email FROM auth.users WHERE users.id = auth.uid())

The `authenticated` role does not have SELECT permission on `auth.users`,
so when an authenticated admin performs an upsert (which internally runs a
SELECT to detect conflicts), Postgres evaluates the SELECT policy and hits
"permission denied for table users".

## Fix
1. Create a SECURITY DEFINER function `auth_user_email()` that safely
   returns the current user's email without requiring direct table access.
2. Replace the `auth.users` subquery in the public SELECT policy with
   `auth_user_email()`.
3. Drop and recreate the policy to pick up the change.

## Security
- `auth_user_email()` is SECURITY DEFINER, search_path = public, revoked
  from PUBLIC/anon, granted to authenticated — same pattern as
  `is_current_user_admin()`.
- The policy logic is unchanged; only the email lookup mechanism changes.
*/

CREATE OR REPLACE FUNCTION public.auth_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT email FROM auth.users WHERE id = auth.uid();
$function$;

REVOKE EXECUTE ON FUNCTION public.auth_user_email() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_user_email() FROM anon;
GRANT EXECUTE ON FUNCTION public.auth_user_email() TO authenticated;

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
        m.digital_price = 0
        OR is_current_user_admin()
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
