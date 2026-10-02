/*
# Split magazine admin policies by action

1. Security Changes
- Replaces broad admin ALL policies on magazine tables with four explicit CRUD policies per table.
- Keeps the same admin check through the current authenticated profile's `is_admin` flag.
- Public and user-owned read policies remain unchanged.

2. Important Notes
- No data is removed or modified.
- Explicit policies make each allowed action auditable and deny unintended operations by default.
*/

DROP POLICY IF EXISTS "Admins can manage magazines" ON public.magazines;
DROP POLICY IF EXISTS "Admins can manage magazine pages" ON public.magazine_pages;
DROP POLICY IF EXISTS "Admins can manage magazine grants" ON public.magazine_access_grants;
DROP POLICY IF EXISTS "Admins can manage magazine promotions" ON public.magazine_promotions;
DROP POLICY IF EXISTS "Admins can manage magazine subscriptions" ON public.magazine_subscriptions;
DROP POLICY IF EXISTS "Admins can manage magazine orders" ON public.magazine_orders;

DO $$
DECLARE
  table_name text;
  policy_prefix text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['magazines','magazine_pages','magazine_access_grants','magazine_promotions','magazine_subscriptions','magazine_orders'] LOOP
    policy_prefix := initcap(replace(table_name, '_', ' '));
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))', 'Admins can insert ' || table_name, table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))', 'Admins can update ' || table_name, table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))', 'Admins can delete ' || table_name, table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))', 'Admins can select ' || table_name, table_name);
  END LOOP;
END $$;
