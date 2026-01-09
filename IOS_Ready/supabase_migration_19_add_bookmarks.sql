-- Create Bookmarks Table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    toilet_id TEXT NOT NULL REFERENCES public.toilets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, toilet_id)
);

-- Enable RLS
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can view their own bookmarks
CREATE POLICY "Users can view own bookmarks"
ON public.bookmarks FOR SELECT
USING (auth.uid()::text = user_id);

-- 2. Users can add their own bookmarks
CREATE POLICY "Users can add own bookmarks"
ON public.bookmarks FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- 3. Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
ON public.bookmarks FOR DELETE
USING (auth.uid()::text = user_id);

-- Force schema reload
NOTIFY pgrst, 'reload config';
