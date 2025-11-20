-- Fix RLS policy to allow users to claim unclaimed profiles
-- This policy allows authenticated users to update profiles where user_id IS NULL

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can claim unclaimed profiles" ON profiles;

-- Create policy to allow claiming unclaimed profiles
-- USING: allows update if the profile is unclaimed (user_id IS NULL)
-- WITH CHECK: ensures after update, the user_id matches the authenticated user
CREATE POLICY "Users can claim unclaimed profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id IS NULL AND is_admin = false)
  WITH CHECK (auth.uid() = user_id);

