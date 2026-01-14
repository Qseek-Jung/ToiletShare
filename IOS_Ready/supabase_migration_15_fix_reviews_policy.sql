-- Enable RLS on reviews table
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing restricted policies
DROP POLICY IF EXISTS "Public read access" ON public.reviews;
DROP POLICY IF EXISTS "Users can read all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can read all reviews" ON public.reviews;

-- Create a policy that allows EVERYONE to read reviews
-- Reviews are public content.
CREATE POLICY "Public read access"
ON public.reviews FOR SELECT
USING (true);

-- Ensure users can insert their own reviews
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
CREATE POLICY "Users can insert own reviews"
ON public.reviews FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Ensure users can update/delete their own reviews
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews"
ON public.reviews FOR UPDATE
USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews"
ON public.reviews FOR DELETE
USING (auth.uid()::text = user_id);

-- Admins should be able to delete any review (Policy for Admin)
-- We can add a separate policy or rely on Service Role (backend uses service role usually for admin actions if configured, 
-- but our frontend calls might use user token with admin role).
-- Let's add explicit Admin policy for DELETE just in case.
DROP POLICY IF EXISTS "Admins can delete any review" ON public.reviews;
CREATE POLICY "Admins can delete any review"
ON public.reviews FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND role IN ('admin', 'ADMIN', 'vip', 'VIP') -- inclusive check
  )
);
