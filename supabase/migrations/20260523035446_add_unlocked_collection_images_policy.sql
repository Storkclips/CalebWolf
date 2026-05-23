/*
  # Add SELECT policy for images in unlocked collections

  ## Problem
  Users who unlock a private/blog collection via code see 0 images because:
  1. The query filtered is_published=true (now removed from frontend)
  2. The only authenticated SELECT policy requires is_published=true AND the
     parent collection to be published — so unpublished blog collections with
     unpublished images returned nothing.

  ## Fix
  Add a policy allowing authenticated users to read all images in collections
  they have personally unlocked (have a row in unlocked_collections).
*/

CREATE POLICY "Users can view images in their unlocked collections"
  ON collection_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM unlocked_collections
      WHERE unlocked_collections.user_id = auth.uid()
        AND unlocked_collections.collection_id = collection_images.collection_id
    )
  );
