-- Add bookings table for tracking expenses
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  location text,
  booked_by uuid REFERENCES auth.users(id),
  cost numeric(10, 2) NOT NULL,
  paid_so_far numeric(10, 2) NOT NULL DEFAULT 0,
  first_payment_date date,
  next_payment_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with bookings
CREATE POLICY "Admins can manage bookings"
  ON bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Create index
CREATE INDEX IF NOT EXISTS bookings_booked_by_idx ON bookings(booked_by);

