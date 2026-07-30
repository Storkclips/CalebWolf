/*
# Add batch_id to gift_codes for bulk code generation

## Purpose
Allows multiple gift codes to be grouped together when generated in a batch,
so the admin can view, copy, and download all codes from a single batch,
and see per-code usage status (used vs. still valid).

## Changes
1. New column: `gift_codes.batch_id` (uuid, nullable)
   - When NULL, the code was created individually (existing behavior)
   - When set, the code belongs to a batch of codes sharing the same
     credits, max_uses, expires_at, active, and note settings
2. Index on `batch_id` for efficient batch lookups

## Security
- No RLS policy changes needed — existing admin-only policies on gift_codes
  already cover the new column.
*/

ALTER TABLE gift_codes
  ADD COLUMN IF NOT EXISTS batch_id uuid;

CREATE INDEX IF NOT EXISTS idx_gift_codes_batch_id
  ON gift_codes (batch_id)
  WHERE batch_id IS NOT NULL;
