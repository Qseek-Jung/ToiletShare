-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb,
  description text
);

-- Enable RLS on system_settings table
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 1. Allow Read Access for All Authenticated Users
-- This is necessary so the app can fetch settings (e.g., messages)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_settings;
CREATE POLICY "Enable read access for all users"
ON public.system_settings FOR SELECT
TO public
USING (true);

-- 2. Allow Write (Insert/Update) Access for Admins Only
-- This checks the 'users' table to verify the user has 'admin' role
DROP POLICY IF EXISTS "Enable write access for admins only" ON public.system_settings;
CREATE POLICY "Enable write access for admins only"
ON public.system_settings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Enable update access for admins only" ON public.system_settings;
CREATE POLICY "Enable update access for admins only"
ON public.system_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role = 'admin'
  )
);
