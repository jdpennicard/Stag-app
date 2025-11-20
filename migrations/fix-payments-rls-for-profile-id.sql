-- Fix RLS policies for payments to allow admins to insert payments with profile_id
-- This is needed to support payments for unclaimed profiles

-- Drop existing admin insert policy if it exists (we'll recreate it)
DROP POLICY IF EXISTS "Admins can insert payments" ON payments;

-- Create a new policy that allows admins to insert payments
-- This works for both user_id and profile_id cases
CREATE POLICY "Admins can insert payments"
  ON payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Also update the select policy to allow admins to see payments with profile_id
-- The existing policy should work, but let's make sure it handles null user_id
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    -- Allow if it's their own payment (user_id matches)
    auth.uid() = user_id
    OR
    -- Allow if they're an admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

