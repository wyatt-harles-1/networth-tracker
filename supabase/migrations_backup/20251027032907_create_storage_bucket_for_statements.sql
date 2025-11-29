/*
  # Create Storage Bucket for Statement Uploads

  ## Overview
  Creates a private storage bucket for temporarily storing uploaded statement files.
  Files are automatically cleaned up after processing.

  ## 1. Storage Bucket
    - `statement-uploads` - Private bucket for uploaded statements
    - User-isolated file storage
    - Automatic file cleanup after processing

  ## 2. Security Policies
    - Users can upload files to their own folder
    - Users can read files from their own folder
    - Users can delete files from their own folder
    - Service role has full access for processing

  ## 3. Important Notes
    - Files should be organized by user_id folder
    - Files are temporary and deleted after successful parsing
    - Maximum file size enforced at application level (10MB)
*/

-- Create the storage bucket for statement uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'statement-uploads',
  'statement-uploads',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'message/rfc822'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Service role has full access" ON storage.objects;

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'statement-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read their own files
CREATE POLICY "Users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'statement-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'statement-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Service role has full access for processing
CREATE POLICY "Service role has full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'statement-uploads')
WITH CHECK (bucket_id = 'statement-uploads');