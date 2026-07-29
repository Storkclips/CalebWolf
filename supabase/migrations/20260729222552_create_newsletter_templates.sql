/*
# Create newsletter_templates table

1. Purpose
   Stores reusable email templates for the newsletter compose feature.
   Includes 3 seeded premade templates that admins can pick from when composing.

2. New Tables
   - `newsletter_templates`
     - `id` (uuid, primary key)
     - `name` (text, not null) — display name of the template
     - `description` (text) — short description shown in the picker
     - `subject_template` (text) — default subject line, may contain {{...}} placeholders
     - `html_template` (text, not null) — the HTML body template
     - `is_premade` (boolean, default false) — true for built-in seeded templates
     - `created_at` (timestamptz, default now())
     - `updated_at` (timestamptz, default now())

3. Security
   - Enable RLS on `newsletter_templates`.
   - SELECT: admin-only (profiles.is_admin = true).
   - INSERT/UPDATE/DELETE: admin-only.
*/

CREATE TABLE IF NOT EXISTS newsletter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  subject_template text DEFAULT '',
  html_template text NOT NULL,
  is_premade boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;

-- Admin can read all templates
DROP POLICY IF EXISTS "admin_select_templates" ON newsletter_templates;
CREATE POLICY "admin_select_templates" ON newsletter_templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Admin can insert templates
DROP POLICY IF EXISTS "admin_insert_templates" ON newsletter_templates;
CREATE POLICY "admin_insert_templates" ON newsletter_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Admin can update templates
DROP POLICY IF EXISTS "admin_update_templates" ON newsletter_templates;
CREATE POLICY "admin_update_templates" ON newsletter_templates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Admin can delete templates
DROP POLICY IF EXISTS "admin_delete_templates" ON newsletter_templates;
CREATE POLICY "admin_delete_templates" ON newsletter_templates
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Seed 3 premade templates
INSERT INTO newsletter_templates (name, description, subject_template, html_template, is_premade) VALUES
(
  'New Collection Drop',
  'Announce a new photo collection with a hero image and gallery link.',
  'New Collection: {{collection_name}} is now live',
  '<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a10;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#12121a;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:40px 48px 20px;">
        <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:28px;color:#f3d27a;letter-spacing:0.02em;">New Collection</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#aaa;line-height:1.6;">{{collection_name}} is now available to explore. Here is a first look at the series.</p>
      </td></tr>
      <tr><td style="padding:0 48px;">
        <div style="background:#1a1a24;border-radius:12px;padding:48px;text-align:center;">
          <p style="margin:0;font-size:14px;color:#666;">[ Hero image goes here ]</p>
        </div>
      </td></tr>
      <tr><td style="padding:32px 48px 40px;" align="center">
        <a href="{{gallery_link}}" style="display:inline-block;background:#f3d27a;color:#0a0a10;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;">View the Collection</a>
      </td></tr>
      <tr><td style="padding:0 48px 40px;">
        <p style="margin:0;font-size:13px;color:#555;text-align:center;">You are receiving this because you subscribed to the Caleb Wolf Photography newsletter.</p>
      </td></tr>
    </table>
  </td></tr>
</table>',
  true
),
(
  'Story / Blog Feature',
  'Feature a new blog post or story with a preview and read-more link.',
  'New Story: {{story_title}}',
  '<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a10;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#12121a;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:40px 48px 12px;">
        <p style="margin:0 0 8px;font-size:12px;color:#f3d27a;text-transform:uppercase;letter-spacing:0.12em;">Latest Story</p>
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:26px;color:#fff;line-height:1.3;">{{story_title}}</h1>
        <p style="margin:0 0 28px;font-size:15px;color:#aaa;line-height:1.7;">{{story_preview}}</p>
      </td></tr>
      <tr><td style="padding:0 48px 40px;" align="center">
        <a href="{{story_link}}" style="display:inline-block;border:1px solid #f3d27a;color:#f3d27a;font-weight:600;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;">Read the Full Story</a>
      </td></tr>
      <tr><td style="padding:0 48px 40px;">
        <p style="margin:0;font-size:13px;color:#555;text-align:center;">You are receiving this because you subscribed to the Caleb Wolf Photography newsletter.</p>
      </td></tr>
    </table>
  </td></tr>
</table>',
  true
),
(
  'Simple Announcement',
  'A clean, minimal text-only announcement with a call-to-action button.',
  '{{announcement_title}}',
  '<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a10;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#12121a;border-radius:16px;">
      <tr><td style="padding:48px;">
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#fff;">{{announcement_title}}</h1>
        <p style="margin:0 0 28px;font-size:15px;color:#aaa;line-height:1.7;">{{announcement_body}}</p>
        <a href="{{cta_link}}" style="display:inline-block;background:#f3d27a;color:#0a0a10;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;">{{cta_label}}</a>
      </td></tr>
      <tr><td style="padding:0 48px 40px;">
        <p style="margin:0;font-size:13px;color:#555;text-align:center;">You are receiving this because you subscribed to the Caleb Wolf Photography newsletter.</p>
      </td></tr>
    </table>
  </td></tr>
</table>',
  true
)
ON CONFLICT DO NOTHING;
