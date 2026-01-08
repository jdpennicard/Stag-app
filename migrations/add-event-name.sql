-- Add event_name column to stag_dates table
-- This allows admins to manage the event name in the app instead of using env variables

ALTER TABLE stag_dates 
ADD COLUMN IF NOT EXISTS event_name TEXT;

-- Set default value if any existing records
UPDATE stag_dates 
SET event_name = 'YOUR EVENT NAME'
WHERE event_name IS NULL;

