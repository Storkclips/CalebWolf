/*
  # Create about_settings table

  Stores all editable content for the About page:

  ## Columns
  - hero_eyebrow: small label above the headline
  - hero_headline: main h1 text
  - hero_lead: intro paragraph
  - hero_image_url: portrait photo URL

  - block_philosophy_title / block_philosophy_body
  - block_approach_title / block_approach_body
  - block_location_title / block_location_body
  - block_equipment_title / block_equipment_body

  - personal_eyebrow: label above "A few things about me"
  - personal_heading
  - personal_items: text[] — bullet list items
  - personal_image_main_url
  - personal_image_accent_url

  - cta_heading
  - cta_subtext

  ## Security
  - RLS enabled; public can read (about page is public), only admins can update
*/

CREATE TABLE IF NOT EXISTS about_settings (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  hero_eyebrow              text NOT NULL DEFAULT 'About Caleb',
  hero_headline             text NOT NULL DEFAULT 'Filmmaker turned photographer.',
  hero_lead                 text NOT NULL DEFAULT 'I learned to light for motion pictures before falling in love with stills. That mix of cinematic tone and honest, documentary moments defines my work today.',
  hero_image_url            text NOT NULL DEFAULT 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=800',

  block_philosophy_title    text NOT NULL DEFAULT 'Philosophy',
  block_philosophy_body     text NOT NULL DEFAULT 'I believe photos should feel lived-in and cinematic. I direct when helpful, then step back and let authentic moments unfold naturally — never forced, always honest.',
  block_approach_title      text NOT NULL DEFAULT 'Approach',
  block_approach_body       text NOT NULL DEFAULT 'Every project starts with a discovery call to understand your story. From scouting and shot lists to color grading, I handle the details so you can be fully present in the moment.',
  block_location_title      text NOT NULL DEFAULT 'Location',
  block_location_body       text NOT NULL DEFAULT 'Based in Portland, traveling often for destination work. I''ve shot in over 20 states and regularly accept bookings across the Pacific Northwest, Southwest, and East Coast.',
  block_equipment_title     text NOT NULL DEFAULT 'Equipment',
  block_equipment_body      text NOT NULL DEFAULT 'Sony mirrorless system with cinema-grade prime lenses. Every piece of gear chosen for rendering skin tones and low-light environments the way human eyes experience them.',

  personal_eyebrow          text NOT NULL DEFAULT 'Beyond the camera',
  personal_heading          text NOT NULL DEFAULT 'A few things about me',
  personal_items            text[] NOT NULL DEFAULT ARRAY[
    'Mentors emerging photographers on lighting and workflow.',
    'Collects zines and 35mm film cameras from the 70s and 80s.',
    'Shot documentary short films before switching to photography full-time.',
    'Runs weekend workshops on natural-light portraiture in the Pacific Northwest.'
  ],
  personal_image_main_url   text NOT NULL DEFAULT 'https://images.pexels.com/photos/2608517/pexels-photo-2608517.jpeg?auto=compress&cs=tinysrgb&w=600',
  personal_image_accent_url text NOT NULL DEFAULT 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg?auto=compress&cs=tinysrgb&w=400',

  cta_heading               text NOT NULL DEFAULT 'Ready to work together?',
  cta_subtext               text NOT NULL DEFAULT 'Let''s talk about your project, timeline, and vision.',

  updated_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE about_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read about settings"
  ON about_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update about settings"
  ON about_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Seed one row
INSERT INTO about_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;
