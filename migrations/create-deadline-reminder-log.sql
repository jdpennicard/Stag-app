-- Create deadline_reminder_log table if it doesn't exist
-- This table tracks which reminder emails have been sent to prevent duplicates

CREATE TABLE IF NOT EXISTS deadline_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
  deadline_id UUID REFERENCES payment_deadlines(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  days_before INTEGER NOT NULL,
  sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email_log_id UUID REFERENCES email_log(id) ON DELETE SET NULL
);

-- Create unique index to prevent duplicate sends
-- A reminder can only be sent once per template/deadline/profile/day combination
CREATE UNIQUE INDEX IF NOT EXISTS deadline_reminder_log_unique_daily 
  ON deadline_reminder_log(template_id, deadline_id, profile_id, days_before, sent_date);

-- Add RLS policies
ALTER TABLE deadline_reminder_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Admins can view deadline reminder logs" ON deadline_reminder_log;
DROP POLICY IF EXISTS "Service role can manage deadline reminder logs" ON deadline_reminder_log;

-- Admins can view all logs
CREATE POLICY "Admins can view deadline reminder logs"
  ON deadline_reminder_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Note: Service role key bypasses RLS entirely, so no policy needed for it
-- But we add this policy for completeness (though it won't be used with service role)
-- This allows the service role to work even if RLS is enabled
CREATE POLICY "Service role can manage deadline reminder logs"
  ON deadline_reminder_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

