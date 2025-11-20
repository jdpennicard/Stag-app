-- Ensure is_admin_user() function exists (create if not exists)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND is_admin = true
  );
END;
$$;

-- Create storage bucket for Stag Info files
INSERT INTO storage.buckets (id, name, public)
VALUES ('stag-info-files', 'stag-info-files', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view stag info files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload stag info files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update stag info files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete stag info files" ON storage.objects;

-- Storage policies for stag-info-files bucket
-- Anyone can read files
CREATE POLICY "Anyone can view stag info files"
ON storage.objects FOR SELECT
USING (bucket_id = 'stag-info-files');

-- Only admins can upload files
CREATE POLICY "Admins can upload stag info files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'stag-info-files' AND
  is_admin_user()
);

-- Only admins can update files
CREATE POLICY "Admins can update stag info files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'stag-info-files' AND
  is_admin_user()
);

-- Only admins can delete files
CREATE POLICY "Admins can delete stag info files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'stag-info-files' AND
  is_admin_user()
);

