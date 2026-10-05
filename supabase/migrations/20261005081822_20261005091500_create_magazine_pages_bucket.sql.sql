/*
# Magazine published pages storage

1. New storage bucket
- `magazine-pages`: holds the pre-rendered, numbered page images that make up
  the published flipbook. Files are stored under `<magazine_id>/NNN.webp`
  where NNN is a zero-padded page index (000 = front cover, 001 = inside
  front cover, then inner pages in reading order, ending with inside back
  cover and back cover).

2. Security
- The bucket is public-read: published magazine pages are intentionally
  viewable by all site visitors (the same content as the flipbook).
- Writes are restricted to admin users via the existing
  `is_current_user_admin` SECURITY DEFINER helper function, so anonymous
  users can never create, modify or delete published page files.

3. Notes
- Admins (and only admins) manage files directly; the public only reads.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('magazine-pages', 'magazine-pages', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access: published page images are intentionally public.
DROP POLICY IF EXISTS "Public read magazine pages" ON storage.objects;
CREATE POLICY "Public read magazine pages"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'magazine-pages');

-- Only admins can upload published page images.
DROP POLICY IF EXISTS "Admin upload magazine pages" ON storage.objects;
CREATE POLICY "Admin upload magazine pages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'magazine-pages'
  AND public.is_current_user_admin()
);

-- Only admins can modify published page images.
DROP POLICY IF EXISTS "Admin update magazine pages" ON storage.objects;
CREATE POLICY "Admin update magazine pages"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'magazine-pages'
  AND public.is_current_user_admin()
)
WITH CHECK (
  bucket_id = 'magazine-pages'
  AND public.is_current_user_admin()
);

-- Only admins can delete published page images.
DROP POLICY IF EXISTS "Admin delete magazine pages" ON storage.objects;
CREATE POLICY "Admin delete magazine pages"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'magazine-pages'
  AND public.is_current_user_admin()
);
