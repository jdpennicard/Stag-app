-- Tracks last_used_at per item index (0-199) for "back of the line" random pick
CREATE TABLE IF NOT EXISTS headbands_usage (
  item_index smallint PRIMARY KEY,
  last_used_at timestamptz
);

-- Seed 200 rows (indices 0-199)
INSERT INTO headbands_usage (item_index)
SELECT generate_series(0, 199)
ON CONFLICT (item_index) DO NOTHING;

ALTER TABLE headbands_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read headbands_usage"
  ON headbands_usage FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can update headbands_usage"
  ON headbands_usage FOR UPDATE TO authenticated USING (true);
