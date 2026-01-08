-- Add reminder_days column to email_templates
-- This stores an array of days before deadline to send reminders (e.g., [7, 2])
-- Only used for deadline_reminder templates

ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS reminder_days INTEGER[];

-- Add comment
COMMENT ON COLUMN email_templates.reminder_days IS 'Array of days before deadline to send reminders (e.g., [7, 2] for 7 days and 2 days before). Only used for deadline_reminder event_type.';

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS email_templates_reminder_days_idx 
  ON email_templates USING GIN (reminder_days) 
  WHERE event_type = 'deadline_reminder' AND reminder_days IS NOT NULL;

