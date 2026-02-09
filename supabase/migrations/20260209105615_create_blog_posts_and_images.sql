/*
  # Create blog posts and images tables

  1. New Tables
    - `blog_posts`
      - `id` (text, primary key) - Unique identifier/slug for the post
      - `title` (text) - Post title
      - `date` (text) - Display date (e.g., "March 2024")
      - `excerpt` (text) - Short summary
      - `tag` (text) - Category tag (e.g., "Techniques", "Stories")
      - `content_html` (text) - Main content with markup
      - `created_at` (timestamptz) - When the post was created
      - `updated_at` (timestamptz) - When the post was last updated
    
    - `blog_images`
      - `id` (text, primary key) - Unique identifier for the image
      - `post_id` (text, foreign key) - References blog_posts.id
      - `title` (text) - Image title
      - `url` (text) - Image URL
      - `price` (integer) - Credit price for the image
      - `focus_x` (integer) - Horizontal focus point percentage (default 50)
      - `focus_y` (integer) - Vertical focus point percentage (default 50)
      - `alt_text` (text, nullable) - Alternative text for accessibility
      - `caption` (text, nullable) - Image caption
      - `link_url` (text, nullable) - Optional link URL
      - `open_in_new_tab` (boolean) - Whether link opens in new tab
      - `sort_order` (integer) - Order of images in the post
      - `created_at` (timestamptz) - When the image was added

  2. Security
    - Enable RLS on both tables
    - Public read access for all blog posts and images
    - Only admins can create, update, or delete posts and images
*/

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id text PRIMARY KEY,
  title text NOT NULL,
  date text NOT NULL DEFAULT '',
  excerpt text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT '',
  content_html text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create blog_images table
CREATE TABLE IF NOT EXISTS blog_images (
  id text PRIMARY KEY,
  post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  focus_x integer NOT NULL DEFAULT 50,
  focus_y integer NOT NULL DEFAULT 50,
  alt_text text,
  caption text,
  link_url text,
  open_in_new_tab boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS blog_images_post_id_idx ON blog_images(post_id);
CREATE INDEX IF NOT EXISTS blog_posts_created_at_idx ON blog_posts(created_at DESC);

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_images ENABLE ROW LEVEL SECURITY;

-- Public can read all blog posts
CREATE POLICY "Anyone can view blog posts"
  ON blog_posts FOR SELECT
  TO public
  USING (true);

-- Public can read all blog images
CREATE POLICY "Anyone can view blog images"
  ON blog_images FOR SELECT
  TO public
  USING (true);

-- Only admins can insert blog posts
CREATE POLICY "Admins can insert blog posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admins can update blog posts
CREATE POLICY "Admins can update blog posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admins can delete blog posts
CREATE POLICY "Admins can delete blog posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admins can insert blog images
CREATE POLICY "Admins can insert blog images"
  ON blog_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admins can update blog images
CREATE POLICY "Admins can update blog images"
  ON blog_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admins can delete blog images
CREATE POLICY "Admins can delete blog images"
  ON blog_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Insert default blog posts
INSERT INTO blog_posts (id, title, date, excerpt, tag, content_html)
VALUES
  (
    'guides-light',
    'A Guide to Cinematic Lighting for Portraits',
    'March 2024',
    'How I shape light on-location with reflectors, strobes, and the sun for depth and drama.',
    'Techniques',
    'I travel with a compact lighting kit so we can sculpt highlights in any environment.

<image:Backlit portrait study>

From open shade setups to golden hour rim light, I use small shifts in angle and diffusion to keep skin tones luminous without losing the mood.

Two-light setup for clean catchlights
Softbox diffusion for editorial softness
Rim light placement for cinematic depth'
  ),
  (
    'destination',
    'Planning a Destination Elopement in the PNW',
    'February 2024',
    'From permits to packing lists, here is my checklist for effortless, heartfelt celebrations.',
    'Stories',
    'The best destination stories start with a relaxed plan.

<image:Cliffside vows>

I help couples map sunrise timelines, local trailhead access, and weather backups so we can stay present and capture the candid moments that make the trip unforgettable.

Permit + trail intel
Weather backup timeline
Portable vows kit'
  ),
  (
    'workflow',
    'My Post-Production Workflow',
    'January 2024',
    'File safety, culling, and the color grading steps I use to keep galleries cohesive.',
    'Process',
    'My editing process starts with redundant backups and a fast cull pass.

<image:Culling workstation detail>

I create consistent color profiles for each session so families and editorial clients receive a gallery that feels cinematic, cohesive, and ready for print.

Workflow: safety backups → cull pass → global grade → fine retouching → export.'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert default blog images
INSERT INTO blog_images (id, post_id, title, url, price, sort_order)
VALUES
  (
    'guides-light-01',
    'guides-light',
    'Backlit portrait study',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80',
    3,
    0
  ),
  (
    'guides-light-02',
    'guides-light',
    'Studio contrast frame',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
    4,
    1
  ),
  (
    'destination-01',
    'destination',
    'Cliffside vows',
    'https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?auto=format&fit=crop&w=1200&q=80',
    5,
    0
  ),
  (
    'destination-02',
    'destination',
    'Mountain trail portraits',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    4,
    1
  ),
  (
    'workflow-01',
    'workflow',
    'Culling workstation detail',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    2,
    0
  ),
  (
    'workflow-02',
    'workflow',
    'Final export desk',
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
    3,
    1
  )
ON CONFLICT (id) DO NOTHING;
