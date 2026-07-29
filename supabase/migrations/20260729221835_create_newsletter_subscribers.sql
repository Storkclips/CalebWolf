/*
# Create newsletter_subscribers table

1. Purpose
   Stores email addresses of visitors who subscribe via the homepage newsletter form.
   Admins can view the subscriber list, see a count, and send emails via Resend.

2. New Tables
   - `newsletter_subscribers`
     - `id` (uuid, primary key)
     - `email` (text, unique, not null) — the subscriber's email
     - `name` (text, nullable) — optional display name
     - `subscribed_at` (timestamptz, default now()) — when they subscribed
     - `unsubscribed` (boolean, default false) — soft-unsubscribe flag
     - `unsubscribed_at` (timestamptz, nullable) — when they unsubscribed

3. Security
   - Enable RLS on `newsletter_subscribers`.
   - INSERT: anyone (anon + authenticated) can subscribe — public signup form.
   - SELECT/UPDATE/DELETE: admin-only (profiles.is_admin = true).
*/

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text DEFAULT '',
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed boolean DEFAULT false,
  unsubscribed_at timestamptz
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Public can insert (subscribe)
DROP POLICY IF EXISTS "anon_insert_subscribers" ON newsletter_subscribers;
CREATE POLICY "anon_insert_subscribers" ON newsletter_subscribers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admin can read all subscribers
DROP POLICY IF EXISTS "admin_select_subscribers" ON newsletter_subscribers;
CREATE POLICY "admin_select_subscribers" ON newsletter_subscribers
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Admin can update subscribers (e.g. mark unsubscribed)
DROP POLICY IF EXISTS "admin_update_subscribers" ON newsletter_subscribers;
CREATE POLICY "admin_update_subscribers" ON newsletter_subscribers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Admin can delete subscribers
DROP POLICY IF EXISTS "admin_delete_subscribers" ON newsletter_subscribers;
CREATE POLICY "admin_delete_subscribers" ON newsletter_subscribers
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
