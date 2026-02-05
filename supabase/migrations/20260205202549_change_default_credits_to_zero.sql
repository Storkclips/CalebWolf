/*
  # Change default credits from 25 to 0

  1. Changes
    - `profiles.credit_balance` default changed from 25 to 0
    - Updated `handle_new_user` trigger function so new signups start with 0 credits
    - Removed automatic signup bonus credit transaction

  2. Notes
    - Existing users keep their current balance
    - New users start with 0 credits and must purchase credits via Stripe
*/

ALTER TABLE profiles ALTER COLUMN credit_balance SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, credit_balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
