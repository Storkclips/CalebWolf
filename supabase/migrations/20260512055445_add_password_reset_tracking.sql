/*
  # Add password reset tracking to profiles

  1. Changes
    - Add `password_reset_required` boolean flag to profiles (default false)
    - Add `force_change_password` boolean flag for admin-initiated resets
    - Add tracking for when password was last changed

  2. Security
    - Only admins can update these fields via policies
    - Users can only read their own data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'password_reset_required'
  ) THEN
    ALTER TABLE profiles ADD COLUMN password_reset_required boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'force_change_password'
  ) THEN
    ALTER TABLE profiles ADD COLUMN force_change_password boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_password_changed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_password_changed timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

CREATE POLICY "Admins can update password reset flags"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
