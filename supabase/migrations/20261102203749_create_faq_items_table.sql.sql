/*
  # Create faq_items table for editable homepage Questions section

  ## Purpose
  Lets the admin add, edit, reorder, and remove the questions shown in the
  "Questions, answered" FAQ section on the homepage, instead of the list
  being hard-coded.

  ## New Tables
  - `faq_items`
    - `id` (uuid, primary key)
    - `question` (text, not null) — the displayed question
    - `answer` (text, not null) — the displayed answer
    - `position` (integer, not null, default 0) — display order, lower first
    - `created_at` (timestamptz, default now)

  ## Security
  - RLS enabled.
  - Anyone (anon or authenticated) can READ — the FAQ is public homepage content.
  - Only signed-in admins (profiles.is_admin = true) can INSERT, UPDATE, DELETE.
  - Grants: SELECT for anon + authenticated; full CRUD for authenticated
    (row filtering is done by the admin policies, not the grants).

  ## Notes
  - Seeded with the six questions currently hard-coded on the homepage so
    nothing changes visually after this migration.
*/

CREATE TABLE IF NOT EXISTS faq_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question   text NOT NULL,
  answer     text NOT NULL,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON faq_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON faq_items TO authenticated;

DROP POLICY IF EXISTS "Public can read faq items" ON faq_items;
CREATE POLICY "Public can read faq items"
  ON faq_items FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert faq items" ON faq_items;
CREATE POLICY "Admins can insert faq items"
  ON faq_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can update faq items" ON faq_items;
CREATE POLICY "Admins can update faq items"
  ON faq_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can delete faq items" ON faq_items;
CREATE POLICY "Admins can delete faq items"
  ON faq_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Seed with the questions currently on the homepage
INSERT INTO faq_items (question, answer, position)
SELECT * FROM (VALUES
  ('How do I buy a print or digital download?', 'Browse any collection and add images to your cart with credits. Digital downloads arrive instantly after checkout; fine-art prints ship from my studio within 5–7 days, carefully packed.', 0),
  ('What are credits and how do they work?', 'Credits are the shop currency — one credit unlocks one image, and bundles get you more for less. Buy credits any time from the Pricing menu; they never expire.', 1),
  ('Can I license an image for commercial use?', 'Yes. Most images are available for editorial and commercial licensing. Open the image, choose License, and tell me about your project — I usually reply within a day.', 2),
  ('Do you photograph weddings and sessions?', 'I take a small number of weddings, portraits, and brand sessions each year, mostly in the Pacific Northwest. Session pricing is under the Pricing menu, and every package includes a private online gallery.', 3),
  ('What is the digital magazine?', 'A cozy, slow-reading photo journal published monthly — full photo essays, field notes, and printing notes. Subscribe for access to every issue, or buy single issues to own forever.', 4),
  ('Do you offer gift codes?', 'I do. Gift codes can be applied to credits, prints, or magazine issues, and they redeem instantly at checkout — a nice way to share the trail with someone.', 5)
) AS seed(question, answer, position)
WHERE NOT EXISTS (SELECT 1 FROM faq_items);