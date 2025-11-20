-- Add payment date columns to existing bookings table
-- Run this if you already created the bookings table

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS first_payment_date date,
ADD COLUMN IF NOT EXISTS next_payment_date date;

