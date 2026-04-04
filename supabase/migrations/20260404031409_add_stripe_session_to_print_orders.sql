/*
  # Add Stripe session tracking to print_orders

  Adds a `stripe_checkout_session_id` column to `print_orders` so we can
  match incoming Stripe webhook events back to the correct order and
  automatically move it from `pending` to `confirmed` on payment.

  ## Changes
  - `print_orders.stripe_checkout_session_id` (text, nullable) — the Stripe
    Checkout Session ID created when the user initiates payment
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_orders' AND column_name = 'stripe_checkout_session_id'
  ) THEN
    ALTER TABLE print_orders ADD COLUMN stripe_checkout_session_id text;
  END IF;
END $$;
