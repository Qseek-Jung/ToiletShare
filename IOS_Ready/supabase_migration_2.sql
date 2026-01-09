-- Create Credit History Table
-- Changed user_id to TEXT to match users.id type
-- Changed id default to gen_random_uuid() for better compatibility
CREATE TABLE IF NOT EXISTS public.credit_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 0,
  type VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50),
  reference_id VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Review Reactions Table
-- Changed review_id and user_id to TEXT to match parent table types
CREATE TABLE IF NOT EXISTS public.review_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id TEXT REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- e.g., 'like'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id, type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS credit_history_user_id_idx ON public.credit_history(user_id);
CREATE INDEX IF NOT EXISTS review_reactions_review_id_idx ON public.review_reactions(review_id);

-- Enable RLS
ALTER TABLE public.credit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for Credit History
CREATE POLICY "Users can view their own credit history"
ON public.credit_history FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all credit history"
ON public.credit_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND role IN ('ADMIN', 'VIP')
  )
);

-- Policies for Review Reactions
CREATE POLICY "Public read access for reactions"
ON public.review_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can insert reactions"
ON public.review_reactions FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own reactions"
ON public.review_reactions FOR DELETE
USING (auth.uid()::text = user_id);
