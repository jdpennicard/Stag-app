-- Create deadline_reminder_schedules table
-- This allows admins to configure when reminder emails are sent (e.g., 7 days before, 2 days before)
-- Each schedule links to an email template and specifies how many days before the deadline to send

CREATE TABLE IF NOT EXISTS deadline_reminder_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  days_before INTEGER NOT NULL, -- Number of days before deadline to send (e.g., 7, 2, 1)
  template_id UUID REFERENCES email_templates(id) ON DELETE RESTRICT, -- Which email template to use
  enabled BOOLEAN DEFAULT true, -- Allow disabling schedules without deleting
  description TEXT, -- Optional description (e.g., "First reminder", "Final reminder")
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure we don't have duplicate schedules for the same days_before
  UNIQUE(days_before)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS deadline_reminder_schedules_enabled_idx 
  ON deadline_reminder_schedules(enabled) 
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS deadline_reminder_schedules_days_before_idx 
  ON deadline_reminder_schedules(days_before);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_deadline_reminder_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deadline_reminder_schedules_updated_at
  BEFORE UPDATE ON deadline_reminder_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_deadline_reminder_schedules_updated_at();

-- RLS Policies
ALTER TABLE deadline_reminder_schedules ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage reminder schedules"
  ON deadline_reminder_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Authenticated users can view enabled schedules (for transparency)
CREATE POLICY "Users can view enabled reminder schedules"
  ON deadline_reminder_schedules FOR SELECT
  TO authenticated
  USING (enabled = true);

-- Create a table to track which reminders have been sent
-- This prevents sending duplicate reminders if the cron runs multiple times
CREATE TABLE IF NOT EXISTS deadline_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES deadline_reminder_schedules(id) ON DELETE CASCADE,
  deadline_id UUID REFERENCES payment_deadlines(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_date DATE DEFAULT CURRENT_DATE, -- Date-only column for unique constraint
  email_log_id UUID REFERENCES email_log(id) ON DELETE SET NULL -- Link to email_log for full details
);

-- Create unique index to prevent duplicate reminders on the same day
-- This ensures we don't send duplicate reminders if the cron runs multiple times
CREATE UNIQUE INDEX IF NOT EXISTS deadline_reminder_log_unique_daily 
  ON deadline_reminder_log(schedule_id, deadline_id, profile_id, sent_date);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS deadline_reminder_log_schedule_deadline_idx 
  ON deadline_reminder_log(schedule_id, deadline_id, sent_date);

CREATE INDEX IF NOT EXISTS deadline_reminder_log_profile_idx 
  ON deadline_reminder_log(profile_id);

CREATE INDEX IF NOT EXISTS deadline_reminder_log_sent_at_idx 
  ON deadline_reminder_log(sent_at);

-- RLS Policies for reminder log
ALTER TABLE deadline_reminder_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view reminder logs"
  ON deadline_reminder_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Users can view their own reminder logs
CREATE POLICY "Users can view own reminder logs"
  ON deadline_reminder_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = deadline_reminder_log.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

