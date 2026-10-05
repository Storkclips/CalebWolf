/*
# Add project_json and saved_at columns to magazines

1. Modified Tables
- `magazines`: Add `project_json` (jsonb, nullable) — stores the last manually saved full project data from Magazine Studio
- `magazines`: Add `saved_at` (timestamptz, nullable) — timestamp of the last manual save (distinct from autosaved_at)

2. Security
- No RLS policy changes. Existing admin-only write policies remain in effect.

3. Notes
- `autosave_json` / `autosaved_at` already exist and are untouched.
- `project_json` holds the "committed" revision (from Save/Publish), while `autosave_json` holds the background autosave.
- On load, the editor prefers `autosave_json` (most recent work), falling back to `project_json`.
*/

ALTER TABLE magazines
  ADD COLUMN IF NOT EXISTS project_json jsonb,
  ADD COLUMN IF NOT EXISTS saved_at timestamptz;
