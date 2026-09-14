-- Migration: 20260914000001_storage_public_upload_policy.sql
-- Description: Allow direct media uploads and updates to goodzeed-media bucket

DO $$
BEGIN
  -- 1. Allow INSERT for anon and authenticated users to goodzeed-media bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Allow goodzeed-media uploads'
  ) THEN
    CREATE POLICY "Allow goodzeed-media uploads"
      ON storage.objects FOR INSERT TO anon, authenticated
      WITH CHECK (bucket_id = 'goodzeed-media');
  END IF;

  -- 2. Allow UPDATE for anon and authenticated users on goodzeed-media bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Allow goodzeed-media updates'
  ) THEN
    CREATE POLICY "Allow goodzeed-media updates"
      ON storage.objects FOR UPDATE TO anon, authenticated
      USING (bucket_id = 'goodzeed-media');
  END IF;

  -- 3. Allow DELETE for authenticated or anon users on goodzeed-media bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Allow goodzeed-media deletes'
  ) THEN
    CREATE POLICY "Allow goodzeed-media deletes"
      ON storage.objects FOR DELETE TO anon, authenticated
      USING (bucket_id = 'goodzeed-media');
  END IF;
END $$;
