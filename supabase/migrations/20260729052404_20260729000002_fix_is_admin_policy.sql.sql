/*
  # Fix is_admin() permission denied error

  ## Purpose
  The previous security hardening migration revoked EXECUTE on `is_admin()`
  from `authenticated`, but two RLS policies on `profiles` call `is_admin()`
  directly. This caused "permission denied for function is_admin" errors,
  breaking profile reads (and by extension the admin dashboard and credit
  balance display).

  ## Fix
  Rewrite the two policies that call `is_admin()` to use an inline
  `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)`
  check instead — the same pattern used by every other admin policy in the
  schema. Once no policy references the function, the EXECUTE revocation is
  safe and the scanner concern stays resolved.

  ## Policies changed
  1. "Admins can view all profiles" (SELECT) — was `is_admin()`, now inline.
  2. "Admins can update password reset flags" (UPDATE) — was `is_admin()`,
     now inline.
*/

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update password reset flags" ON public.profiles;
CREATE POLICY "Admins can update password reset flags"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );
