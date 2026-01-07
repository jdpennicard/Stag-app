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

## Implementation Priority & Order

### Phase 1: Quick Wins
1. ✅ **Supabase Keep-Alive** - ✅ COMPLETED - Prevents project pause via daily cron job
2. ✅ **Email Setup** - ✅ COMPLETED - Resend installed, template system built, admin UI created
3. ⏳ **Payment Approval Email** - Most immediate value - Next to implement

### Phase 2: Core Features
4. ⏳ **Sign Up Email** - Welcome new users
5. ⏳ **Payment Submitted Email** - Confirm receipt

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

### ✅ Completed
1. ✅ Email template system built (database, admin UI, variable substitution)
2. ✅ Resend integration complete
3. ✅ Test email functionality working

### 🎯 Next Priority (In Order)

**1. Payment Approval Email** (Highest Value)
- Integrate email sending into `app/api/payments/[id]/confirm/route.ts`
- Use template with event_type `payment_approved`
- Send when admin confirms a payment
- Variables: `{name}`, `{payment_amount}`, `{remaining}`, `{confirmed_paid}`

**2. Payment Submitted Email**
- Integrate into `app/api/payments/route.ts`
- Use template with event_type `payment_submitted`
- Send when user submits a payment
- Variables: `{name}`, `{payment_amount}`, `{payment_date}`, `{payment_status}`

**3. Sign Up Welcome Email**
- Integrate into signup flow (magic link or regular signup)
- Use template with event_type `signup`
- Send after successful account creation
- Variables: `{name}`, `{dashboard_url}`, `{event_name}`

**4. Deadline Reminder Cron Job**
- Create `/api/cron/deadline-reminders/route.ts`
- Add to `vercel.json` cron schedule (daily)
- Check deadlines 7 days and 2 days before due date
- Send to profiles with remaining balance > 0
- Use template with event_type `deadline_reminder`
- Variables: `{name}`, `{days_away}`, `{deadline_date}`, `{remaining}`, `{suggested_amount}`

**5. Custom Email Domain Setup** (Optional but Recommended)
- Add domain to Resend dashboard
- Configure DNS records (SPF, DKIM, DMARC)
- Update `EMAIL_FROM` environment variable
- Improves deliverability and branding

