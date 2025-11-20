-- Create payment_status enum
create type payment_status as enum ('pending', 'confirmed', 'rejected');

-- Create profiles table
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  is_admin boolean default false,
  total_due numeric(10, 2) not null default 0,
  initial_confirmed_paid numeric(10, 2) not null default 0,
  created_at timestamptz default now()
);

-- Create payment_deadlines table
create table payment_deadlines (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  due_date date not null,
  suggested_amount numeric(10, 2),
  created_at timestamptz default now()
);

-- Create payments table
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

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table payment_deadlines enable row level security;
alter table payments enable row level security;

-- Profiles policies
-- Users can read their own profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = user_id);

-- Users can update their own profile (for claiming)
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = user_id);

-- Users can claim unclaimed profiles
create policy "Users can claim unclaimed profiles"
  on profiles for update
  to authenticated
  using (user_id IS NULL AND is_admin = false)
  with check (auth.uid() = user_id);

-- Users can insert their own profile (for admin auto-creation)
create policy "Users can insert own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Create a function to check admin status (bypasses RLS)
create or replace function is_admin_user()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from profiles
    where user_id = auth.uid() and is_admin = true
  );
end;
$$;

-- Admins can do everything
create policy "Admins can manage all profiles"
  on profiles for all
  using (is_admin_user());

-- Authenticated users can view unclaimed profiles (for the claim page)
create policy "Authenticated users can view unclaimed profiles"
  on profiles for select
  to authenticated
  using (user_id is null and is_admin = false);

-- Payment deadlines policies
-- Everyone can view deadlines
create policy "Everyone can view deadlines"
  on payment_deadlines for select
  to authenticated
  using (true);

-- Admins can manage deadlines
create policy "Admins can manage deadlines"
  on payment_deadlines for all
  using (
    exists (
      select 1 from profiles
      where user_id = auth.uid() and is_admin = true
    )
  );

-- Payments policies
-- Users can view their own payments
create policy "Users can view own payments"
  on payments for select
  using (auth.uid() = user_id);

-- Users can create their own payments
create policy "Users can create own payments"
  on payments for insert
  with check (auth.uid() = user_id);

-- Admins can view all payments
create policy "Admins can view all payments"
  on payments for select
  using (
    exists (
      select 1 from profiles
      where user_id = auth.uid() and is_admin = true
    )
  );

-- Admins can update payments (confirm/reject)
create policy "Admins can update payments"
  on payments for update
  using (
    exists (
      select 1 from profiles
      where user_id = auth.uid() and is_admin = true
    )
  );

-- Create indexes for better performance
create index profiles_user_id_idx on profiles(user_id);
create index profiles_email_idx on profiles(email);
create index payments_user_id_idx on payments(user_id);
create index payments_status_idx on payments(status);
create index payments_deadline_id_idx on payments(deadline_id);

