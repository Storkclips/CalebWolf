/*
  # Fix admin profiles SELECT policy — break self-referencing recursion

  ## Problem
  The "Admins can view all profiles" policy queries the profiles table to check
  is_admin, which re-triggers the same policy, causing infinite recursion /
  permission errors.

  ## Fix
  1. Create a SECURITY DEFINER function `is_admin()` that reads the caller's
     is_admin flag by bypassing RLS entirely (runs as the function owner).
  2. Replace the recursive policy with one that calls this function.
  3. Also update the existing admin UPDATE policy to use the same function.
*/

-- Helper function that checks is_admin without triggering RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Replace the recursive SELECT policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Fix the recursive UPDATE policy too
DROP POLICY IF EXISTS "Admins can update password reset flags" ON profiles;

CREATE POLICY "Admins can update password reset flags"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
