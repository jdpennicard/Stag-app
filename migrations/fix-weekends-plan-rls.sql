-- Fix RLS policies for weekends_plan_items table
-- Run this in your Supabase SQL Editor if you're getting "Failed to fetch existing items" errors

-- Ensure is_admin_user() function exists
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND is_admin = true
  );
END;
$$;

-- Create weekends_plan_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.weekends_plan_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_date DATE NOT NULL,
  day_label TEXT NOT NULL,
  item_text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.weekends_plan_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view weekends plan items" ON public.weekends_plan_items;
DROP POLICY IF EXISTS "Admins can manage weekends plan items" ON public.weekends_plan_items;
DROP POLICY IF EXISTS "Admins can insert weekends plan items" ON public.weekends_plan_items;
DROP POLICY IF EXISTS "Admins can update weekends plan items" ON public.weekends_plan_items;
DROP POLICY IF EXISTS "Admins can delete weekends plan items" ON public.weekends_plan_items;

-- RLS Policies for weekends_plan_items
-- Everyone can read items (this should allow the SELECT to work)
CREATE POLICY "Anyone can view weekends plan items"
  ON public.weekends_plan_items
  FOR SELECT
  USING (true);

-- Only admins can insert items
CREATE POLICY "Admins can insert weekends plan items"
  ON public.weekends_plan_items
  FOR INSERT
  WITH CHECK (is_admin_user());

-- Only admins can update items
CREATE POLICY "Admins can update weekends plan items"
  ON public.weekends_plan_items
  FOR UPDATE
  USING (is_admin_user());

-- Only admins can delete items
CREATE POLICY "Admins can delete weekends plan items"
  ON public.weekends_plan_items
  FOR DELETE
  USING (is_admin_user());

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_weekends_plan_items_order ON public.weekends_plan_items(day_date ASC, order_index ASC);

