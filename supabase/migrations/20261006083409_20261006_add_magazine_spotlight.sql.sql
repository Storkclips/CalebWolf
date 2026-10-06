/*
# Add spotlight flag to magazines

1. Modified Tables
- `magazines`: adds `is_spotlight` (boolean, default false). Spotlighted,
  published magazines are featured on the homepage in a new magazine
  spotlight row (shown alongside the story spotlights).
2. Security
- No changes. The magazines table already has admin-only UPDATE policies,
  which cover the new column.
3. Notes
- Idempotent: uses IF NOT EXISTS.
*/

ALTER TABLE magazines ADD COLUMN IF NOT EXISTS is_spotlight boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_magazines_spotlight ON magazines (is_spotlight) WHERE is_spotlight = true;
