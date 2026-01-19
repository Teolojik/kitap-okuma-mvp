-- Supabase Storage bucket for book covers
-- Run this in Supabase SQL Editor

-- 1. Create the covers bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'covers',
    'covers',
    true,  -- public bucket so covers can be displayed without auth
    5242880, -- 5MB limit per file
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Allow public read access
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

-- 3. Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'covers');

-- 4. Allow users to update their own uploads
CREATE POLICY "User Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'covers');

-- 5. Allow users to delete their own uploads
CREATE POLICY "User Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'covers');
