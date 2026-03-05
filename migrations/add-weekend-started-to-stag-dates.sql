-- Begin weekend: when true, UI only shows Games + Admin (declutter)
ALTER TABLE stag_dates
  ADD COLUMN IF NOT EXISTS weekend_started boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN stag_dates.weekend_started IS 'When true, nav only shows Games and Admin; dashboard and stag-info redirect to /games.';
