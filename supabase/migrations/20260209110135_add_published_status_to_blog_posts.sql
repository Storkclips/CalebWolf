/*
  # Add published status to blog posts

  1. Changes
    - Add `published` boolean column to `blog_posts` table
    - Default value is false (draft)
    - Update existing posts to be published

  2. Notes
    - Posts are drafts by default
    - Only published posts are visible to non-admin users
    - Admins can see all posts (drafts and published)
*/

-- Add published column to blog_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'published'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN published boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Update existing posts to be published (so they remain visible)
UPDATE blog_posts SET published = true WHERE published = false;
