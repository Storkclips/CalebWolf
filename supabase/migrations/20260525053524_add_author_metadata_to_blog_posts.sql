/*
  # Add author and metadata columns to blog_posts

  ## Changes
  - `author_name` (text) — display name of the post author
  - `author_initials` (text) — short initials badge shown in the editor
  - `publish_date` (text) — formatted publish date string
  - `read_time` (integer) — estimated minutes to read (null = auto-derived)
  - `last_edited` (text) — human-readable last-edited date string

  These replace the previously hard-coded "Joshua Wolf" / "JW" fallbacks
  in the blog editor and allow per-post author attribution.
*/

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS author_name text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS author_initials text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS publish_date text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS read_time integer,
  ADD COLUMN IF NOT EXISTS last_edited text DEFAULT '' NOT NULL;
