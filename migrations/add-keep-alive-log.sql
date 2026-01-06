-- Create keep_alive_log table for tracking database pings
-- This helps verify that the keep-alive mechanism is working

CREATE TABLE IF NOT EXISTS keep_alive_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pinged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS keep_alive_log_pinged_at_idx ON keep_alive_log(pinged_at DESC);

-- Optional: Add RLS (Row Level Security) - allow all authenticated users to read
-- Since this is just a log table, we can make it readable by all
ALTER TABLE keep_alive_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view keep-alive logs"
  ON keep_alive_log FOR SELECT
  TO authenticated
  USING (true);

-- Note: Only the keep-alive endpoint should insert, so we don't need an insert policy
-- The endpoint uses service role or bypasses RLS

-- Create a simple RPC function for keep-alive ping
-- This is the most efficient way to ping the database
CREATE OR REPLACE FUNCTION keep_alive_ping()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the ping
  INSERT INTO keep_alive_log (pinged_at) VALUES (NOW());
  -- Return 1 to indicate success
  RETURN 1;
END;
$$;

