-- Fix RLS policy for payment_deadlines to properly support UPDATE operations
-- The existing policy only has USING clause, but UPDATE needs both USING and WITH CHECK

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage deadlines" ON payment_deadlines;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Admins can manage deadlines"
  ON payment_deadlines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

