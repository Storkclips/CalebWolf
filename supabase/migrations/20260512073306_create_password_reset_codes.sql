/*
  # Create password_reset_codes table

  ## Purpose
  Stores short-lived 6-digit OTP codes for password resets, replacing
  the magic-link approach that caused cross-origin redirect errors.

  ## Tables
  - `password_reset_codes`
    - `id` (uuid, pk)
    - `email` (text) — the email address requesting a reset
    - `code_hash` (text) — SHA-256 hex of the 6-digit code
    - `expires_at` (timestamptz) — 5 minutes from creation
    - `used` (boolean) — prevents replay after use
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled; no direct client access (only service-role edge functions touch this table)
  - Old unused codes for the same email are deleted when a new one is issued
*/

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prc_email ON password_reset_codes (email);

ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- No client-facing policies — edge functions use the service role key
