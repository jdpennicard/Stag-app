# Database Migrations

This folder contains SQL migration scripts for the Stag App database.

## Setup Scripts

- **supabase-setup.sql** (in root) - Main setup script with all tables and initial RLS policies. Run this first.

## Migration Scripts (run in order if needed)

1. **add-bookings-table.sql** - Creates the bookings table
2. **update-bookings-add-paid.sql** - Adds `paid_so_far` column to bookings
3. **update-bookings-add-dates.sql** - Adds `first_payment_date` and `next_payment_date` columns
4. **add-stag-info-table.sql** - Creates tables for Stag Info Central (posts, links, weekends_plan_items)
5. **add-profile-id-to-payments.sql** - Adds `profile_id` column to payments table
6. **fix-claim-profile-rls.sql** - Adds RLS policy for claiming unclaimed profiles
7. **fix-payments-rls-for-profile-id.sql** - Updates RLS policies for payments with profile_id
8. **fix-rls-policy.sql** - Fixes RLS recursion issues with admin policies
9. **fix-weekends-plan-rls.sql** - Fixes RLS policies for weekends_plan_items
10. **setup-stag-info-storage.sql** - Sets up Supabase Storage bucket for stag-info-files (if needed)
11. **add-keep-alive-log.sql** - Creates keep-alive log table and RPC function to prevent Supabase project pausing
12. **add-signup-token.sql** - Adds signup_token and signup_token_expires_at columns for magic link signup
13. **fix-signup-token-rls.sql** - Adds RLS policy to allow viewing profiles with valid signup tokens (required for magic links to work)
14. **add-email-templates.sql** - Creates email_templates and email_log tables for admin-managed email templates with variable substitution
15. **add-reminder-days-to-templates.sql** - Adds `reminder_days` column to email_templates for deadline reminder configuration
16. **create-deadline-reminder-log.sql** - Creates deadline_reminder_log table to track sent reminder emails and prevent duplicates
17. **update-reminder-log-for-templates.sql** - Updates deadline_reminder_log table to work with templates instead of separate schedules table (run after #16)
18. **add-stag-dates.sql** - Creates stag_dates table to store stag/hen event start and end dates (replaces NEXT_PUBLIC_STAG_DATE env variable)
19. **fix-payment-deadlines-rls.sql** - Fixes RLS policy for payment_deadlines table to properly support UPDATE operations (adds WITH CHECK clause)
20. **add-event-name.sql** - Adds event_name column to stag_dates table to allow admins to manage event name in-app

## Notes

- Most of these migrations are idempotent (can be run multiple times safely)
- Always backup your database before running migrations
- Run migrations in the Supabase SQL Editor
- The keep-alive migration is optional but recommended to prevent Supabase free tier projects from pausing

## Migration Order Summary

**For a fresh database setup:**
1. Run `supabase-setup.sql` first (in root directory)
2. Run migrations in numerical order (1-16) as listed above
3. All migrations can be run in a single session if needed

**For existing databases:**
- Check which features you need and run only the relevant migrations
- Email templates (14-16) are required for the email notification system

