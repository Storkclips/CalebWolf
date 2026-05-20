/*
  # Add contact info fields to contact_settings

  Adds three new columns to contact_settings that are displayed
  on the public contact page and editable from the admin dashboard:
  - contact_email: public-facing email shown to visitors
  - based_in: location string (e.g. "Portland, Oregon")
  - response_time: response time string (e.g. "Within 1 business day")
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_settings' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE contact_settings ADD COLUMN contact_email text NOT NULL DEFAULT 'hello@calebwolf.com';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_settings' AND column_name = 'based_in'
  ) THEN
    ALTER TABLE contact_settings ADD COLUMN based_in text NOT NULL DEFAULT 'Portland, Oregon';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_settings' AND column_name = 'response_time'
  ) THEN
    ALTER TABLE contact_settings ADD COLUMN response_time text NOT NULL DEFAULT 'Within 1 business day';
  END IF;
END $$;
