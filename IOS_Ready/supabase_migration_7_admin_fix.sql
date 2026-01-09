-- Fix Admin RLS using SECURITY DEFINER to bypass recursion/access issues

-- 1. Create a secure function to check admin status
-- "SECURITY DEFINER" means this function runs with the privileges of the creator (superuser/service_role),
-- allowing it to read the 'users' table specifically for this check, ignoring RLS constraints.
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role = 'admin'  -- Ensure this matches your DB value (lowercase 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the INSERT Policy to use this function
DROP POLICY IF EXISTS "Admins can insert any credit history" ON public.credit_history;

CREATE POLICY "Admins can insert any credit history"
ON public.credit_history FOR INSERT
WITH CHECK (
  public.check_is_admin()
);

-- 3. Also update the SELECT policy for consistency
DROP POLICY IF EXISTS "Admins can view all credit history" ON public.credit_history;

CREATE POLICY "Admins can view all credit history"
ON public.credit_history FOR SELECT
USING (
  public.check_is_admin() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND role = 'vip'
  )
);
