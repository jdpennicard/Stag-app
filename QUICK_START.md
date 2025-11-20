npmnpm # Quick Start Guide

## 30-Minute Setup to Production

### Step 1: Supabase Setup (10 minutes)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready
3. Go to **SQL Editor** → **New Query**
4. Copy and paste the entire contents of `supabase-setup.sql`
5. Click **Run** to create all tables and policies
6. Go to **Authentication** → **Providers** → Enable **Email** provider
7. Go to **Settings** → **API** and copy:
   - Project URL
   - `anon` `public` key

### Step 2: Local Setup (5 minutes)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=paste_your_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_your_key_here

   ADMIN_EMAILS=your-email@example.com

   NEXT_PUBLIC_STAG_EVENT_NAME="Owen's Stag 2026 - Bournemouth"
   NEXT_PUBLIC_STAG_CURRENCY="GBP"
   NEXT_PUBLIC_STAG_BANK_ACCOUNT_NAME="Your Name"
   NEXT_PUBLIC_STAG_BANK_ACCOUNT_NUMBER="12345678"
   NEXT_PUBLIC_STAG_BANK_SORT_CODE="12-34-56"
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

### Step 3: Initial Setup (5 minutes)

1. **Sign up** with an email listed in `ADMIN_EMAILS`
2. You'll be automatically made an admin
3. Go to `/admin` (or you'll be redirected there)
4. **Add payment deadlines** (optional - you can do this via Supabase SQL):
   ```sql
   INSERT INTO payment_deadlines (label, due_date, suggested_amount)
   VALUES 
     ('Deposit', '2026-01-15', 50.00),
     ('Final Payment', '2026-02-15', 200.00);
   ```
5. **Add guests** via the admin panel:
   - Click "Add Guest"
   - Enter name, email (optional), total due, and any initial confirmed paid amount
   - Repeat for all guests

### Step 4: Deploy to Vercel (10 minutes)

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-github-repo-url
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com)
3. Click **Add New Project**
4. Import your GitHub repository
5. Add all environment variables from `.env.local`
6. Click **Deploy**
7. Wait for deployment to complete
8. Your app is live! 🎉

### Step 5: Test the Flow

1. **As Admin:**
   - Log in → Should see admin panel
   - Add a test guest
   - Log out

2. **As Guest:**
   - Sign up with a new email (not in ADMIN_EMAILS)
   - You'll see the "Select Your Name" page
   - Select the test guest you created
   - View dashboard, submit a test payment
   - Log out

3. **Back as Admin:**
   - Log in
   - Go to admin panel
   - See the pending payment
   - Click "Confirm"
   - Check that the guest's balance updates

## Troubleshooting

- **"Unauthorized" errors**: Make sure RLS policies are set up correctly in Supabase
- **Can't see admin panel**: Check that your email is in `ADMIN_EMAILS` env var
- **Database errors**: Verify you ran the SQL setup script completely
- **Build errors on Vercel**: Make sure all env vars with `NEXT_PUBLIC_` prefix are set

## Next Steps

- Customize the styling in `app/globals.css`
- Add more payment deadlines via Supabase or admin panel
- Set up email notifications (optional - see dev plan)
- Share the app URL with guests!

