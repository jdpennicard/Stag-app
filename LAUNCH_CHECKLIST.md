# Launch Checklist

## 🚀 Quick Launch Guide

### For Local Development (Port 3000)

#### Step 1: Environment Setup (5 minutes)
- [ ] Copy `.env.example` to `.env.local`
- [ ] Fill in your Supabase credentials:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Set admin emails: `ADMIN_EMAILS=your-email@example.com`
- [ ] Configure bank details and event name
- [ ] Install dependencies: `npm install`

#### Step 2: Database Setup (10 minutes)
- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Run `supabase-setup.sql` in Supabase SQL Editor
- [ ] Enable Email/Password auth in Supabase dashboard
- [ ] (Optional) Run additional migrations if needed (see `MIGRATION_GUIDE.md`)

#### Step 3: Run Locally (1 minute)
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Sign up with admin email
- [ ] Verify admin panel loads at `/admin`

#### Step 4: Initial Data Setup (5 minutes)
- [ ] Add payment deadlines (via SQL or admin panel):
  ```sql
  INSERT INTO payment_deadlines (label, due_date, suggested_amount)
  VALUES ('Deposit', '2026-01-15', 50.00);
  ```
- [ ] Add guests via admin panel (`/admin`)
- [ ] Test guest signup and profile claiming

**✅ Dev Launch Complete!**

---

### For Production Deployment (Vercel)

#### Pre-Deployment Checklist
- [ ] Code pushed to GitHub
- [ ] All environment variables documented
- [ ] `.env.example` file created ✅
- [ ] Migration guide reviewed ✅
- [ ] Build succeeds: `npm run build` ✅

#### Step 1: Vercel Setup (5 minutes)
- [ ] Create Vercel account
- [ ] Import GitHub repository
- [ ] Configure project settings

#### Step 2: Environment Variables (5 minutes)
Add all variables from `.env.local` to Vercel:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `ADMIN_EMAILS`
- [ ] `NEXT_PUBLIC_STAG_EVENT_NAME`
- [ ] `NEXT_PUBLIC_STAG_CURRENCY`
- [ ] `NEXT_PUBLIC_STAG_BANK_ACCOUNT_NAME`
- [ ] `NEXT_PUBLIC_STAG_BANK_ACCOUNT_NUMBER`
- [ ] `NEXT_PUBLIC_STAG_BANK_SORT_CODE`
- [ ] `NEXT_PUBLIC_STAG_PAYMENT_INSTRUCTION`
- [ ] (Optional) `NEXT_PUBLIC_PAYMENT_DEADLINE`
- [ ] (Optional) `NEXT_PUBLIC_STAG_DATE`

#### Step 3: Database Setup (10 minutes)
- [ ] Create production Supabase project (or use existing)
- [ ] Run `supabase-setup.sql` on production database
- [ ] Run migrations if needed (see `MIGRATION_GUIDE.md`)
- [ ] Verify RLS policies are active
- [ ] Test database connection

#### Step 4: Deploy (2 minutes)
- [ ] Click "Deploy" in Vercel
- [ ] Wait for build to complete
- [ ] Verify deployment URL works

#### Step 5: Post-Deployment Testing (10 minutes)
- [ ] Test landing page loads
- [ ] Test admin signup/login
- [ ] Verify admin panel access
- [ ] Test guest signup
- [ ] Test profile claiming flow
- [ ] Test payment submission
- [ ] Test payment confirmation (as admin)
- [ ] Verify bank details display correctly
- [ ] Check payment calculations are correct

**✅ Production Launch Complete!**

---

## 🔍 Verification Tests

### Admin Flow
1. Sign up with admin email → Should redirect to `/admin`
2. Add a guest → Should appear in profiles table
3. View pending payments → Should see any pending payments
4. Confirm a payment → Should update guest balance

### Guest Flow
1. Sign up with non-admin email → Should redirect to `/claim-profile`
2. Select name from dropdown → Should redirect to `/dashboard`
3. View dashboard → Should see bank details, balance, deadlines
4. Submit payment → Should appear as pending
5. Admin confirms → Balance should update

### Edge Cases
- [ ] Unclaimed profile auto-linking (if email matches)
- [ ] Multiple admins can access admin panel
- [ ] Guests cannot access admin routes
- [ ] Payment calculations are accurate
- [ ] RLS policies prevent unauthorized access

---

## ⚠️ Common Issues & Solutions

### Issue: "Missing Supabase environment variables"
**Solution:** Check `.env.local` exists and has correct variable names (must start with `NEXT_PUBLIC_` for client-side vars)

### Issue: "Unauthorized" errors
**Solution:** Verify RLS policies are set up correctly. Run `supabase-setup.sql` again.

### Issue: "Cannot claim profile"
**Solution:** Check RLS policies. Run `migrations/fix-claim-profile-rls.sql` if needed.

### Issue: Build fails on Vercel
**Solution:** 
- Check all `NEXT_PUBLIC_` variables are set in Vercel
- Verify build succeeds locally first
- Check Vercel build logs for specific errors

### Issue: Admin panel not accessible
**Solution:** 
- Verify email is in `ADMIN_EMAILS` env var
- Check `ensureAdminStatus()` function ran successfully
- Verify profile was created with `is_admin = true`

---

## 📋 Environment Variables Reference

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbGc...` |
| `ADMIN_EMAILS` | Comma-separated admin emails | `admin@example.com,admin2@example.com` |
| `NEXT_PUBLIC_STAG_EVENT_NAME` | Event name | `"Owen's Stag 2026 - Bournemouth"` |
| `NEXT_PUBLIC_STAG_CURRENCY` | Currency code | `GBP` |
| `NEXT_PUBLIC_STAG_BANK_ACCOUNT_NAME` | Bank account name | `"John Doe"` |
| `NEXT_PUBLIC_STAG_BANK_ACCOUNT_NUMBER` | Account number | `12345678` |
| `NEXT_PUBLIC_STAG_BANK_SORT_CODE` | Sort code | `12-34-56` |
| `NEXT_PUBLIC_STAG_PAYMENT_INSTRUCTION` | Payment instruction text | `"Please pay Account 12345678 Sort Code 12-34-56."` |

### Optional Variables
| Variable | Description | Format |
|----------|-------------|--------|
| `NEXT_PUBLIC_PAYMENT_DEADLINE` | Payment deadline date | `YYYY-MM-DD` |
| `NEXT_PUBLIC_STAG_DATE` | Stag event date | `YYYY-MM-DD` |

---

## 📞 Support

- Review `LAUNCH_REVIEW.md` for detailed analysis
- Check `MIGRATION_GUIDE.md` for database setup
- See `README.md` for general documentation
- See `QUICK_START.md` for step-by-step guide


