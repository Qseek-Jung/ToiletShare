-- 0. Drop dependent view first
DROP VIEW IF EXISTS public.user_activity_stats;

-- 1. Ensure column type
ALTER TABLE public.toilets ALTER COLUMN created_by TYPE text;

-- 2. Update toilets to point to the EXISTING admin user (admin@test.com)
-- This avoids unique constraint errors on email
UPDATE public.toilets
SET created_by = (SELECT id FROM public.users WHERE email = 'admin@test.com' LIMIT 1)
WHERE created_by IN ('admin_bulk_upload', 'admin');

-- 3. Update any remaining orphans to the admin user
UPDATE public.toilets
SET created_by = (SELECT id FROM public.users WHERE email = 'admin@test.com' LIMIT 1)
WHERE created_by IS NOT NULL
  AND created_by NOT IN (SELECT id FROM public.users);

-- 4. Add Foreign Key Constraint
ALTER TABLE public.toilets DROP CONSTRAINT IF EXISTS toilets_created_by_fkey;

ALTER TABLE public.toilets
ADD CONSTRAINT toilets_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES public.users (id)
ON DELETE SET NULL;

-- 5. Recreate View (Updated with new schema compatibility)
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

-- 6. Reload config
NOTIFY pgrst, 'reload config';
