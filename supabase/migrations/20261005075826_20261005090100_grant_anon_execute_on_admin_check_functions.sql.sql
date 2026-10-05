-- The public "can read published magazine pages" policy calls
-- is_current_user_admin() and auth_user_email() inside its USING clause.
-- Those functions had EXECUTE revoked from PUBLIC, so every anon SELECT on
-- magazine_pages failed with "permission denied for function
-- is_current_user_admin" and the magazine reader showed nothing.
-- Both functions are read-only checks keyed on auth.uid() and safe to expose.
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_email() TO anon, authenticated;
