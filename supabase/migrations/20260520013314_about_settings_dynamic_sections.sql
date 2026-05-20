/*
  # Replace about_settings fixed columns with a dynamic JSONB sections array

  The old schema had a fixed column per content block, making it impossible to
  add or remove blocks at runtime. This migration adds a `sections` JSONB column
  that stores an ordered array of section objects. Each section has a `type` and
  an array of `blocks`. The old columns are left in place (non-destructive) but
  the app will now use `sections` exclusively.

  ## Section schema (stored in `sections` jsonb[]):
  Each element is an object with:
    - id: string (uuid-like, client-generated)
    - type: 'hero' | 'blocks' | 'personal' | 'cta' | 'text'
    - label: string (admin display name)
    - [type-specific fields...]

  ### type = 'hero'
    eyebrow, headline, lead, image_url

  ### type = 'blocks'
    heading (optional section heading), items: [{ id, title, body }]

  ### type = 'personal'
    eyebrow, heading, items: string[], image_main_url, image_accent_url

  ### type = 'cta'
    heading, subtext

  ### type = 'text'
    heading (optional), body

  ## Security
  Inherits existing RLS from about_settings (public read, admin update).
*/

ALTER TABLE about_settings
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill the existing row with the default sections matching the old hardcoded content
UPDATE about_settings SET sections = '[
  {
    "id": "section-hero",
    "type": "hero",
    "label": "Hero",
    "eyebrow": "About Caleb",
    "headline": "Filmmaker turned\nphotographer.",
    "lead": "I learned to light for motion pictures before falling in love with stills. That mix of cinematic tone and honest, documentary moments defines my work today.",
    "image_url": "https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=800"
  },
  {
    "id": "section-blocks",
    "type": "blocks",
    "label": "Info Blocks",
    "items": [
      { "id": "block-1", "title": "Philosophy", "body": "I believe photos should feel lived-in and cinematic. I direct when helpful, then step back and let authentic moments unfold naturally — never forced, always honest." },
      { "id": "block-2", "title": "Approach", "body": "Every project starts with a discovery call to understand your story. From scouting and shot lists to color grading, I handle the details so you can be fully present in the moment." },
      { "id": "block-3", "title": "Location", "body": "Based in Portland, traveling often for destination work. I''ve shot in over 20 states and regularly accept bookings across the Pacific Northwest, Southwest, and East Coast." },
      { "id": "block-4", "title": "Equipment", "body": "Sony mirrorless system with cinema-grade prime lenses. Every piece of gear chosen for rendering skin tones and low-light environments the way human eyes experience them." }
    ]
  },
  {
    "id": "section-personal",
    "type": "personal",
    "label": "Personal",
    "eyebrow": "Beyond the camera",
    "heading": "A few things about me",
    "items": [
      "Mentors emerging photographers on lighting and workflow.",
      "Collects zines and 35mm film cameras from the 70s and 80s.",
      "Shot documentary short films before switching to photography full-time.",
      "Runs weekend workshops on natural-light portraiture in the Pacific Northwest."
    ],
    "image_main_url": "https://images.pexels.com/photos/2608517/pexels-photo-2608517.jpeg?auto=compress&cs=tinysrgb&w=600",
    "image_accent_url": "https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    "id": "section-cta",
    "type": "cta",
    "label": "CTA Strip",
    "heading": "Ready to work together?",
    "subtext": "Let''s talk about your project, timeline, and vision."
  }
]'::jsonb
WHERE sections = '[]'::jsonb;
