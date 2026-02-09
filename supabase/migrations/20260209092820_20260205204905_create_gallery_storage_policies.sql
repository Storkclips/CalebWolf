/*
  # Gallery storage policies

  1. Storage
    - Allow public read access to gallery images
    - Allow authenticated users to upload, update, and delete images
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for gallery' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public read access for gallery"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'gallery');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload gallery images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can upload gallery images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'gallery');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update gallery images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can update gallery images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'gallery')
      WITH CHECK (bucket_id = 'gallery');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete gallery images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can delete gallery images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'gallery');
  END IF;
END $$;