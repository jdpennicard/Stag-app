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

-- Allow inserts from anyone (anon key, service role, etc.)
-- This is safe since it's just a log table with no sensitive data
CREATE POLICY "Allow keep-alive inserts"
  ON keep_alive_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create a simple RPC function for keep-alive ping
-- This is the most efficient way to ping the database
-- SECURITY DEFINER allows it to bypass RLS when inserting
CREATE OR REPLACE FUNCTION keep_alive_ping()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the ping (this will bypass RLS due to SECURITY DEFINER)
  INSERT INTO keep_alive_log (pinged_at) VALUES (NOW());
  -- Return 1 to indicate success
  RETURN 1;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION keep_alive_ping() TO anon, authenticated;

