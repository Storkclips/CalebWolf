/*
  # Link blog posts to auto-generated collections

  ## Summary
  When a blog post is saved, a matching admin_collection is automatically created
  so the admin can optionally sell or share the photos attached to the post.

  ## Changes

  ### blog_posts
  - Add `collection_id` (uuid, nullable FK → admin_collections.id): the auto-generated
    collection that mirrors this post's images. NULL until the post is first saved with images.

  ### collection_images
  - Add `blog_image_id` (text, nullable): records which blog_images row this
    collection image was originally synced from, so re-saves can update rather than
    duplicate.

  ## Notes
  - No data is migrated; columns are nullable so existing rows are unaffected.
  - RLS on admin_collections and collection_images already covers these rows.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'collection_id'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN collection_id uuid REFERENCES admin_collections(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_images' AND column_name = 'blog_image_id'
  ) THEN
    ALTER TABLE collection_images ADD COLUMN blog_image_id text;
  END IF;
END $$;
