-- Allow any authenticated user to read linked profiles (id, full_name) for games
-- e.g. Army Man: show all participants and pick random Lookout
CREATE POLICY "Authenticated can read linked profiles for games"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL);
