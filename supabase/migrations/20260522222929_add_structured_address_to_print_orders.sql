/*
  # Add structured shipping address fields to print_orders

  ## Changes to print_orders
  The existing `shipping_address` text column stored everything as a single
  freeform string. This migration adds discrete columns for each address part
  so orders can be fulfilled without ambiguity and admins can see clean data.

  ### New columns
  - `address_line1` (text) — street number and street name (required)
  - `address_line2` (text) — apartment, suite, unit, building, etc. (optional)
  - `city`          (text) — city name (required)
  - `state`         (text) — state / province (required)
  - `zip`           (text) — postal / ZIP code (required)
  - `country`       (text) — defaults to "US"

  The original `shipping_address` column is left in place so legacy orders
  continue to display without any data loss.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_orders' AND column_name = 'address_line1'
  ) THEN
    ALTER TABLE print_orders ADD COLUMN address_line1 text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_orders' AND column_name = 'address_line2'
  ) THEN
    ALTER TABLE print_orders ADD COLUMN address_line2 text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_orders' AND column_name = 'city'
  ) THEN
    ALTER TABLE print_orders ADD COLUMN city text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_orders' AND column_name = 'state'
  ) THEN
    ALTER TABLE print_orders ADD COLUMN state text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_orders' AND column_name = 'zip'
  ) THEN
    ALTER TABLE print_orders ADD COLUMN zip text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_orders' AND column_name = 'country'
  ) THEN
    ALTER TABLE print_orders ADD COLUMN country text NOT NULL DEFAULT 'US';
  END IF;
END $$;
