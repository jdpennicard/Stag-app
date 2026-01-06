# Database Migration Guide

This guide explains the order and purpose of all database migrations for the Stag App.

## Initial Setup

**Start here:** Run `supabase-setup.sql` first. This creates all core tables and initial RLS policies.

## Migration Order

If you're setting up a fresh database, run migrations in this order:

### 1. Core Setup (Required)
- **`supabase-setup.sql`** (in root directory)
  - Creates: `profiles`, `payment_deadlines`, `payments` tables
  - Sets up: RLS policies, indexes, admin function
  - **Run this FIRST**

### 2. Additional Features (Optional - run if you need these features)

#### Bookings Tracker Feature
- **`migrations/add-bookings-table.sql`**
  - Creates: `bookings` table for admin expense tracking
- **`migrations/update-bookings-add-paid.sql`**
  - Adds: `paid_so_far` column to bookings
- **`migrations/update-bookings-add-dates.sql`**
  - Adds: `first_payment_date` and `next_payment_date` columns

#### Stag Info Central Feature
- **`migrations/add-stag-info-table.sql`**
  - Creates: `stag_info_posts`, `stag_info_links`, `weekends_plan_items` tables
  - Sets up: RLS policies for these tables
- **`migrations/setup-stag-info-storage.sql`**
  - Sets up: Supabase Storage bucket for file uploads (optional)

#### Payment Enhancements
- **`migrations/add-profile-id-to-payments.sql`**
  - Adds: `profile_id` column to payments table
  - Allows: Admins to add payments for unclaimed profiles

### 3. RLS Policy Fixes (Run if you encounter permission issues)

- **`migrations/fix-claim-profile-rls.sql`**
  - Fixes: Profile claiming RLS policy
- **`migrations/fix-payments-rls-for-profile-id.sql`**
  - Updates: Payment RLS policies to work with `profile_id`
- **`migrations/fix-rls-policy.sql`**
  - Fixes: RLS recursion issues with admin policies
- **`migrations/fix-weekends-plan-rls.sql`**
  - Fixes: RLS policies for weekends_plan_items

## Quick Setup (Minimum Required)

For a basic setup with just payment tracking:

```sql
-- 1. Run the main setup script
-- Copy and paste contents of supabase-setup.sql

-- 2. Optional: Add some payment deadlines
INSERT INTO payment_deadlines (label, due_date, suggested_amount)
VALUES 
  ('Deposit', '2026-01-15', 50.00),
  ('Final Payment', '2026-02-15', 200.00);

-- 3. Optional: Add guests (or do this via admin panel after login)
INSERT INTO profiles (full_name, email, total_due, initial_confirmed_paid)
VALUES 
  ('John Doe', 'john@example.com', 250.00, 0.00),
  ('Jane Smith', 'jane@example.com', 250.00, 0.00);
```

## Full Setup (All Features)

If you want all features (bookings tracker, stag info central):

1. Run `supabase-setup.sql`
2. Run `migrations/add-bookings-table.sql`
3. Run `migrations/update-bookings-add-paid.sql`
4. Run `migrations/update-bookings-add-dates.sql`
5. Run `migrations/add-stag-info-table.sql`
6. Run `migrations/add-profile-id-to-payments.sql`
7. Run `migrations/setup-stag-info-storage.sql` (optional)
8. Run all RLS fix migrations if needed

## Migration Safety

- Most migrations are **idempotent** (safe to run multiple times)
- They use `IF NOT EXISTS` or check for existing objects
- **Always backup your database** before running migrations in production
- Test migrations on a development database first

## Troubleshooting

### "Policy already exists" errors
- These are safe to ignore - the migration is idempotent

### "Column already exists" errors
- These are safe to ignore - the migration has already been applied

### RLS permission errors
- Make sure you've run `supabase-setup.sql` first
- Run the RLS fix migrations if you encounter permission issues
- Check that your Supabase project has RLS enabled

### Admin function errors
- The `is_admin_user()` function is created in `supabase-setup.sql`
- If you get errors, re-run that script

## Production Deployment

When deploying to production:

1. **Backup your database** first
2. Run migrations in order on your production Supabase project
3. Test admin login and guest flows
4. Verify RLS policies are working correctly

## Need Help?

- Check the `migrations/README.md` for more details
- Review the SQL files directly - they're well-commented
- Test in a development environment first


