/*
# Fix magazine editor admin access checks

1. Purpose
- Prevent the magazine editor from failing when an authenticated administrator loads pages.
- Move the administrator lookup behind a controlled database function so profile row policies do not recursively query protected user data.

2. Database Changes
- Adds `public.is_current_user_admin()` as a SECURITY DEFINER helper.
- Replaces administrator policies on `magazines` and `magazine_pages` to use the helper.
- No tables, columns, or existing artwork data are removed or changed.

3. Security
- The helper only checks the current authenticated user's profile using `auth.uid()`.
- The helper has a fixed `search_path`.
- Anonymous users cannot execute the helper.
- Public published-magazine read access remains unchanged.

4. Important Notes
- This only changes how administrator access is verified; it does not make draft content public.
*/

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE public.profiles.id = auth.uid()
      AND public.profiles.is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins can select magazines" ON public.magazines;
CREATE POLICY "Admins can select magazines"
ON public.magazines FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can insert magazines" ON public.magazines;
CREATE POLICY "Admins can insert magazines"
ON public.magazines FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update magazines" ON public.magazines;
CREATE POLICY "Admins can update magazines"
ON public.magazines FOR UPDATE
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete magazines" ON public.magazines;
CREATE POLICY "Admins can delete magazines"
ON public.magazines FOR DELETE
TO authenticated
USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can select magazine_pages" ON public.magazine_pages;
CREATE POLICY "Admins can select magazine_pages"
ON public.magazine_pages FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can insert magazine_pages" ON public.magazine_pages;
CREATE POLICY "Admins can insert magazine_pages"
ON public.magazine_pages FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update magazine_pages" ON public.magazine_pages;
CREATE POLICY "Admins can update magazine_pages"
ON public.magazine_pages FOR UPDATE
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete magazine_pages" ON public.magazine_pages;
CREATE POLICY "Admins can delete magazine_pages"
ON public.magazine_pages FOR DELETE
TO authenticated
USING (public.is_current_user_admin());