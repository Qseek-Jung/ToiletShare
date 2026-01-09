-- 1. Users Table Updates
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS activity_score DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS level_override BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS next_login_notice JSONB DEFAULT NULL;

-- 2. Reviews Table Updates
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- 3. Credit History Updates (Modify amount to support decimals if needed, or keeping Int? User asked for Score logs)
-- Scores are floats (e.g. 0.1). Integer amount will round to 0. 
-- Let's change amount to DECIMAL or DOUBLE PRECISION, or add score_amount.
-- Changing type of existing column might be tricky if data exists, but table should be empty/new.
ALTER TABLE public.credit_history ALTER COLUMN amount TYPE DOUBLE PRECISION;

-- 4. Create User Activity Stats View (If not exists)
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
