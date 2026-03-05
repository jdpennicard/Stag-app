-- Allow authenticated users to reset (delete all) army man marks
CREATE POLICY "Authenticated can delete army_man_marks"
  ON army_man_marks FOR DELETE
  TO authenticated
  USING (true);
