-- Create stag_dates table to store stag/hen event dates
-- This replaces the need for NEXT_PUBLIC_STAG_DATE environment variable
CREATE TABLE IF NOT EXISTS stag_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default row if none exists
INSERT INTO stag_dates (start_date, end_date)
SELECT '2026-03-06', '2026-03-08'
WHERE NOT EXISTS (SELECT 1 FROM stag_dates);

-- Enable Row Level Security
ALTER TABLE stag_dates ENABLE ROW LEVEL SECURITY;

-- Everyone can read stag dates (for dashboard display)
CREATE POLICY "Anyone can view stag dates"
  ON stag_dates
  FOR SELECT
  USING (true);

-- Only admins can update stag dates
CREATE POLICY "Admins can update stag dates"
  ON stag_dates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admins can insert stag dates
CREATE POLICY "Admins can insert stag dates"
  ON stag_dates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Service role can do everything (for cron jobs)
CREATE POLICY "Service role can manage stag dates"
  ON stag_dates
  FOR ALL
  USING (true)
  WITH CHECK (true);

