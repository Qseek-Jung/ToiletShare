-- 0. Drop dependent view AND policies first
DROP VIEW IF EXISTS public.user_activity_stats;

DROP POLICY IF EXISTS "Public read access" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can delete any review" ON public.reviews;
-- Drop older/other potential policies to be safe
DROP POLICY IF EXISTS "Users can read all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can read all reviews" ON public.reviews;

-- 1. Ensure reviews.user_id is TEXT (matches public.users.id)
ALTER TABLE public.reviews ALTER COLUMN user_id TYPE text;

-- 1.5 Clean up orphan reviews (reviews where user_id does not exist in users table)
-- This prevents Foreign Key violation errors when adding the constraint.
DELETE FROM public.reviews
WHERE user_id NOT IN (SELECT id::text FROM public.users);

-- 2. Add Foreign Key Constraint if it doesn't exist
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;

ALTER TABLE public.reviews
ADD CONSTRAINT reviews_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users (id)
ON DELETE CASCADE;

-- 3. Re-Create RLS Policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
ON public.reviews FOR SELECT
USING (true);

CREATE POLICY "Users can insert own reviews"
ON public.reviews FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own reviews"
ON public.reviews FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own reviews"
ON public.reviews FOR DELETE
USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can delete any review"
ON public.reviews FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND role IN ('admin', 'ADMIN', 'vip', 'VIP')
  )
);

-- 4. Recreate the View
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
