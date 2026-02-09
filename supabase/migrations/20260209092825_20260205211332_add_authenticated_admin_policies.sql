/*
  # Add authenticated user policies for admin management

  Allows authenticated users to manage collections, images, and unlock codes.
  Matches existing pattern where admin gallery manager uses direct client calls.

  1. Security Changes
    - admin_collections: authenticated users can insert, update, delete
    - collection_images: authenticated users can insert, update, delete
    - unlock_codes: authenticated users can select, insert, update, delete
*/

CREATE POLICY "Authenticated users can insert collections"
  ON admin_collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update collections"
  ON admin_collections FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete collections"
  ON admin_collections FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);


CREATE POLICY "Authenticated users can insert collection images"
  ON collection_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update collection images"
  ON collection_images FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete collection images"
  ON collection_images FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);


CREATE POLICY "Authenticated users can view unlock codes"
  ON unlock_codes FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert unlock codes"
  ON unlock_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update unlock codes"
  ON unlock_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete unlock codes"
  ON unlock_codes FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);