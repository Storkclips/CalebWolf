/*
  # Add scheduled_at to blog_posts

  Adds a release date / scheduled publish time to blog posts.

  1. Changes
    - `blog_posts.scheduled_at` (timestamptz, nullable)
      - NULL means "publish immediately when published=true"
      - A future timestamp means the post is not visible to readers
        until that moment in time, even if published=true

  2. Notes
    - Existing rows get NULL (no schedule = publish immediately)
    - Public query logic must be updated to check:
        published = true AND (scheduled_at IS NULL OR scheduled_at <= now())
    - Admins see all posts regardless of scheduled_at
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'scheduled_at'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN scheduled_at timestamptz DEFAULT NULL;
  END IF;
END $$;
