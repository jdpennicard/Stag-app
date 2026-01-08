-- Add event_name column to stag_dates table
-- This allows admins to manage the event name in the app instead of using env variables

ALTER TABLE stag_dates 
ADD COLUMN IF NOT EXISTS event_name TEXT;

-- Set default value from existing data if any
UPDATE stag_dates 
SET event_name = 'Owen''s Stag 2026 - Bournemouth'
WHERE event_name IS NULL;

