/*
# Add SEO alt text columns and blog archived/featured flags

## Purpose
Improves image SEO so Google can properly index and label all photos on the site,
blogs, and collections by "Caleb Wolf Photography". Also adds archived/featured
flags to blog posts so the homepage can show featured and recent articles while
hiding archived ones.

## Changes

### 1. gallery_images — add alt_text column
- New column: `alt_text` (text, default '') — descriptive alt text for SEO image indexing.

### 2. collection_images — add alt_text column
- New column: `alt_text` (text, default '') — descriptive alt text for SEO image indexing.

### 3. blog_posts — add is_archived and is_featured columns
- New column: `is_archived` (boolean, default false) — when true, the post is hidden from public homepage and blog listing but still accessible via direct URL.
- New column: `is_featured` (boolean, default false) — when true, the post is prioritized on the homepage.

## Security
No RLS policy changes — existing policies already cover these tables. New columns inherit existing access rules.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_images' AND column_name = 'alt_text'
  ) THEN
    ALTER TABLE gallery_images ADD COLUMN alt_text text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_images' AND column_name = 'alt_text'
  ) THEN
    ALTER TABLE collection_images ADD COLUMN alt_text text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
  END IF;
END $$;
