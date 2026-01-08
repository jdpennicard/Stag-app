# Stag App - Comprehensive Web Application Analysis

## Executive Summary

**Application Name:** Stag Payments Web App  
**Purpose:** A production-ready web application for managing payments, bookings, and event information for stag/hen parties (currently deployed for "Owen's Stag 2026 - Bournemouth").  
**Status:** Live in production, deployed on Vercel with custom domain (`owens-stag.com`)  
**Target Users:** Event organizers (admins) and event attendees (guests)

---

## 1. Technology Stack

### Frontend
- **Framework:** Next.js 14.0.4 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 3.3.0
- **UI Pattern:** Server-side rendering with client-side interactivity

### Backend
- **API:** Next.js API Routes (Route Handlers)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (Email/Password)
- **Row Level Security (RLS):** Enabled on all tables for data access control

### Third-Party Services
- **Email Service:** Resend API (v6.6.0)
  - Custom domain: `noreply@owens-stag.com`
  - Template management system
- **Hosting:** Vercel
  - Production environment
  - Preview deployments for feature branches
  - Cron jobs configured via `vercel.json`
- **Domain:** Custom domain configured (`owens-stag.com`)

### Key Dependencies
```json
{
  "@supabase/auth-helpers-nextjs": "^0.8.7",
  "@supabase/supabase-js": "^2.39.0",
  "next": "14.0.4",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "resend": "^6.6.0"
}
```

---

## 2. Application Architecture

### Project Structure
```
├── app/
│   ├── api/                    # API routes (Next.js Route Handlers)
│   │   ├── admin/              # Admin-only endpoints
│   │   ├── cron/               # Scheduled job endpoints
│   │   ├── payments/           # Payment management
│   │   ├── profile/            # Profile management
│   │   ├── email/              # Email sending
│   │   └── stag-info/          # Event information
│   ├── admin/                  # Admin panel pages
│   │   └── [tab]/              # Tabbed admin interface
│   ├── dashboard/              # Guest dashboard
│   ├── claim-profile/          # Profile claiming page
│   ├── signup/                 # Magic link signup
│   ├── stag-info/              # Event information hub
│   └── page.tsx                # Landing/auth page
├── components/                 # React components
│   ├── admin-tabs/             # Admin panel tab components
│   └── [various components]    # UI components
├── lib/                        # Utilities and helpers
│   ├── supabase/              # Supabase client configuration
│   ├── email/                  # Email system (client, templates, variables)
│   ├── auth.ts                 # Authentication helpers
│   └── event-name.ts           # Event name helper
├── migrations/                 # Database migration scripts (20+ files)
└── vercel.json                 # Vercel configuration (cron jobs)
```

### Authentication Flow
1. **Standard Signup/Login:** Email/password via Supabase Auth
2. **Magic Link Signup:** Admin generates unique signup link → Guest clicks → Creates password → Auto-links profile → Redirects to dashboard
3. **Profile Claiming:** If user not auto-linked, they select their name from a dropdown of unclaimed profiles
4. **Admin Detection:** Users with emails in `ADMIN_EMAILS` environment variable are marked as admins

### Data Access Control
- **Row Level Security (RLS):** All tables have RLS policies
- **Admin Access:** Admins can manage all data via `is_admin` flag in profiles
- **Guest Access:** Guests can only view/edit their own profile and payments
- **Service Role:** Used for cron jobs to bypass RLS when needed

---

## 3. Database Schema

### Core Tables

#### `profiles`
- **Purpose:** Stores guest/attendee information
- **Key Fields:**
  - `id` (UUID, primary key)
  - `user_id` (UUID, references `auth.users`, nullable until claimed)
  - `full_name` (TEXT, required)
  - `email` (TEXT, nullable)
  - `is_admin` (BOOLEAN, default false)
  - `total_due` (NUMERIC(10,2), total amount owed)
  - `initial_confirmed_paid` (NUMERIC(10,2), pre-app payments)
  - `signup_token` (TEXT, for magic links)
  - `signup_token_expires_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ)

#### `payments`
- **Purpose:** Tracks payment submissions and confirmations
- **Key Fields:**
  - `id` (UUID, primary key)
  - `user_id` (UUID, references `auth.users`, nullable)
  - `profile_id` (UUID, references `profiles`, nullable - for unclaimed profiles)
  - `deadline_id` (UUID, references `payment_deadlines`, nullable)
  - `amount` (NUMERIC(10,2), required)
  - `status` (ENUM: 'pending', 'confirmed', 'rejected')
  - `note` (TEXT, optional payment notes)
  - `created_at` (TIMESTAMPTZ)
  - `confirmed_at` (TIMESTAMPTZ, nullable)
  - `confirmed_by` (UUID, references `auth.users`, nullable)

#### `payment_deadlines`
- **Purpose:** Payment deadline schedule
- **Key Fields:**
  - `id` (UUID, primary key)
  - `label` (TEXT, e.g., "Deposit", "Final Payment")
  - `due_date` (DATE, required)
  - `suggested_amount` (NUMERIC(10,2), nullable)
  - `created_at` (TIMESTAMPTZ)
- **Note:** Currently simplified to manage a single deadline

#### `stag_dates`
- **Purpose:** Event start/end dates and event name
- **Key Fields:**
  - `id` (UUID, primary key)
  - `start_date` (DATE, required)
  - `end_date` (DATE, nullable)
  - `event_name` (TEXT, required, default: "YOUR EVENT NAME")
  - `created_at` (TIMESTAMPTZ)
  - `updated_at` (TIMESTAMPTZ)

#### `bookings`
- **Purpose:** Admin-tracked bookings/expenses
- **Key Fields:**
  - `id` (UUID, primary key)
  - `description` (TEXT, required)
  - `location` (TEXT, nullable)
  - `booked_by` (UUID, references `auth.users`)
  - `cost` (NUMERIC(10,2), required)
  - `paid_so_far` (NUMERIC(10,2), default 0)
  - `first_payment_date` (DATE, nullable)
  - `next_payment_date` (DATE, nullable)
  - `notes` (TEXT, nullable)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

#### `stag_info_posts`
- **Purpose:** Posts for "Stag Info Central" information hub
- **Key Fields:**
  - `id` (UUID, primary key)
  - `headline` (TEXT, required)
  - `content` (TEXT, nullable)
  - `created_by` (UUID, references `auth.users`)
  - `is_pinned` (BOOLEAN, default false)
  - `order_index` (INTEGER, default 0)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

#### `stag_info_links`
- **Purpose:** Links associated with posts
- **Key Fields:**
  - `id` (UUID, primary key)
  - `post_id` (UUID, references `stag_info_posts`)
  - `title` (TEXT, required)
  - `url` (TEXT, required)
  - `created_at` (TIMESTAMPTZ)

#### `weekends_plan_items`
- **Purpose:** Weekend itinerary items by date
- **Key Fields:**
  - `id` (UUID, primary key)
  - `day_date` (DATE, required)
  - `title` (TEXT, required)
  - `description` (TEXT, nullable)
  - `time` (TIME, nullable)
  - `location` (TEXT, nullable)
  - `order_index` (INTEGER, default 0)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

### Email System Tables

#### `email_templates`
- **Purpose:** Admin-managed email templates with variable substitution
- **Key Fields:**
  - `id` (UUID, primary key)
  - `name` (TEXT, unique, e.g., "signup_welcome", "payment_approved")
  - `subject` (TEXT, required, supports variables like `{name}`)
  - `body_text` (TEXT, required, plain text version)
  - `body_html` (TEXT, nullable, HTML version)
  - `description` (TEXT, nullable, admin notes)
  - `event_type` (TEXT, required, e.g., "signup", "payment_submitted", "deadline_reminder")
  - `reminder_days` (INTEGER, nullable, for deadline reminders)
  - `enabled` (BOOLEAN, default true)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

#### `email_log`
- **Purpose:** Log of all emails sent through the system
- **Key Fields:**
  - `id` (UUID, primary key)
  - `template_id` (UUID, references `email_templates`, nullable)
  - `template_name` (TEXT, for historical reference)
  - `recipient_email` (TEXT, required)
  - `recipient_name` (TEXT, nullable)
  - `subject` (TEXT, required)
  - `body_text`, `body_html` (TEXT, nullable)
  - `variables_used` (JSONB, stores substituted variables)
  - `status` (TEXT: 'pending', 'sent', 'failed')
  - `error_message` (TEXT, nullable)
  - `sent_at` (TIMESTAMPTZ, nullable)
  - `created_at` (TIMESTAMPTZ)

#### `deadline_reminder_log`
- **Purpose:** Tracks sent deadline reminder emails to prevent duplicates
- **Key Fields:**
  - `id` (UUID, primary key)
  - `deadline_id` (UUID, references `payment_deadlines`)
  - `profile_id` (UUID, references `profiles`)
  - `template_id` (UUID, references `email_templates`)
  - `email_log_id` (UUID, references `email_log`)
  - `sent_date` (DATE, default CURRENT_DATE)
  - `created_at` (TIMESTAMPTZ)

### Utility Tables

#### `keep_alive_log`
- **Purpose:** Logs keep-alive pings to prevent Supabase free tier pausing
- **Key Fields:**
  - `id` (UUID, primary key)
  - `pinged_at` (TIMESTAMPTZ, default now())
  - `status` (TEXT, default 'success')

---

## 4. Feature Set

### 4.1 Guest Features

#### Authentication & Profile Management
- ✅ **Email/Password Signup & Login** via Supabase Auth
- ✅ **Magic Link Signup** - Zero-friction onboarding via admin-generated links
- ✅ **Profile Claiming** - Manual selection from unclaimed profiles dropdown
- ✅ **Auto-Linking** - Automatic profile linking by email match
- ✅ **Password Reset** - Admin-initiated password reset emails

#### Dashboard (`/dashboard`)
- ✅ **Event Information Display**
  - Event name (database-driven, fallback to "YOUR EVENT NAME")
  - Stag countdown (based on `start_date` from `stag_dates`)
  - Payment deadline countdown (conditional display)
- ✅ **Bank Details Display**
  - Account name, number, sort code
  - Payment instructions
- ✅ **Payment Summary Cards**
  - Total Due
  - Confirmed Paid (initial + confirmed payments)
  - Pending Payments
  - Remaining Balance
- ✅ **Payment Deadlines Table**
  - Deadline label, due date, suggested amount
  - Conditional display (only if deadline exists)
- ✅ **Payment Submission**
  - "I've made a payment" form
  - Fields: Amount, Deadline (optional), Note (optional)
  - Creates pending payment record
- ✅ **Payment History**
  - List of all payments (pending, confirmed, rejected)
  - Status indicators
  - Dates and notes

#### Stag Info Central (`/stag-info`)
- ✅ **Information Hub**
  - Posts with headlines and content
  - Pinned posts support
  - Ordering via `order_index`
  - Links associated with posts
  - Weekend itinerary by date
  - Time and location for itinerary items

### 4.2 Admin Features

#### Admin Panel (`/admin/[tab]`)
Tabbed interface with 5 main sections:

##### Event Info Tab
- ✅ **Event Name Management**
  - Simple input field
  - Updates `stag_dates.event_name`
  - Used throughout app and emails
- ✅ **Stag/Hen Dates Management**
  - Start date and end date inputs
  - Updates `stag_dates` table
  - Used for countdown calculations
- ✅ **Payment Deadlines Management**
  - Single deadline management (simplified)
  - Date picker for due date
  - Label field
  - CRUD operations

##### Attendees Tab
- ✅ **Guest Management**
  - Add new guest (name, email, total due, initial confirmed paid)
  - Edit guest information (inline editing)
  - Delete guest (with auth user cleanup)
  - View account status (claimed/unclaimed)
- ✅ **Email & Signup Management**
  - Add email to guest profile
  - Generate signup link (magic link)
  - Send signup link via email
  - Reset password (sends reset email)
- ✅ **Actions Dropdown**
  - Three-dot menu for each guest
  - Options: Edit, Delete, Reset Password, Get Link, Send Link

##### Payments Tab
- ✅ **Overall Progress Bar**
  - Total across all attendees
  - Visual progress indicator
- ✅ **Payment Overview Table**
  - Columns: Name, Total Due, Confirmed Paid, % Paid, Remaining, Pending Payment, Actions
  - Shows all guests with payment status
- ✅ **Pending Payments Column**
  - Highlights unconfirmed payments
  - Shows pending amount per guest
- ✅ **Add Payment**
  - Admin can add payments for any guest
  - Dropdown to select from attendees
  - Amount, deadline, note fields
- ✅ **Edit Payment**
  - Inline editing of "Total Due"
  - Change name (reassign to different attendee)
  - Dropdown selection from attendees list

##### Bookings Tab
- ✅ **Bookings Tracker**
  - Add/edit/delete bookings
  - Track costs, paid amounts, payment dates
  - Location and notes fields
  - Admin-only access

##### Email Templates Tab
- ✅ **Template Management**
  - Full CRUD for email templates
  - Create/edit templates with HTML and plain text
  - Variable substitution system
  - Enable/disable templates
  - Test email functionality
- ✅ **Available Variables**
  - Profile: `{name}`, `{email}`, `{total_due}`, `{confirmed_paid}`, `{remaining}`
  - Payment: `{payment_amount}`, `{payment_date}`, `{payment_status}`, `{payment_note}`
  - Deadline: `{deadline_date}`, `{days_away}`, `{suggested_amount}`
  - Event: `{event_name}`, `{dashboard_url}`
- ✅ **Event Types**
  - `signup` - Welcome email after signup
  - `signup_link` - Magic link email
  - `payment_submitted` - Payment submission confirmation
  - `payment_approved` - Payment confirmation
  - `payment_rejected` - Payment rejection
  - `deadline_reminder` - Automated deadline reminders

### 4.3 Automated Features

#### Cron Jobs (Vercel)
- ✅ **Keep-Alive Mechanism** (`/api/cron/keep-alive`)
  - Runs daily at midnight UTC
  - Prevents Supabase free tier from pausing
  - Logs pings to `keep_alive_log` table
- ✅ **Deadline Reminders** (`/api/cron/deadline-reminders`)
  - Runs daily at 9 AM UTC
  - Iterates through `deadline_reminder` templates
  - Checks for deadlines matching `today + reminder_days`
  - Sends emails to profiles with remaining balance > 0
  - Prevents duplicates via `deadline_reminder_log`
  - Includes admins in reminder emails

### 4.4 Email System

#### Email Service Integration
- ✅ **Resend API** integration
- ✅ **Custom Domain** (`noreply@owens-stag.com`)
- ✅ **DNS Configuration** (SPF, DKIM, DMARC records)

#### Email Triggers
- ✅ **Signup Welcome** - After successful account creation
- ✅ **Signup Link** - When admin sends magic link
- ✅ **Payment Submitted** - When guest submits payment
- ✅ **Payment Approved** - When admin confirms payment
- ✅ **Payment Rejected** - When admin rejects payment
- ✅ **Deadline Reminders** - Automated based on template configuration

#### Email Features
- ✅ **Template System** - Database-driven templates
- ✅ **Variable Substitution** - Dynamic content insertion
- ✅ **HTML & Plain Text** - Dual format support
- ✅ **Email Logging** - All emails logged to `email_log`
- ✅ **Test Emails** - Admin can send test emails from template UI

---

## 5. API Endpoints

### Admin Endpoints (`/api/admin/*`)

#### Guest Management
- `GET /api/admin/profiles` - Get all profiles with payment totals
- `POST /api/admin/add-guest` - Create new guest profile
- `PATCH /api/admin/update-guest/[id]` - Update guest information
- `DELETE /api/admin/delete-guest/[id]` - Delete guest (with auth cleanup)

#### Signup & Authentication
- `POST /api/admin/generate-signup-link` - Generate magic signup link
- `POST /api/admin/send-signup-link` - Generate and send signup link via email
- `POST /api/admin/reset-password` - Send password reset email
- `POST /api/admin/link-profile-by-email` - Manually link profile by email

#### Event Management
- `GET /api/admin/deadlines` - Get all payment deadlines
- `POST /api/admin/deadlines` - Create/update payment deadline
- `GET /api/admin/deadlines/[id]` - Get single deadline
- `PATCH /api/admin/deadlines/[id]` - Update deadline
- `DELETE /api/admin/deadlines/[id]` - Delete deadline
- `GET /api/admin/stag-dates` - Get event dates
- `PATCH /api/admin/stag-dates` - Update event dates
- `GET /api/admin/event-name` - Get event name
- `PATCH /api/admin/event-name` - Update event name

#### Payments
- `POST /api/admin/add-payment` - Add payment for any guest
- `GET /api/admin/pending-payments` - Get all pending payments

#### Bookings
- `GET /api/admin/bookings` - Get all bookings
- `POST /api/admin/bookings` - Create booking

#### Email Templates
- `GET /api/admin/email-templates` - List all templates
- `POST /api/admin/email-templates` - Create template
- `GET /api/admin/email-templates/[id]` - Get single template
- `PATCH /api/admin/email-templates/[id]` - Update template
- `DELETE /api/admin/email-templates/[id]` - Delete template
- `POST /api/admin/email-templates/[id]/test` - Send test email

### Payment Endpoints (`/api/payments/*`)

- `POST /api/payments` - Submit payment (guest)
- `PATCH /api/payments/[id]/confirm` - Confirm payment (admin)
- `PATCH /api/payments/[id]/reject` - Reject payment (admin)

### Profile Endpoints (`/api/profile/*`)

- `POST /api/profile/claim` - Claim unclaimed profile

### Signup Endpoints (`/api/signup/*`)

- `POST /api/signup/link-profile` - Link profile after signup
- `POST /api/signup/check-and-cleanup` - Cleanup orphaned auth users

### Email Endpoints (`/api/email/*`)

- `POST /api/email/send-signup-welcome` - Send welcome email after signup

### Stag Info Endpoints (`/api/stag-info/*`)

- `GET /api/stag-info/posts` - Get all posts
- `POST /api/stag-info/posts` - Create post (admin)
- `PUT /api/stag-info/posts/[id]` - Update post (admin)
- `DELETE /api/stag-info/posts/[id]` - Delete post (admin)
- `GET /api/stag-info/weekends-plan/items` - Get itinerary items
- `POST /api/stag-info/weekends-plan/items` - Create itinerary item (admin)

### Cron Endpoints (`/api/cron/*`)

- `GET /api/cron/keep-alive` - Keep-alive ping (Vercel Cron)
- `GET /api/cron/deadline-reminders` - Deadline reminder job (Vercel Cron)

### Utility Endpoints

- `GET /api/profiles/unclaimed` - Get unclaimed profiles
- `GET /api/debug/env-check` - Debug environment variables

---

## 6. User Flows

### Guest Flow
1. **Initial Access**
   - Guest receives magic link OR visits landing page
   - If magic link: Click → Create password → Auto-linked → Dashboard
   - If standard: Sign up/login → Claim profile → Dashboard

2. **Dashboard Experience**
   - View event name, countdowns, bank details
   - See payment summary (due, paid, pending, remaining)
   - View payment deadlines
   - Submit payment notifications
   - View payment history

3. **Payment Submission**
   - Click "I've made a payment"
   - Fill form (amount, deadline, note)
   - Submit → Creates pending payment
   - Receives confirmation email
   - Admin confirms → Receives approval email

### Admin Flow
1. **Setup Phase**
   - Add guests with names, emails, amounts
   - Set event name, dates, payment deadlines
   - Create email templates
   - Send signup links to guests

2. **Ongoing Management**
   - View all attendees and payment status
   - Confirm/reject pending payments
   - Add payments manually if needed
   - Edit guest information
   - Manage bookings
   - Update event information

3. **Communication**
   - Send signup links
   - Reset passwords
   - Manage email templates
   - Automated deadline reminders

---

## 7. Environment Variables

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `ADMIN_EMAILS` - Comma-separated admin email addresses
- `RESEND_API_KEY` - Resend API key for emails
- `EMAIL_FROM` - Email sender address (e.g., `noreply@owens-stag.com`)
- `NEXT_PUBLIC_APP_URL` - Full app URL (e.g., `https://owens-stag.com`)

### Optional
- `NEXT_PUBLIC_STAG_EVENT_NAME` - Fallback event name
- `NEXT_PUBLIC_STAG_CURRENCY` - Currency code (e.g., "GBP")
- `NEXT_PUBLIC_STAG_BANK_ACCOUNT_NAME` - Bank account name
- `NEXT_PUBLIC_STAG_BANK_ACCOUNT_NUMBER` - Bank account number
- `NEXT_PUBLIC_STAG_BANK_SORT_CODE` - Bank sort code
- `NEXT_PUBLIC_STAG_PAYMENT_INSTRUCTION` - Payment instruction text
- `KEEP_ALIVE_SECRET` - Secret token for keep-alive endpoint security
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for cron jobs (server-side only)

---

## 8. Security Features

- ✅ **Row Level Security (RLS)** on all database tables
- ✅ **Admin-only endpoints** protected by email check and `is_admin` flag
- ✅ **Service role key** used only for cron jobs (server-side)
- ✅ **Magic link tokens** with expiration times
- ✅ **Password reset** via Supabase Auth
- ✅ **Cron job authentication** via user-agent check and optional secret token

---

## 9. Current Limitations & Areas for Improvement

### Known Limitations
1. **Single Payment Deadline** - Currently simplified to one deadline (designed for future expansion)
2. **No Payment Gateway Integration** - Payments are notifications only, no actual processing
3. **No Multi-Event Support** - Single event per deployment
4. **No Guest-to-Guest Communication** - No messaging or chat features
5. **No File Uploads for Payments** - No receipt/image upload capability
6. **No Payment History Export** - No CSV/PDF export functionality
7. **No Analytics Dashboard** - No payment trends or statistics
8. **No Mobile App** - Web-only (responsive design)
9. **No Real-time Updates** - No WebSocket/SSE for live updates
10. **No Guest Preferences** - No notification preferences or settings

### Technical Debt
- Some TypeScript type assertions (`as any`) in API routes
- Mixed client/server Supabase client usage patterns
- Email template system could support more complex variable logic
- No automated testing suite
- Limited error handling in some edge cases

### Potential Enhancements
- Multi-event support (event switching)
- Payment receipt uploads
- Guest messaging/announcements
- Payment analytics and reporting
- Export functionality (CSV, PDF)
- Guest preferences (email frequency, notifications)
- Mobile app (React Native)
- Real-time updates (Supabase Realtime)
- Payment gateway integration (Stripe, PayPal)
- Multi-currency support
- Recurring payment schedules
- Payment plans/installments
- Guest RSVP system
- Activity feed/timeline
- Document storage (Supabase Storage)
- Advanced email templates (conditional logic)
- Bulk operations (bulk email, bulk payment updates)

---

## 10. Deployment Information

### Production Environment
- **Platform:** Vercel
- **Domain:** `owens-stag.com`
- **Database:** Supabase (PostgreSQL)
- **Email:** Resend (custom domain)
- **Cron Jobs:** Vercel Cron (2 daily jobs)

### Development Workflow
- **Branch Strategy:** Feature branches (`dev/*`, `feature/*`)
- **Preview Deployments:** Automatic for feature branches
- **Production Deployments:** Manual merge to `main` branch
- **Environment Variables:** Managed per environment (Production, Preview, Development)

---

## 11. Key Design Decisions

1. **Database-Driven Event Name** - Event name stored in database for easy updates without code changes
2. **Simplified Deadline Management** - Single deadline for simplicity (expandable later)
3. **Magic Link Signup** - Zero-friction onboarding for guests
4. **Admin-Managed Email Templates** - No code changes needed for email content
5. **Tabbed Admin Panel** - Organized interface for multiple admin functions
6. **Conditional Dashboard Display** - Only shows countdowns/deadlines if dates are set
7. **Service Role for Cron Jobs** - Bypasses RLS for scheduled tasks
8. **Payment Linking Flexibility** - Payments can link to `user_id` OR `profile_id` for unclaimed profiles

---

## 12. Integration Points

### Supabase
- Authentication (email/password)
- Database (PostgreSQL with RLS)
- Row Level Security policies
- Service role key for backend operations

### Resend
- Email sending API
- Custom domain verification
- DNS record management (SPF, DKIM, DMARC)

### Vercel
- Hosting and deployment
- Cron job scheduling
- Environment variable management
- Preview deployments

---

## Conclusion

This is a production-ready, feature-complete web application for managing stag/hen party payments and event information. The architecture is scalable, secure, and maintainable, with a focus on admin control and guest simplicity. The app successfully handles authentication, payment tracking, email notifications, and automated reminders, all while maintaining a clean, organized admin interface.

The codebase is well-structured with clear separation of concerns, comprehensive database schema, and robust security measures. The system is designed to be easily extensible for future features while maintaining simplicity for current use cases.

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**App Status:** Live in Production

