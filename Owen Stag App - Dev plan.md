Owen’s Stag 2026 – Payments Web App

Technical Stack & Development Plan (for Cursor)

1. Goal

Build a simple, production-ready web app to manage payments for:

Owen's Stag 2026 – Bournemouth

The app will:

Let guests log in and see:

Payment deadlines

Bank details

How much they owe / have paid / still owe

Let guests submit “I’ve paid” notifications (no actual payment processing).

Let admins:

Set up all guests and amounts at the start

See all balances

Confirm or reject payments

Deployed on Vercel and live for the next 3 months.

2. Tech Stack

Framework

Next.js (App Router) with TypeScript

UI

Tailwind CSS for styling

Simple, responsive layout

Auth & Database

Supabase

Auth: email/password

Database: Postgres

Hosting

Frontend + API: Vercel

Database + Auth: Supabase

Optional (stretch, not required for v1):

Email sending via Resend or Supabase functions.

3. Data Model (Supabase)

You’ll create these in the Supabase SQL editor / Table editor before or during dev.

3.1 profiles – stag participants

Guests are defined upfront by admins. Users then claim their profile after logging in.

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id), -- null until claimed
  full_name text not null,
  email text,
  is_admin boolean default false,
  total_due numeric(10, 2) not null default 0,
  initial_confirmed_paid numeric(10, 2) not null default 0,
  created_at timestamptz default now()
);


full_name: Name guests will see in the dropdown.

email: Optional (can be used to auto-link profiles to logins).

total_due: Total amount that guest owes for the stag.

initial_confirmed_paid: Amount they’ve already paid before the app exists.

user_id: Set when guest logs in and claims their profile.

3.2 payment_deadlines – schedule
create table payment_deadlines (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  due_date date not null,
  suggested_amount numeric(10, 2),
  created_at timestamptz default now()
);


Examples:

“Deposit”

“Final payment”

3.3 payments – guest payment submissions
create type payment_status as enum ('pending', 'confirmed', 'rejected');

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deadline_id uuid references payment_deadlines(id),
  amount numeric(10, 2) not null,
  status payment_status not null default 'pending',
  note text,
  created_at timestamptz default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id)
);


Guests submit payments → status = 'pending'.

Admin confirms → status = 'confirmed', sets confirmed_at, confirmed_by.

Rejected payments are optional for v1.

4. Auth & Role Logic
4.1 Auth via Supabase

Email/password login.

Supabase session stored via @supabase/auth-helpers-nextjs.

4.2 Admins

Admin emails defined in env: ADMIN_EMAILS, comma-separated.

On login / profile init:

If user’s email is in ADMIN_EMAILS, mark profiles.is_admin = true for their profile.

4.3 Claiming a profile (“select your name”)

Flow:

User signs up or logs in.

App checks for a profiles row with user_id = current_user.id.

If found → go to /dashboard.

If not found:

If there’s a profiles row where email = current_user.email and user_id IS NULL, auto-link:

Set profiles.user_id = current_user.id.

Go to /dashboard.

Else:

Show “Select your name” page:

Dropdown of profiles where user_id IS NULL and is_admin = false.

User selects their name and submits.

API sets user_id = current_user.id for that profile (only if still null).

Redirect to /dashboard.

This allows:

You to set up all guests + amounts in advance.

A single shared link – guests log in and pick their name.

5. Pages & UX (Next.js App Router)
5.1 / – Landing + Login/Signup

If not logged in:

Short description (“Owen’s Stag 2026 – Bournemouth Payments Tracker”).

Login / signup form (email, password).

If logged in:

Redirect to either:

/dashboard if profile linked, or

/claim-profile if not.

5.2 /claim-profile – Select your name

Visible only to authenticated users where profiles.user_id is not yet linked.

Fetch profiles where user_id IS NULL and is_admin = false.

Show:

A dropdown of full_name.

Button: “This is me”.

On submit:

Call POST /api/profile/claim with chosen profile id.

Link profile to current user.

Redirect to /dashboard.

5.3 /dashboard – Guest view

For a linked guest (has a profile):

Fetch:

Their profile row (full_name, total_due, initial_confirmed_paid).

All payments for user_id.

All payment_deadlines.

Compute:

confirmedFromPayments = sum(payments where status='confirmed')
confirmedTotal = profile.initial_confirmed_paid + confirmedFromPayments
pendingTotal = sum(payments where status='pending')
remaining = profile.total_due - confirmedTotal


Display:

Event header

STAG_EVENT_NAME (e.g. “Owen's Stag 2026 – Bournemouth”)

Bank details

STAG_BANK_ACCOUNT_NAME

STAG_BANK_ACCOUNT_NUMBER

STAG_BANK_SORT_CODE

Text e.g.:
“Please pay Account [number] Sort Code [code].”

Summary cards

Total owed

Confirmed paid

Pending

Remaining

Payment deadlines table

Label, due date, suggested amount.

Each row includes small reminder text:

“Deadline is [date] – Please pay Account XXXX Sort Code XXX.”

Payment submission

Button: “I’ve made a payment”.

Opens page or modal with form:

Amount (required)

Deadline (optional dropdown)

Note (optional – e.g. “Paid via Monzo, ref: XYZ”)

On submit:

Call POST /api/payments → create pending payment.

Redirect back to /dashboard with a success message.

List of pending & confirmed payments

Small tables or lists so guests can see what they’ve submitted.

5.4 /admin – Admin panel

Admins only (profiles.is_admin = true):

Two main sections:

1. Guest setup & overview

Add guest form

Fields:

full_name (required)

email (optional)

total_due (required)

initial_confirmed_paid (optional)

On submit: POST to an API route or use server action to insert into profiles.

Guests table

Columns:

Name

Email

Total Due

Initial Confirmed Paid

Confirmed Paid (from payments)

Remaining

Optional edit capability (quick inline edits for total_due and initial_confirmed_paid).

You’ll use this to set everything up at the beginning.

2. Pending payment management

Pending payments table

Rows for payments where status = 'pending':

Guest full name + email

Amount

Deadline label (if any)

Note

Date submitted

Buttons: Confirm / Reject (reject optional).

Confirm:

Calls PATCH /api/payments/[id]/confirm

Sets:

status = 'confirmed'

confirmed_at = now()

confirmed_by = current admin user_id

Reject:

Calls PATCH /api/payments/[id]/reject

Sets status = 'rejected'.

6. API Routes (Next.js Route Handlers)

Under app/api/:

6.1 POST /api/payments

Auth required.

Body: { amount, deadlineId?, note? }.

Validate and insert:

user_id = current_user.id

deadline_id = deadlineId || null

amount

note

status = 'pending'

Return created payment.

6.2 PATCH /api/payments/[id]/confirm

Auth required.

Check that current user is admin (profiles.is_admin = true).

Set for that payment:

status = 'confirmed'

confirmed_at = now()

confirmed_by = current admin id

6.3 PATCH /api/payments/[id]/reject (optional)

Same admin check.

Set status = 'rejected'.

6.4 POST /api/profile/claim

Auth required.

Body: { profileId }.

Ensure:

profiles.id = profileId

user_id IS NULL (so nobody else claimed it)

Set:

user_id = current_user.id

If email is null, set email = current_user.email.

7. Environment Variables

Configure these in .env.local and in Vercel:

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

ADMIN_EMAILS="your-email@example.com,best-man@example.com"

STAG_EVENT_NAME="Owen's Stag 2026 - Bournemouth"
STAG_CURRENCY="GBP"
STAG_BANK_ACCOUNT_NAME="Your Bank Account Name"
STAG_BANK_ACCOUNT_NUMBER="12345678"
STAG_BANK_SORT_CODE="12-34-56"

# Optional for email integration (not required for v1):
RESEND_API_KEY=...
EMAIL_FROM="stag-payments@example.com"

8. Deployment Plan (High-Level Steps)

Supabase

Create new project.

Enable email/password auth.

Create tables:

profiles

payment_deadlines

payments

Seed some:

payment_deadlines rows (Deposit, Final Payment).

profiles rows with guests’ names, total_due, and any prior payments.

Next.js App in Cursor

Scaffold Next.js App Router + TypeScript + Tailwind.

Install:

npm install @supabase/supabase-js @supabase/auth-helpers-nextjs


Configure Supabase client using NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.

Implement pages & API routes

/ – landing + login/signup.

/claim-profile – profile claim flow.

/dashboard – guest view with calculations & payment submission.

/admin – admin panel for setup + pending payments.

API routes for payments & profile claim.

Connect to Vercel

Push repo to GitHub (or import via Vercel).

Create Vercel project and set all env vars.

Deploy.

Test flows

Admin logs in:

Can see /admin, add/edit guests, see pending payments.

Guest logs in:

Can claim profile, see deadlines and bank details.

Can submit payment → appears pending.

Admin confirms payment → guest’s confirmed and remaining amounts update.

9. Ready-to-Paste Cursor Prompt

You can give Cursor this full prompt to build the project:

Build a production-ready Next.js web app (App Router, TypeScript, Tailwind CSS) for managing payments for “Owen's Stag 2026 - Bournemouth”.

Tech:

Next.js (App Router) + TypeScript

Tailwind CSS

Supabase for auth (email/password) and Postgres

Environment variables to use in the app:

NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

ADMIN_EMAILS – comma-separated list of admin emails

STAG_EVENT_NAME="Owen's Stag 2026 - Bournemouth"

STAG_CURRENCY="GBP"

STAG_BANK_ACCOUNT_NAME

STAG_BANK_ACCOUNT_NUMBER

STAG_BANK_SORT_CODE

Assume these Supabase tables already exist:

profiles:

id uuid pk default gen_random_uuid()

user_id uuid references auth.users(id) (nullable)

full_name text not null

email text

is_admin boolean default false

total_due numeric(10,2) not null default 0

initial_confirmed_paid numeric(10,2) not null default 0

created_at timestamptz default now()

payment_deadlines:

id uuid pk default gen_random_uuid()

label text not null

due_date date not null

suggested_amount numeric(10,2)

created_at timestamptz default now()

payments:

id uuid pk default gen_random_uuid()

user_id uuid not null references auth.users(id)

deadline_id uuid references payment_deadlines(id)

amount numeric(10,2) not null

status payment_status enum('pending','confirmed','rejected') default 'pending'

note text

created_at timestamptz default now()

confirmed_at timestamptz

confirmed_by uuid references auth.users(id)

Auth & roles:

Use Supabase email/password auth.

After login, check ADMIN_EMAILS; if the user’s email is in that list, ensure their profiles.is_admin is true.

Profile claiming (“select your name”) flow:

After login:

If there is a profiles row where user_id = current_user.id, redirect to /dashboard.

Else, if there is a profiles row where email = current_user.email and user_id IS NULL, set user_id = current_user.id and redirect to /dashboard.

Otherwise, redirect to /claim-profile.

/claim-profile page:

Fetch profiles where user_id IS NULL and is_admin = false.

Show a dropdown of full_name.

On submit, call POST /api/profile/claim with profileId.

In the API route, check user_id IS NULL, set user_id = current_user.id (and optionally email = current_user.email if null), then redirect to /dashboard.

Pages:

/ (landing & auth):

If not logged in, show simple landing text and login/signup form (email/password).

If logged in, redirect to either /dashboard or /claim-profile according to the logic above.

/dashboard (guest view):

Only for authenticated users who are linked to a profiles row.

Fetch:

Their profile (total_due, initial_confirmed_paid, full_name).

Their payments.

All payment_deadlines.

Compute:

confirmedFromPayments = sum(confirmed payments amount)

confirmedTotal = profile.initial_confirmed_paid + confirmedFromPayments

pendingTotal = sum(pending payments amount)

remaining = profile.total_due - confirmedTotal

Display:

Event name from STAG_EVENT_NAME.

Bank details from env (STAG_BANK_ACCOUNT_NAME, STAG_BANK_ACCOUNT_NUMBER, STAG_BANK_SORT_CODE).

A table of payment deadlines with label, due date, suggested amount and text like:
"Deadline is [date] – Please pay Account [STAG_BANK_ACCOUNT_NUMBER] Sort Code [STAG_BANK_SORT_CODE]."

Summary cards for total due, confirmed paid, pending, remaining.

A visible list of their pending and confirmed payments.

A button "I've made a payment" that opens a form:

Fields: amount (required), deadline (optional dropdown), note (optional).

On submit, call POST /api/payments to create a payment with status='pending', then redirect back to /dashboard.

/admin (admin panel):

Only for authenticated users with profiles.is_admin = true.

Section 1: Guest setup & overview

Form to add guest: full_name, email (optional), total_due, initial_confirmed_paid.

Table of all profiles showing: full_name, email, total_due, initial_confirmed_paid, confirmed_total (from payments), remaining.

Section 2: Pending payments

Table of payments with status='pending', displaying: guest name/email, amount, created_at, deadline label, note, and Confirm/Reject buttons.

API routes:

POST /api/payments:

Auth required.

Body: { amount, deadlineId?, note? }.

Insert payment with user_id = current_user.id, status = 'pending'.

PATCH /api/payments/[id]/confirm:

Auth required, admin only.

Set status='confirmed', confirmed_at=now(), confirmed_by=current admin.

PATCH /api/payments/[id]/reject (optional):

Admin only.

Set status='rejected'.

POST /api/profile/claim:

Auth required.

Body { profileId }.

If profile’s user_id is null, set it to current_user.id (and fill email if empty).

Use clean, simple Tailwind styling, with a focus on a minimal but fully working implementation that can be deployed on Vercel.