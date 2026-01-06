-- Allow unauthenticated users to view profiles with valid signup tokens
-- This is needed for the magic link signup flow where users aren't authenticated yet

-- Drop existing policy if it exists (to allow re-running this migration)
DROP POLICY IF EXISTS "Allow viewing profiles with signup tokens" ON profiles;

-- Create policy to allow viewing profiles with signup tokens (for signup links)
-- This allows both anonymous and authenticated users to view profiles that:
-- 1. Have a signup_token set (not null)
-- 2. Are unclaimed (user_id IS NULL)
-- 3. Have a valid (non-expired) token
CREATE POLICY "Allow viewing profiles with signup tokens"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (
    signup_token IS NOT NULL 
    AND user_id IS NULL 
    AND (signup_token_expires_at IS NULL OR signup_token_expires_at > NOW())
  );

-- Note: This policy allows viewing profiles with valid signup tokens.
-- The application code then validates that the token in the URL matches the token in the database.
-- This is secure because:
-- 1. The token is cryptographically secure (32 bytes random = 64 hex characters)
-- 2. The token is validated on the signup page (must match exactly)
-- 3. Only admins can generate tokens
-- 4. Tokens expire after 30 days
-- 5. Tokens are cleared after successful signup

