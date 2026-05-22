/*
  # Create redeem_gift_code RPC function

  ## Purpose
  Handles gift code redemption atomically in a single database transaction.
  Runs as SECURITY DEFINER so it can update gift_codes (increment use_count)
  even though regular users don't have UPDATE access to that table.

  ## What it does
  1. Looks up the gift code by its code string
  2. Validates: exists, active, not expired, not maxed out
  3. Checks the calling user hasn't already redeemed it
  4. Inserts a row into gift_code_redemptions
  5. Increments use_count on the gift code
  6. Increments credit_balance on the user's profile
  7. Returns the credits granted on success

  ## Security
  - SECURITY DEFINER runs with elevated privileges (owner's rights)
  - Still validates auth.uid() so only authenticated users can call it
  - All checks happen inside the transaction for atomicity
*/

CREATE OR REPLACE FUNCTION public.redeem_gift_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_gc      gift_codes%ROWTYPE;
  v_existing uuid;
BEGIN
  -- Must be authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'You must be signed in to redeem a gift code.');
  END IF;

  -- Look up code
  SELECT * INTO v_gc FROM gift_codes WHERE code = p_code;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Code not found. Please check and try again.');
  END IF;

  -- Validate code state
  IF NOT v_gc.active THEN
    RETURN json_build_object('error', 'This gift code is no longer active.');
  END IF;
  IF v_gc.expires_at IS NOT NULL AND v_gc.expires_at < now() THEN
    RETURN json_build_object('error', 'This gift code has expired.');
  END IF;
  IF v_gc.max_uses IS NOT NULL AND v_gc.use_count >= v_gc.max_uses THEN
    RETURN json_build_object('error', 'This gift code has reached its maximum number of uses.');
  END IF;

  -- Check duplicate redemption
  SELECT id INTO v_existing
  FROM gift_code_redemptions
  WHERE code_id = v_gc.id AND user_id = v_user_id;
  IF FOUND THEN
    RETURN json_build_object('error', 'You have already redeemed this gift code.');
  END IF;

  -- Record redemption
  INSERT INTO gift_code_redemptions (code_id, user_id, credits_granted)
  VALUES (v_gc.id, v_user_id, v_gc.credits);

  -- Increment use_count
  UPDATE gift_codes SET use_count = use_count + 1 WHERE id = v_gc.id;

  -- Add credits to profile
  UPDATE profiles SET credit_balance = credit_balance + v_gc.credits WHERE id = v_user_id;

  RETURN json_build_object('credits', v_gc.credits);
END;
$$;

-- Grant execute to authenticated users only
REVOKE EXECUTE ON FUNCTION public.redeem_gift_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_gift_code(text) TO authenticated;
