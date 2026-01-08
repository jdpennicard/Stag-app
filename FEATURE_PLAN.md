# Feature Implementation Plan

## Overview
This document outlines the email notification system implementation.

**Note:** 
- ✅ Supabase keep-alive mechanism has been completed and is now part of the main application.
- ✅ Simplified sign-up with auto-linking (Magic Links) has been completed and is now part of the main application.
- ✅ Email notification system has been completed with full template management, Resend integration, and automated deadline reminders.

---

## 1. Email Notifications System

### Recommended Approach: Resend API
**Why Resend?**
- Modern, developer-friendly API
- Great free tier (3,000 emails/month)
- Excellent deliverability
- Simple React Email templates
- Easy to integrate with Next.js

**Alternative Options:**
- **SendGrid**: More features, but more complex setup
- **Mailgun**: Good for transactional emails
- **Supabase Edge Functions + SMTP**: More control but requires more setup

### Email Events to Implement:

#### 1.1 Sign Up Confirmation
- **Trigger**: When user successfully signs up via `AuthForm.tsx`
- **Content**: Welcome message, link to dashboard, payment instructions
- **Location**: `components/AuthForm.tsx` after successful signup

#### 1.2 Payment Submitted
- **Trigger**: When user submits a payment (`app/api/payments/route.ts`)
- **Content**: Confirmation of payment amount, pending status, what happens next
- **Location**: After successful payment creation

#### 1.3 Payment Approved
- **Trigger**: When admin confirms payment (`app/api/payments/[id]/confirm/route.ts`)
- **Content**: Payment confirmed, updated balance, next steps
- **Location**: After payment status updated to 'confirmed'

#### 1.4 Payment Rejected (Future)
- **Trigger**: When admin rejects payment
- **Content**: Reason for rejection, what to do next

#### 1.5 Deadline Reminders (7 days & 2 days before)
- **Trigger**: Scheduled job that runs daily
- **Logic**: 
  - Check all `payment_deadlines` where `due_date` is 7 or 2 days away
  - For each deadline, check all profiles
  - Calculate: `total_due - (initial_confirmed_paid + sum of confirmed payments)`
  - If remaining > 0, send reminder email
- **Content**: Deadline date, amount remaining, payment instructions
- **Implementation**: Next.js API route + cron job (Vercel Cron or external service)

### Implementation Structure:
```
lib/
  email/
    client.ts          # Resend client setup
    templates/
      welcome.tsx      # Sign up email
      payment-submitted.tsx
      payment-approved.tsx
      deadline-reminder.tsx
    send.ts            # Helper functions to send emails
```

### Database Changes Needed:
- Add `email_sent_at` timestamp to `payments` table (optional, for tracking)
- Add `last_reminder_sent` to `profiles` or create `email_log` table (optional)

---

## Implementation Priority & Order

### Phase 1: Quick Wins
1. ✅ **Supabase Keep-Alive** - ✅ COMPLETED - Prevents project pause via daily cron job
2. ✅ **Email Setup** - ✅ COMPLETED - Resend installed, template system built, admin UI created
3. ✅ **Payment Approval Email** - ✅ COMPLETED - Integrated into payment confirmation flow

### Phase 2: Core Features
4. ✅ **Sign Up Email** - ✅ COMPLETED - Welcome email sent after successful signup
5. ✅ **Payment Submitted Email** - ✅ COMPLETED - Confirmation email sent when user submits payment

### Phase 3: Advanced
7. ✅ **Deadline Reminders** - ✅ COMPLETED - Daily cron job sends reminders based on configurable templates and days
8. ✅ **Email Logging** - ✅ COMPLETED - All emails logged to `email_log` table for tracking

---

## Dependencies to Add

```json
{
  "dependencies": {
    "resend": "^3.0.0",
    "@react-email/components": "^0.0.15",
    "react-email": "^2.0.0"
  }
}
```

---

## Environment Variables Needed

```env
# Email
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com  # Or use Resend's default
# Note: To use a custom domain email (e.g., noreply@yourdomain.com), you need to:
# 1. Add and verify your domain in Resend dashboard
# 2. Set up DNS records (SPF, DKIM, DMARC) as instructed by Resend
# 3. Update EMAIL_FROM to use your verified domain
# This improves deliverability and branding

# Keep-Alive (already implemented - optional)
KEEP_ALIVE_SECRET=your-random-secret-token  # Optional: protects keep-alive endpoint
```

---

## Questions to Consider

1. **Email Domain**: Do you have a custom domain for sending emails? (affects deliverability)
2. **Email Frequency**: How often for deadline reminders? (7 days + 2 days, or also 1 day?)
3. **Cron Service**: Are you deploying to Vercel? (affects keep-alive implementation)

---

## Next Steps

### ✅ Completed Features

1. ✅ **Email Template System**
   - Database tables: `email_templates`, `email_log`
   - Admin UI at `/admin/email-templates` for full CRUD management
   - Variable substitution system with support for profile, payment, and deadline variables
   - Test email functionality

2. ✅ **Resend Integration**
   - Resend client configured in `lib/email/client.ts`
   - Custom domain support (`noreply@owens-stag.com`)
   - Email sending with HTML and plain text fallback

3. ✅ **Payment Approval Email**
   - Integrated into `app/api/payments/[id]/confirm/route.ts`
   - Uses template with event_type `payment_approved`
   - Variables: `{name}`, `{payment_amount}`, `{remaining}`, `{confirmed_paid}`

4. ✅ **Payment Submitted Email**
   - Integrated into `app/api/payments/route.ts`
   - Uses template with event_type `payment_submitted`
   - Variables: `{name}`, `{payment_amount}`, `{payment_date}`, `{payment_status}`

5. ✅ **Payment Rejected Email**
   - Integrated into `app/api/payments/[id]/reject/route.ts`
   - Uses template with event_type `payment_rejected`

6. ✅ **Sign Up Welcome Email**
   - Integrated into signup flow (`app/api/email/send-signup-welcome/route.ts`)
   - Uses template with event_type `signup`
   - Variables: `{name}`, `{dashboard_url}`, `{event_name}`

7. ✅ **Signup Link Email**
   - Integrated into `app/api/admin/send-signup-link/route.ts`
   - Uses template with event_type `signup_link`
   - Includes magic signup link in email

8. ✅ **Deadline Reminder Cron Job**
   - Daily cron job at `/api/cron/deadline-reminders/route.ts`
   - Configured in `vercel.json` to run daily at 9 AM UTC
   - Flexible configuration: Each `deadline_reminder` template can specify reminder days (e.g., 7, 2)
   - Sends to profiles with remaining balance > 0
   - Uses template with event_type `deadline_reminder`
   - Variables: `{name}`, `{days_away}`, `{deadline_date}`, `{remaining}`, `{suggested_amount}`
   - Prevents duplicate sends via `deadline_reminder_log` table

9. ✅ **Email Logging**
   - All emails logged to `email_log` table
   - Tracks template used, recipient, variables, status, and message ID

### 🎯 Optional Enhancements

**Custom Email Domain Setup** (Already Completed)
- ✅ Domain added to Resend dashboard (`owens-stag.com`)
- ✅ DNS records configured (SPF, DKIM, DMARC)
- ✅ `EMAIL_FROM` environment variable set to `noreply@owens-stag.com`
- ✅ Improves deliverability and branding

