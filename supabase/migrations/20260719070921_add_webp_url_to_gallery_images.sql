/*
# Add webp_url to gallery_images

1. Modified Tables
   - `gallery_images`: adds `webp_url` (text, nullable) — stores the public URL of the
     WebP-converted version of the image. NULL means conversion hasn't happened yet or
     the original was already WebP.

2. Notes
   - The original `url` column is preserved as-is; it is always the original uploaded file
     and is used for downloads.
   - `webp_url` is used only for display (faster page loads, smaller bandwidth).
   - Column is nullable so existing rows remain valid without needing a backfill.
*/

ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS webp_url text;
