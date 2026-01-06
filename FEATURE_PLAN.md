# Feature Implementation Plan

## Overview
This document outlines the plan for implementing three key features:
1. Email notifications system
2. Simplified sign-up with auto-linking
3. Supabase keep-alive mechanism

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

## 2. Simplified Sign-Up with Auto-Linking

### Current Flow:
1. User signs up → creates auth account
2. System checks for profile by email → auto-links if found
3. If no match → redirects to `/claim-profile` to manually select

### Enhanced Flow with Magic Links:

#### Option A: Profile-Based Magic Link (Recommended)
**How it works:**
1. Admin creates guest profile with email
2. Admin generates a unique signup link: `/signup/[profileId]/[token]`
3. User clicks link → auto-creates account → auto-links to profile → redirects to dashboard

**Benefits:**
- Zero friction for users
- No need to remember which name to select
- Secure (token-based)

**Implementation:**
- Add `signup_token` and `signup_token_expires_at` to `profiles` table
- Create API route: `app/api/admin/generate-signup-link/route.ts`
- Create page: `app/signup/[profileId]/[token]/page.tsx`
- Admin UI: Button to generate/copy link for each unclaimed profile

#### Option B: Email-Based Magic Link
**How it works:**
1. Admin sends magic link via email (using email system from #1)
2. Link contains encrypted profile ID
3. User clicks → auto-signs up → auto-links

**Benefits:**
- Even simpler for admin (one-click send)
- Email already contains context

### Database Changes:
```sql
ALTER TABLE profiles 
ADD COLUMN signup_token TEXT,
ADD COLUMN signup_token_expires_at TIMESTAMPTZ,
ADD INDEX profiles_signup_token_idx (signup_token);
```

### New Files Needed:
- `app/signup/[profileId]/[token]/page.tsx` - Magic link handler
- `app/api/admin/generate-signup-link/route.ts` - Generate tokens
- Update `components/AdminContent.tsx` - Add "Send Signup Link" button

---

## 3. Supabase Keep-Alive Mechanism

### Problem:
Supabase free tier pauses projects after 1 week of inactivity. We need to ping the database regularly.

### Solution Options:

#### Option A: Vercel Cron Job (Recommended if on Vercel)
**How it works:**
- Create API route: `app/api/cron/keep-alive/route.ts`
- Configure Vercel Cron to hit this endpoint daily
- Endpoint performs a simple database query (e.g., `SELECT 1`)

**Implementation:**
1. Create `app/api/cron/keep-alive/route.ts`
2. Add `vercel.json` with cron configuration:
```json
{
  "crons": [{
    "path": "/api/cron/keep-alive",
    "schedule": "0 0 * * *"
  }]
}
```

**Security:**
- Add secret token check: `?token=YOUR_SECRET_TOKEN`
- Or use Vercel's built-in cron authentication

#### Option B: External Cron Service
- Use services like **cron-job.org**, **EasyCron**, or **UptimeRobot**
- Point to your API endpoint
- Free tiers available

#### Option C: Database Function + Scheduled Job
- Create a Supabase Edge Function
- Use Supabase's pg_cron extension (if available)
- More complex but fully self-contained

### Recommended Implementation:
**File**: `app/api/cron/keep-alive/route.ts`
```typescript
// Simple query that keeps database active
// Can also log to a `keep_alive_log` table for tracking
```

**Database Table (Optional):**
```sql
CREATE TABLE keep_alive_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pinged_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Implementation Priority & Order

### Phase 1: Quick Wins (Today)
1. ✅ **Supabase Keep-Alive** - Easiest, prevents project pause
2. ✅ **Email Setup** - Install Resend, create basic templates
3. ✅ **Payment Approval Email** - Most immediate value

### Phase 2: Core Features (Today)
4. ✅ **Sign Up Email** - Welcome new users
5. ✅ **Payment Submitted Email** - Confirm receipt
6. ✅ **Magic Link Signup** - Simplify onboarding

### Phase 3: Advanced (Later)
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

# Keep-Alive (optional)
KEEP_ALIVE_SECRET=your-random-secret-token
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

