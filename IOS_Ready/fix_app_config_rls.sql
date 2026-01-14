-- Ensure app_config table exists
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value jsonb,
  description text
);

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- 1. Allow Read Access for ALL Users (Anon + Authenticated)
-- This is critical for the version check to work on app launch before login
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_config;
CREATE POLICY "Enable read access for all users"
ON public.app_config FOR SELECT
TO public
USING (true);

-- 2. Allow Write Access for Admins Only
DROP POLICY IF EXISTS "Enable write access for admins only" ON public.app_config;
CREATE POLICY "Enable write access for admins only"
ON public.app_config FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Enable update access for admins only" ON public.app_config;
CREATE POLICY "Enable update access for admins only"
ON public.app_config FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Enable delete access for admins only" ON public.app_config;
CREATE POLICY "Enable delete access for admins only"
ON public.app_config FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role = 'admin'
  )
);
