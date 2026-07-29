/*
  # Fix infinite recursion in profiles RLS policies

  ## Purpose
  The previous fix replaced `is_admin()` calls in profiles RLS policies
  with inline `EXISTS (SELECT 1 FROM profiles WHERE ...)` subqueries.
  But querying `profiles` from within a `profiles` RLS policy triggers
  infinite recursion — Postgres evaluates the policy on the inner query
  too, which again references the policy, ad infinitum.

  ## Fix
  Restore EXECUTE on `is_admin()` for `authenticated`. The function is
  SECURITY DEFINER + STABLE, so it runs as the table owner and bypasses
  RLS — no recursion. Revert the two policies to call `is_admin()`.

  The security concern (exposing a SECURITY DEFINER function) is acceptable
  here because the function only reads the `is_admin` boolean for the
  current user — it cannot be used to escalate privileges or read other
  users' data.
*/

-- Restore EXECUTE on is_admin() for authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Revert profiles SELECT policy to use is_admin()
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (is_admin());

-- Revert profiles UPDATE policy to use is_admin()
DROP POLICY IF EXISTS "Admins can update password reset flags" ON public.profiles;
CREATE POLICY "Admins can update password reset flags"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
