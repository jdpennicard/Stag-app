# Troubleshooting: Signup Link Generation

## Error: "Failed to generate signup link"

### Most Common Cause: Migration Not Run

The signup token feature requires database columns that are added via migration. If you see this error, the most likely cause is that the migration hasn't been run yet.

**Solution:**
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** → **New Query**
3. Copy and paste the entire contents of `migrations/add-signup-token.sql`
4. Click **Run**
5. Try generating a signup link again

### Other Possible Issues

#### 1. RLS Policy Issues
If the migration has been run but you still get errors, check:
- Make sure you're logged in as an admin
- Verify your email is in the `ADMIN_EMAILS` environment variable
- Check that the "Admins can manage all profiles" RLS policy exists

#### 2. Database Connection Issues
- Check your Supabase connection in the browser console
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly

#### 3. Profile Already Claimed
- You can only generate signup links for unclaimed profiles (where `user_id` is NULL)
- If a profile is already linked, you'll get a specific error message

### Verifying the Migration

To check if the migration has been run, execute this in Supabase SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('signup_token', 'signup_token_expires_at');
```

If you see both columns, the migration has been run. If not, run the migration.

### Getting More Details

The error message should now include more details. Check:
- Browser console for full error details
- Network tab to see the API response
- The error message displayed in the admin panel

