/*
  # Add admin flag to profiles

  1. Changes
    - Add `is_admin` column to profiles table (boolean, default false)
    - Only admins can see admin panel

  2. Security
    - Users cannot modify their own `is_admin` flag
    - Only database admins can set this flag directly
*/

-- Add is_admin column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Update the policy to prevent users from changing their is_admin status
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );
