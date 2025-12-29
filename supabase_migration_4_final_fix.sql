-- =========================================================
-- FINAL FIX MIGRATION SCRIPT
-- RUN THIS SCRIPT ONLY. IT HANDLES EVERYTHING SAFELY.
-- =========================================================

-- 1. Ensure Tables Exist
CREATE TABLE IF NOT EXISTS public.credit_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION DEFAULT 0.0, -- Ensure it is float
  type VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50),
  reference_id VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.review_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id TEXT REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id, type)
);

-- 2. Add Missing Columns to Users Table (Idempotent)
DO $$
BEGIN
    ALTER TABLE public.users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.users ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.users ADD COLUMN activity_score DOUBLE PRECISION DEFAULT 0.0;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.users ADD COLUMN level INTEGER DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.users ADD COLUMN level_override BOOLEAN DEFAULT FALSE;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.users ADD COLUMN next_login_notice JSONB DEFAULT NULL;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- 3. Add Missing Columns to Reviews Table (Idempotent)
DO $$
BEGIN
    ALTER TABLE public.reviews ADD COLUMN like_count INTEGER DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- 4. Fix Column Types (If table existed with wrong type)
-- This might fail if casting is impossible, but for Int -> Double it should be fine.
ALTER TABLE public.credit_history ALTER COLUMN amount TYPE DOUBLE PRECISION;

-- 5. Helper Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS credit_history_user_id_idx ON public.credit_history(user_id);
CREATE INDEX IF NOT EXISTS review_reactions_review_id_idx ON public.review_reactions(review_id);

-- 6. Enable RLS
ALTER TABLE public.credit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reactions ENABLE ROW LEVEL SECURITY;

-- 7. Drop Old Policies to Prevent Conflicts (Then Re-create)
DROP POLICY IF EXISTS "Users can view their own credit history" ON public.credit_history;
DROP POLICY IF EXISTS "Admins can view all credit history" ON public.credit_history;
DROP POLICY IF EXISTS "Public read access for reactions" ON public.review_reactions;
DROP POLICY IF EXISTS "Users can insert reactions" ON public.review_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.review_reactions;

-- 8. Re-create Policies
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

CREATE POLICY "Public read access for reactions"
ON public.review_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can insert reactions"
ON public.review_reactions FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own reactions"
ON public.review_reactions FOR DELETE
USING (auth.uid()::text = user_id);

-- 9. Create/Update View
CREATE OR REPLACE VIEW public.user_activity_stats AS
SELECT 
  u.id AS user_id,
  u.email,
  u.nickname,
  COUNT(DISTINCT t.id) AS toilet_count,
  COUNT(DISTINCT r.id) AS review_count,
  COUNT(DISTINCT rp.id) AS report_total_count,
  COUNT(DISTINCT CASE WHEN rp.status = 'resolved' THEN rp.id END) AS report_success_count
FROM public.users u
LEFT JOIN public.toilets t ON u.id = t.created_by
LEFT JOIN public.reviews r ON u.id = r.user_id
LEFT JOIN public.reports rp ON u.id = rp.reporter_id
GROUP BY u.id;
