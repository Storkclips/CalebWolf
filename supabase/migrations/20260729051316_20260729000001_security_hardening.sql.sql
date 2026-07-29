/*
  # Security hardening

  ## Purpose
  Fixes multiple security advisories: mutable search paths on SECURITY DEFINER
  functions, overly broad EXECUTE grants, a public storage listing policy, and
  a table with RLS enabled but no policies.

  ## Changes

  1. Function `public.handle_new_user` (trigger function)
     - Add `SET search_path = public` so the search path is immutable.
     - Revoke EXECUTE from `anon` and `authenticated`. This function is a
       trigger on `auth.users` and must never be callable via REST/RPC; only
       the postgres trigger owner needs to execute it.

  2. Function `public.is_admin`
     - Already has `SET search_path = public` (no change needed there).
     - Revoke EXECUTE from `anon` and `authenticated`. The function is not
       referenced by any RLS policy or frontend RPC call; admin checks read
       the `profiles.is_admin` column directly. Keeping it executable by
       anon/authenticated exposed a SECURITY DEFINER function unnecessarily.

  3. Function `public.redeem_gift_code(p_code text)`
     - Already has `SET search_path = public` (no change needed there).
     - Revoke EXECUTE from `anon`. Keep EXECUTE for `authenticated` only,
       since the frontend (GiftCodeRedeem) calls it via RPC for signed-in
       users. The function body validates `auth.uid()` internally.

  4. Storage bucket `gallery` — drop broad public SELECT policy
     - The "Public read access for gallery" policy allowed any client to
       LIST all files in the bucket via the storage API. Public bucket
       object URLs work without any SELECT policy (the storage server
       serves them directly), and the image-proxy edge function uses the
       service role key which bypasses RLS. Dropping the policy prevents
       enumeration while preserving URL access.

  5. Table `public.password_reset_codes` — add explicit deny-all policy
     - RLS was enabled with no policies (intentional: only service-role
       edge functions touch this table). Adding a documented deny-all
       policy makes the intent explicit and satisfies the scanner.

  ## Notes
  - Leaked password protection (HaveIBeenPwned) is a Supabase Auth config
    setting that cannot be toggled via SQL; it must be enabled in the
    Supabase dashboard under Authentication > Settings.
*/

-- 1. handle_new_user: immutable search path + revoke public EXECUTE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, credit_balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    25
  );

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (
    NEW.id,
    25,
    'signup_bonus',
    'Welcome bonus credits'
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- 2. is_admin: revoke public EXECUTE (not used via RPC or policies)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM authenticated;

-- 3. redeem_gift_code: revoke anon, keep authenticated
REVOKE EXECUTE ON FUNCTION public.redeem_gift_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_gift_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_gift_code(text) TO authenticated;

-- 4. Drop broad public SELECT on storage.objects for gallery bucket
DROP POLICY IF EXISTS "Public read access for gallery" ON storage.objects;

-- 5. password_reset_codes: explicit deny-all (service role bypasses RLS)
DROP POLICY IF EXISTS "deny_all_password_reset_codes" ON public.password_reset_codes;
CREATE POLICY "deny_all_password_reset_codes"
  ON public.password_reset_codes
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
