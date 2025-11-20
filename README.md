# Owen's Stag 2026 - Payments Web App

A production-ready Next.js web application for managing payments for Owen's Stag 2026 event in Bournemouth.

## Features

- **Guest Authentication**: Email/password login via Supabase
- **Profile Claiming**: Guests can claim their profile by selecting their name
- **Payment Tracking**: Guests can submit payment notifications and track their balance
- **Admin Panel**: Admins can manage guests, view all payments, and confirm/reject payments
- **Bookings Tracker**: Admin-only page to track bookings/expenses with payment dates
- **Stag Info Central**: Information hub for guests with posts, links, and weekend itinerary
- **Payment Deadlines**: Display and track payment deadlines with countdowns
- **Real-time Balance**: Automatic calculation of confirmed paid, pending, and remaining amounts
- **Admin Payment Management**: Admins can add payments for any guest (including unclaimed profiles)

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **Authentication & Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel (recommended)

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the SQL from `supabase-setup.sql` (or copy the schema below)
3. Enable Email/Password authentication in Authentication > Providers
4. Get your project URL and anon key from Settings > API

### 2. Local Development

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   ADMIN_EMAILS=your-email@example.com,admin2@example.com

   NEXT_PUBLIC_STAG_EVENT_NAME="Owen's Stag 2026 - Bournemouth"
   NEXT_PUBLIC_STAG_CURRENCY="GBP"
   NEXT_PUBLIC_STAG_BANK_ACCOUNT_NAME="Your Bank Account Name"
   NEXT_PUBLIC_STAG_BANK_ACCOUNT_NUMBER="12345678"
   NEXT_PUBLIC_STAG_BANK_SORT_CODE="12-34-56"
   NEXT_PUBLIC_STAG_PAYMENT_INSTRUCTION="Please pay Account 12345678 Sort Code 12-34-56."
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### 3. Vercel Deployment

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add all environment variables from `.env.local` to Vercel
4. Deploy!

## Database Schema

The app uses the following main tables:

- **profiles**: Guest information and payment totals
- **payment_deadlines**: Payment deadline schedule
- **payments**: Payment submissions and confirmations
- **bookings**: Admin-tracked bookings/expenses with payment dates
- **stag_info_posts**: Posts for Stag Info Central
- **stag_info_links**: Links associated with posts
- **weekends_plan_items**: Weekend itinerary items by date

See `supabase-setup.sql` for the complete schema. Additional migrations are in the `migrations/` folder.

## Usage

### For Admins

1. Log in with an email listed in `ADMIN_EMAILS`
2. Go to `/admin` to:
   - Add guests with their total due amounts
   - View all guest balances
   - Confirm or reject pending payments

### For Guests

1. Sign up or log in
2. Select your name from the dropdown (if not auto-linked)
3. View your dashboard with:
   - Bank details
   - Payment deadlines
   - Your balance summary
   - Submit payment notifications
   - View payment history

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Yes |
| `ADMIN_EMAILS` | Comma-separated admin emails | Yes |
| `NEXT_PUBLIC_STAG_EVENT_NAME` | Event name to display | Yes |
| `NEXT_PUBLIC_STAG_CURRENCY` | Currency code (e.g., GBP) | Yes |
| `NEXT_PUBLIC_STAG_BANK_ACCOUNT_NAME` | Bank account name | Yes |
| `NEXT_PUBLIC_STAG_BANK_ACCOUNT_NUMBER` | Bank account number | Yes |
| `NEXT_PUBLIC_STAG_BANK_SORT_CODE` | Bank sort code | Yes |
| `NEXT_PUBLIC_STAG_PAYMENT_INSTRUCTION` | Payment instruction text | Yes |
| `NEXT_PUBLIC_PAYMENT_DEADLINE` | Next payment deadline (YYYY-MM-DD) | Optional |
| `NEXT_PUBLIC_STAG_DATE` | Stag event date (YYYY-MM-DD) | Optional |

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── admin/        # Admin-only API routes
│   │   ├── payments/     # Payment management routes
│   │   ├── profile/      # Profile management routes
│   │   └── stag-info/    # Stag Info Central routes
│   ├── admin/            # Admin pages (Payments, Bookings)
│   ├── claim-profile/    # Profile claiming page
│   ├── dashboard/        # Guest dashboard (Payment - Home)
│   ├── stag-info/        # Stag Info Central page
│   └── page.tsx          # Landing/auth page
├── components/           # React components
├── lib/                  # Utilities and Supabase clients
├── migrations/           # Database migration scripts
└── supabase-setup.sql    # Main database schema
```

## License

Private project for Owen's Stag 2026 event.

