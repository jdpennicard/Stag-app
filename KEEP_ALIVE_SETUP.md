# Supabase Keep-Alive Setup Guide

## Overview
This feature prevents your Supabase project from being paused due to inactivity by pinging the database daily.

## How It Works
- A cron job calls `/api/cron/keep-alive` once per day
- The endpoint performs a simple database query to keep the connection active
- This prevents Supabase from pausing your project after 1 week of inactivity

## Setup Instructions

### 1. Run the Database Migration
Run the migration to create the keep-alive log table and RPC function:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor** → **New Query**
3. Copy and paste the contents of `migrations/add-keep-alive-log.sql`
4. Click **Run**

### 2. Configure Environment Variables

Add to your `.env.local` (for local development):

```env
# Optional: Secret token to protect the keep-alive endpoint
# If not set, the endpoint will work but won't be secured
KEEP_ALIVE_SECRET=your-random-secret-token-here

# Optional: Supabase Service Role Key (NOT REQUIRED)
# The endpoint will automatically use your existing NEXT_PUBLIC_SUPABASE_ANON_KEY
# Only add this if you want extra reliability (bypasses RLS policies)
# Get this from: Supabase Dashboard → Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Note:** You don't need to add `SUPABASE_SERVICE_ROLE_KEY` if you already have `NEXT_PUBLIC_SUPABASE_ANON_KEY` set. The endpoint will automatically use your existing anon key, which works perfectly fine for this use case. The service role key is only needed if you want to bypass Row Level Security (RLS) policies, but for a simple keep-alive ping, the anon key is sufficient.

**For Vercel deployment:**
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `KEEP_ALIVE_SECRET` (generate a random string)
4. Optionally add `SUPABASE_SERVICE_ROLE_KEY` (recommended)

### 3. Deploy to Vercel

The `vercel.json` file is already configured with a daily cron job:
- **Schedule**: Runs daily at midnight UTC (`0 0 * * *`)
- **Path**: `/api/cron/keep-alive`

After deploying to Vercel:
1. The cron job will be automatically set up
2. You can verify it's working in Vercel Dashboard → **Cron Jobs**

### 4. Test the Endpoint (Optional)

You can manually test the endpoint:

**Without token (if KEEP_ALIVE_SECRET is not set):**
```bash
curl https://your-domain.vercel.app/api/cron/keep-alive
```

**With token:**
```bash
curl "https://your-domain.vercel.app/api/cron/keep-alive?token=your-secret-token"
```

Or with Authorization header:
```bash
curl -H "Authorization: Bearer your-secret-token" https://your-domain.vercel.app/api/cron/keep-alive
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2024-01-15T12:00:00.000Z",
  "message": "Database keep-alive ping successful"
}
```

### 5. Verify It's Working

**Option A: Check Vercel Cron Logs**
- Go to Vercel Dashboard → Your Project → **Cron Jobs**
- You should see successful executions daily

**Option B: Check Database Logs**
- Go to Supabase Dashboard → **Table Editor** → `keep_alive_log`
- You should see a new entry each day

**Option C: Check Application Logs**
- Check Vercel function logs for the keep-alive endpoint
- Should show successful pings

## Alternative: External Cron Service

If you're not using Vercel, you can use an external cron service:

1. **cron-job.org** (free tier available)
   - Create account
   - Add new cron job
   - URL: `https://your-domain.com/api/cron/keep-alive?token=your-secret-token`
   - Schedule: Daily at midnight UTC

2. **EasyCron** (free tier available)
   - Similar setup to cron-job.org

3. **UptimeRobot** (free tier available)
   - Can be used as a cron service

## Troubleshooting

### Endpoint returns 401 Unauthorized
- Make sure `KEEP_ALIVE_SECRET` is set in your environment variables
- Verify the token in your cron job URL matches the secret

### Endpoint returns errors
- Check that the migration has been run (`keep_alive_log` table exists)
- Verify Supabase environment variables are set correctly
- Check Vercel function logs for detailed error messages

### Cron job not running
- Verify `vercel.json` is in your project root
- Check Vercel Dashboard → Cron Jobs to see if it's registered
- Make sure you've deployed after adding `vercel.json`

## Security Notes

- **Recommended**: Always set `KEEP_ALIVE_SECRET` in production
- The endpoint is intentionally lightweight and doesn't expose sensitive data
- Using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS, which is safe for this read-only operation
- The endpoint returns 200 even on errors to prevent cron services from thinking it failed

## Cost Impact

- **Free**: This feature uses minimal resources
- The daily ping is a simple query that costs virtually nothing
- The log table will grow slowly (1 row per day), but you can clean it periodically if needed

