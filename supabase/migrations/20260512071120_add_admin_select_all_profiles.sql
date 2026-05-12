/*
  # Allow admins to view all profiles

  ## Change
  - Adds a SELECT policy on `profiles` so that any authenticated user whose
    own profile has `is_admin = true` can read every row.
  - The existing "Users can view own profile" policy is unchanged — regular
    users still only see their own row.
*/

CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS self
      WHERE self.id = auth.uid()
        AND self.is_admin = true
    )
  );
