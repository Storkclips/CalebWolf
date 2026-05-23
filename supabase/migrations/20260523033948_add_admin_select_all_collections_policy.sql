/*
  # Add admin SELECT policy for admin_collections

  ## Problem
  Admins inserting a collection with is_published=false and then calling
  .select('id') got a 403 because the only SELECT policy restricts to
  is_published=true rows. Supabase's insert().select() does a post-insert
  SELECT to return the new row, which was blocked by the policy.

  ## Fix
  Add a SELECT policy allowing admin users to read all collections regardless
  of published status.
*/

CREATE POLICY "Admins can view all collections"
  ON admin_collections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );
