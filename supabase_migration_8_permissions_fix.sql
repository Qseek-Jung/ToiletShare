-- Comprehensive Fix for 401 Unauthorized Error

-- 1. Ensure 'authenticated' role has TABLE-LEVEL permissions
-- (Even with RLS, the user needs basic permission to access the table)
GRANT ALL ON TABLE public.credit_history TO authenticated;
GRANT ALL ON TABLE public.credit_history TO service_role;

-- 2. Modify 'amount' column to support decimal points (e.g. 0.1 scores)
-- This prevents potential data invalidity issues
ALTER TABLE public.credit_history ALTER COLUMN amount TYPE NUMERIC;

-- 3. Update 'check_is_admin' to be more robust (Case-insensitive role check)
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND LOWER(role) = 'admin' -- Checks both 'admin' and 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-apply the Insert Policy with the updated function
DROP POLICY IF EXISTS "Admins can insert any credit history" ON public.credit_history;

CREATE POLICY "Admins can insert any credit history"
ON public.credit_history FOR INSERT
WITH CHECK (
  public.check_is_admin()
);

-- 5. Re-apply the Select Policy
DROP POLICY IF EXISTS "Admins can view all credit history" ON public.credit_history;

CREATE POLICY "Admins can view all credit history"
ON public.credit_history FOR SELECT
USING (
  public.check_is_admin() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND LOWER(role) = 'vip'
  )
);
