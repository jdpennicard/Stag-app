-- Fix RLS policy recursion issue
-- Run this in your Supabase SQL Editor

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create a function to check admin status (bypasses RLS to avoid recursion)
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

-- Recreate admin policy using the function
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (is_admin_user());

-- Fix unclaimed profiles policy
DROP POLICY IF EXISTS "Anyone can view unclaimed profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view unclaimed profiles" ON profiles;

CREATE POLICY "Authenticated users can view unclaimed profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id IS NULL AND is_admin = false);

