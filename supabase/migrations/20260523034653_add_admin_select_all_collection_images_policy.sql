/*
  # Add admin SELECT policy for collection_images

  ## Problem
  The only SELECT policy on collection_images requires both the image and its
  parent collection to be published. Blog-synced images are inserted with
  is_published=false into an unpublished collection, so admins saw 0 images
  in the "Manage Collection" panel.

  ## Fix
  Add a SELECT policy allowing admin users to read all collection_images
  regardless of published status.
*/

CREATE POLICY "Admins can view all collection images"
  ON collection_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );
