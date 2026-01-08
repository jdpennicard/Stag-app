-- Update deadline_reminder_log to work with templates instead of schedules
-- This migration is safe because:
-- 1. The reminder_log table was just created and likely has no data
-- 2. We're only adding columns and updating the index structure
-- 3. The old index is being replaced with a new one

-- Add new columns
ALTER TABLE deadline_reminder_log 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS days_before INTEGER;

-- Migrate data if schedule_id exists (for existing data)
-- Note: This assumes schedules table still exists temporarily
-- If there's no data, this UPDATE will do nothing
UPDATE deadline_reminder_log
SET template_id = (
  SELECT template_id FROM deadline_reminder_schedules 
  WHERE deadline_reminder_schedules.id = deadline_reminder_log.schedule_id
),
days_before = (
  SELECT days_before FROM deadline_reminder_schedules 
  WHERE deadline_reminder_schedules.id = deadline_reminder_log.schedule_id
)
WHERE schedule_id IS NOT NULL AND template_id IS NULL;

-- Drop old unique index first (safe - this is a new table with no data)
-- The index was created in add-deadline-reminder-schedules.sql
DROP INDEX IF EXISTS deadline_reminder_log_unique_daily;

-- Create new unique index with template_id and days_before
-- This replaces the old index that used schedule_id
CREATE UNIQUE INDEX IF NOT EXISTS deadline_reminder_log_unique_daily 
  ON deadline_reminder_log(template_id, deadline_id, profile_id, days_before, sent_date);

-- Note: schedule_id column is kept for now (can't easily drop foreign key constraint)
-- The new code uses template_id and days_before instead

