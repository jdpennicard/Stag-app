-- Add profile_id to payments table to support payments for unlinked profiles
-- This allows admins to add payments for guests who haven't signed up yet

-- Add profile_id column (nullable, references profiles.id)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Make user_id nullable (it was NOT NULL before)
-- Check if column is still NOT NULL before altering
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' 
    AND column_name = 'user_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE payments ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Create index for profile_id
CREATE INDEX IF NOT EXISTS payments_profile_id_idx ON payments(profile_id);

-- Drop existing constraint if it exists, then recreate it
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_user_or_profile_check;

-- Add a check constraint to ensure either user_id or profile_id is set
ALTER TABLE payments 
ADD CONSTRAINT payments_user_or_profile_check 
CHECK (user_id IS NOT NULL OR profile_id IS NOT NULL);

