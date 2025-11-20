-- Add paid_so_far column to existing bookings table
-- Run this if you already created the bookings table

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS paid_so_far numeric(10, 2) NOT NULL DEFAULT 0;

