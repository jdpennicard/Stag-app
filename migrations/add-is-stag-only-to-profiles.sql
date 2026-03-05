-- Stag-only profile: user only sees games (Army Man, etc.), no payments, no Stag Info, no admin
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_stag_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.is_stag_only IS 'When true, user only has access to games (e.g. Army Man); no dashboard, Stag Info, or admin.';
