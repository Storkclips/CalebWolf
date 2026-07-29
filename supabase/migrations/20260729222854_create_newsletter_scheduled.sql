/*
# Create newsletter_scheduled table

1. Purpose
   Stores scheduled newsletter emails that are sent at a future time.
   A pg_cron job checks every minute for due emails and sends them via Resend.

2. New Tables
   - `newsletter_scheduled`
     - `id` (uuid, primary key)
     - `subject` (text, not null) — email subject line
     - `html_body` (text, not null) — composed HTML body
     - `scheduled_for` (timestamptz, not null) — when to send
     - `status` (text, default 'pending') — pending, sent, failed, cancelled
     - `sent_at` (timestamptz) — when actually sent
     - `error_message` (text) — error details if failed
     - `recipient_count` (integer) — number of recipients when sent
     - `created_at` (timestamptz, default now())
     - `created_by` (uuid) — admin who scheduled it

3. Security
   - Enable RLS on `newsletter_scheduled`.
   - Admin-only CRUD (profiles.is_admin = true).
*/

CREATE TABLE IF NOT EXISTS newsletter_scheduled (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  html_body text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  recipient_count integer,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE newsletter_scheduled ENABLE ROW LEVEL SECURITY;

-- Admin can read scheduled emails
DROP POLICY IF EXISTS "admin_select_scheduled" ON newsletter_scheduled;
CREATE POLICY "admin_select_scheduled" ON newsletter_scheduled
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Admin can insert scheduled emails
DROP POLICY IF EXISTS "admin_insert_scheduled" ON newsletter_scheduled;
CREATE POLICY "admin_insert_scheduled" ON newsletter_scheduled
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Admin can update scheduled emails
DROP POLICY IF EXISTS "admin_update_scheduled" ON newsletter_scheduled;
CREATE POLICY "admin_update_scheduled" ON newsletter_scheduled
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Admin can delete scheduled emails
DROP POLICY IF EXISTS "admin_delete_scheduled" ON newsletter_scheduled;
CREATE POLICY "admin_delete_scheduled" ON newsletter_scheduled
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Index for the cron job to find due pending emails
CREATE INDEX IF NOT EXISTS idx_newsletter_scheduled_pending
  ON newsletter_scheduled (scheduled_for)
  WHERE status = 'pending';
