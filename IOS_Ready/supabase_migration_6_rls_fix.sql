-- Fix RLS Policies for Credit History (Resolves 401 Unauthorized on POST)

-- 1. Allow users to insert their OWN credit history records
-- (Required for client-side actions like Ad rewards, Review rewards, etc.)
CREATE POLICY "Users can insert own credit history"
ON public.credit_history FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- 2. Allow admins to insert credit history records for ANY USER
-- (Required for Admin Manual Adjustments)
CREATE POLICY "Admins can insert any credit history"
ON public.credit_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND role = 'admin'
  )
);

-- 3. Correction for "Admins can view all" (Previous migration used uppercase 'ADMIN')
-- We drop and recreate to ensure it matches 'admin' from types.ts
DROP POLICY IF EXISTS "Admins can view all credit history" ON public.credit_history;

CREATE POLICY "Admins can view all credit history"
ON public.credit_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND role IN ('admin', 'vip')
  )
);
