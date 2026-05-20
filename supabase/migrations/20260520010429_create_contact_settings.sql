/*
  # Create contact_settings table

  ## Purpose
  Stores site-wide admin settings, starting with the admin notification email
  for contact form submissions.

  ## Tables
  - `contact_settings`
    - `id` (uuid, pk)
    - `admin_email` (text) — email address to receive contact form notifications
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Only admins (via service role in edge functions) can read/write this table
  - A single row is seeded with a default value
*/

CREATE TABLE IF NOT EXISTS contact_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL DEFAULT 'admin@calebwolfphotography.com',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read contact settings"
  ON contact_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update contact settings"
  ON contact_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Seed a single default row
INSERT INTO contact_settings (admin_email)
VALUES ('admin@calebwolfphotography.com')
ON CONFLICT DO NOTHING;
