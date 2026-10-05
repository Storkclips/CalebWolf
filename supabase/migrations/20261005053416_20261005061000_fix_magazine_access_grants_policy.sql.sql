/*
# Fix magazine_access_grants policy — auth.users permission denied

## Problem
The "Users can read their magazine grants" SELECT policy on
`magazine_access_grants` references `auth.users` directly:

    (SELECT users.email FROM auth.users WHERE users.id = auth.uid())

This causes "permission denied for table users" when the authenticated
role evaluates this policy. The public SELECT policy on `magazine_pages`
references `magazine_access_grants` in a subquery, so evaluating the pages
policy cascades into evaluating the grants policy, which hits auth.users.

## Fix
Replace the `auth.users` subquery with the `auth_user_email()` SECURITY
DEFINER function created in the previous migration. Also update the admin
policies on `magazine_access_grants` to use `is_current_user_admin()`
instead of the inline profiles subquery, for consistency and to avoid
potential recursion issues.

## Security
- No logic change — only the email lookup mechanism changes.
- `auth_user_email()` is SECURITY DEFINER, already granted to authenticated.
*/

DROP POLICY IF EXISTS "Users can read their magazine grants" ON public.magazine_access_grants;
CREATE POLICY "Users can read their magazine grants"
ON public.magazine_access_grants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR lower(email) = lower(auth_user_email())
);

DROP POLICY IF EXISTS "Admins can select magazine_access_grants" ON public.magazine_access_grants;
CREATE POLICY "Admins can select magazine_access_grants"
ON public.magazine_access_grants
FOR SELECT
TO authenticated
USING (is_current_user_admin());

DROP POLICY IF EXISTS "Admins can insert magazine_access_grants" ON public.magazine_access_grants;
CREATE POLICY "Admins can insert magazine_access_grants"
ON public.magazine_access_grants
FOR INSERT
TO authenticated
WITH CHECK (is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update magazine_access_grants" ON public.magazine_access_grants;
CREATE POLICY "Admins can update magazine_access_grants"
ON public.magazine_access_grants
FOR UPDATE
TO authenticated
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete magazine_access_grants" ON public.magazine_access_grants;
CREATE POLICY "Admins can delete magazine_access_grants"
ON public.magazine_access_grants
FOR DELETE
TO authenticated
USING (is_current_user_admin());
