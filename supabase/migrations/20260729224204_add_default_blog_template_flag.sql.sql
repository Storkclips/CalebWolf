/*
# Add default blog newsletter template flag

1. Purpose
   Adds an `is_default_blog` boolean to `newsletter_templates` so the blog
   editor can look up which template to use when auto-sending a newsletter
   on publish. Seeds a newsroom-style default template with a hero image
   and article preview that feels like a real news organization sent it.

2. Modified Tables
   - `newsletter_templates`
     - `is_default_blog` (boolean, default false) — marks the template
       used by the blog editor's auto-send-on-publish feature.

3. Data
   - Inserts a new premade template "Newsroom Article" with a hero image
     slot, headline, byline, article preview text, and read-more button.
   - Sets `is_default_blog = true` on that template.
   - Sets `is_default_blog = false` on all other templates.

4. Security
   - No new tables. Existing RLS policies on `newsletter_templates` already
     cover admin CRUD; no policy changes needed.
*/

ALTER TABLE newsletter_templates
  ADD COLUMN IF NOT EXISTS is_default_blog boolean DEFAULT false;

-- Insert the newsroom-style default template
INSERT INTO newsletter_templates (name, description, subject_template, html_template, is_premade, is_default_blog)
VALUES (
  'Newsroom Article',
  'News-organization style email with a hero image, headline, byline, and article preview. Used by default when publishing a blog post.',
  '{{post_title}}',
  '<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a10;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#12121a;border-radius:16px;overflow:hidden;">
      <!-- Masthead -->
      <tr><td style="padding:24px 40px;border-bottom:1px solid #2a2a3a;">
        <p style="margin:0;font-family:Georgia,serif;font-size:18px;color:#f3d27a;letter-spacing:0.08em;text-transform:uppercase;">Caleb Wolf Photography</p>
      </td></tr>
      <!-- Hero image -->
      <tr><td style="padding:0;">
        <img src="{{hero_image}}" alt="" width="600" style="display:block;width:100%;max-width:600px;" />
      </td></tr>
      <!-- Headline + byline -->
      <tr><td style="padding:32px 40px 8px;">
        <p style="margin:0 0 8px;font-size:12px;color:#f3d27a;text-transform:uppercase;letter-spacing:0.12em;">{{section_label}}</p>
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;color:#ffffff;line-height:1.25;">{{post_title}}</h1>
        <p style="margin:0 0 24px;font-size:13px;color:#888;">By {{author_name}} &middot; {{publish_date}}</p>
      </td></tr>
      <!-- Article preview -->
      <tr><td style="padding:0 40px 8px;">
        <p style="margin:0 0 16px;font-size:16px;color:#dcdce4;line-height:1.7;font-style:italic;">{{excerpt}}</p>
        <div style="border-top:1px solid #2a2a3a;margin:8px 0 24px;"></div>
        {{article_preview}}
      </td></tr>
      <!-- Read more button -->
      <tr><td style="padding:16px 40px 40px;" align="center">
        <a href="{{post_link}}" style="display:inline-block;background:#f3d27a;color:#0a0a10;font-weight:700;font-size:15px;padding:14px 40px;border-radius:8px;text-decoration:none;">Read the Full Article</a>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:0 40px 32px;">
        <div style="border-top:1px solid #2a2a3a;margin:0 0 16px;"></div>
        <p style="margin:0;font-size:12px;color:#555;text-align:center;">You are receiving this because you subscribed to the Caleb Wolf Photography newsletter.</p>
      </td></tr>
    </table>
  </td></tr>
</table>',
  true,
  true
)
ON CONFLICT DO NOTHING;

-- Ensure only one template has the default flag
UPDATE newsletter_templates SET is_default_blog = false WHERE name != 'Newsroom Article';
UPDATE newsletter_templates SET is_default_blog = true WHERE name = 'Newsroom Article';
