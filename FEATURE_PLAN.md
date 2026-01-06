# Feature Implementation Plan

## Overview
This document outlines the plan for implementing one remaining feature:
1. Email notifications system

**Note:** 
- Supabase keep-alive mechanism has been completed and is now part of the main application.
- Simplified sign-up with auto-linking (Magic Links) has been completed and is now part of the main application.

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

## 2. Simplified Sign-Up with Auto-Linking ✅ COMPLETED

### Implementation Status: ✅ Complete

**What was implemented:**
- ✅ Profile-Based Magic Link system
- ✅ Admin can generate unique signup links for unclaimed profiles
- ✅ Users click link → create account → auto-linked to profile → redirected to dashboard
- ✅ Token-based security with 30-day expiration
- ✅ Handles already-logged-in users (auto-links if valid token)
- ✅ Admin UI with "Get Link" button and copy-to-clipboard functionality

**Files Created:**
- ✅ `migrations/add-signup-token.sql` - Database migration
- ✅ `app/api/admin/generate-signup-link/route.ts` - API to generate links
- ✅ `app/signup/[profileId]/[token]/page.tsx` - Magic link handler page
- ✅ `components/MagicLinkSignup.tsx` - Signup form component
- ✅ Updated `components/AdminContent.tsx` - Added "Get Link" button

**How to Use:**
1. Admin goes to `/admin` panel
2. For any unclaimed profile, click "Get Link" button
3. Copy the generated link and send it to the guest
4. Guest clicks link → creates account → automatically linked → redirected to dashboard

**Database Migration:**
Run `migrations/add-signup-token.sql` in Supabase SQL Editor to add the required columns.

---

## Implementation Priority & Order

### Phase 1: Quick Wins
1. ✅ **Supabase Keep-Alive** - ✅ COMPLETED - Prevents project pause via daily cron job
2. ⏳ **Email Setup** - Install Resend, create basic templates
3. ⏳ **Payment Approval Email** - Most immediate value

### Phase 2: Core Features
4. ⏳ **Sign Up Email** - Welcome new users
5. ⏳ **Payment Submitted Email** - Confirm receipt
6. ⏳ **Magic Link Signup** - Simplify onboarding

### Phase 3: Advanced
7. ⏳ **Deadline Reminders** - Requires cron job setup
8. ⏳ **Email Logging** - Track what was sent when

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

# Keep-Alive (already implemented - optional)
KEEP_ALIVE_SECRET=your-random-secret-token  # Optional: protects keep-alive endpoint
```

---

## Questions to Consider

1. **Email Domain**: Do you have a custom domain for sending emails? (affects deliverability)
2. **Email Frequency**: How often for deadline reminders? (7 days + 2 days, or also 1 day?)
3. **Magic Link Expiry**: How long should signup tokens be valid? (suggest 30 days)
4. **Cron Service**: Are you deploying to Vercel? (affects keep-alive implementation)

---

## Next Steps

1. Review this plan and confirm approach
2. Set up Resend account and get API key
3. Decide on magic link approach (Option A or B)
4. Confirm deployment platform for cron job
5. Start implementation in priority order

