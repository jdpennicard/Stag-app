-- Army Man Game: simple marks (penalty drinks) per participant
-- Any authenticated user can view all marks and add a mark for any profile
CREATE TABLE IF NOT EXISTS army_man_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE army_man_marks ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can see all marks (to show scores)
CREATE POLICY "Authenticated can read army_man_marks"
  ON army_man_marks FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can add a mark (when someone drinks)
CREATE POLICY "Authenticated can insert army_man_marks"
  ON army_man_marks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS army_man_marks_profile_id_idx ON army_man_marks(profile_id);
