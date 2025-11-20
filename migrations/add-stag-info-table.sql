-- Create stag_info_posts table for Stag Info Central
CREATE TABLE IF NOT EXISTS public.stag_info_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  headline TEXT NOT NULL,
  content TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0
);

-- Create stag_info_links table for links associated with posts
CREATE TABLE IF NOT EXISTS public.stag_info_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.stag_info_posts(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create stag_info_documents table for documents associated with posts
CREATE TABLE IF NOT EXISTS public.stag_info_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.stag_info_posts(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.stag_info_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stag_info_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stag_info_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stag_info_posts
-- Everyone can read posts
CREATE POLICY "Anyone can view stag info posts"
  ON public.stag_info_posts
  FOR SELECT
  USING (true);

-- Only admins can insert posts
CREATE POLICY "Admins can create stag info posts"
  ON public.stag_info_posts
  FOR INSERT
  WITH CHECK (is_admin_user());

-- Only admins can update posts
CREATE POLICY "Admins can update stag info posts"
  ON public.stag_info_posts
  FOR UPDATE
  USING (is_admin_user());

-- Only admins can delete posts
CREATE POLICY "Admins can delete stag info posts"
  ON public.stag_info_posts
  FOR DELETE
  USING (is_admin_user());

-- RLS Policies for stag_info_links
-- Everyone can read links
CREATE POLICY "Anyone can view stag info links"
  ON public.stag_info_links
  FOR SELECT
  USING (true);

-- Only admins can manage links
CREATE POLICY "Admins can manage stag info links"
  ON public.stag_info_links
  FOR ALL
  USING (is_admin_user());

-- RLS Policies for stag_info_documents
-- Everyone can read documents
CREATE POLICY "Anyone can view stag info documents"
  ON public.stag_info_documents
  FOR SELECT
  USING (true);

-- Only admins can manage documents
CREATE POLICY "Admins can manage stag info documents"
  ON public.stag_info_documents
  FOR ALL
  USING (is_admin_user());

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_stag_info_posts_order ON public.stag_info_posts(is_pinned DESC, order_index DESC, created_at DESC);

-- Create weekends_plan table for editable itinerary
CREATE TABLE IF NOT EXISTS public.weekends_plan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Ensure is_admin_user() function exists (create if not exists)
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

-- Create weekends_plan_items table for date-organized itinerary items
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

