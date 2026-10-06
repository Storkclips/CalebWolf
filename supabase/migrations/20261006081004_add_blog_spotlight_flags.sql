/*
# Add story spotlight flags to blog posts

1. Modified Tables
- `blog_posts`: two new columns:
  - `is_spotlight` (boolean, not null, default false): marks a story as part
    of the homepage "Spotlight" section. Intended for up to three stories.
  - `is_main_spotlight` (boolean, not null, default false): marks the single
    story shown as the large spotlight feature on the homepage. One of the
    spotlighted stories.

2. Security
- No policy changes: `blog_posts` keeps its existing policies. The flags
  only affect which published stories the frontend highlights.

3. Important Notes
- Idempotent: safe to re-run. Existing posts default to false, so nothing
  is highlighted unexpectedly.
- The frontend enforces the "three spotlights / one main spotlight" limits
  when admins toggle; the database does not hard-limit the count.
*/

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS is_spotlight boolean NOT NULL DEFAULT false;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS is_main_spotlight boolean NOT NULL DEFAULT false;
