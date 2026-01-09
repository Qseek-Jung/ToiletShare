-- DEBUGGING SCRIPT: PERMISSIVE ACCESS
-- WARNING: This allows ANY logged-in user to modify system settings.
-- Use this ONLY to verify if the previous "Admin Check" was the cause of the error.

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop previous strict policies
DROP POLICY IF EXISTS "Enable full access for admins" ON public.system_settings;
DROP POLICY IF EXISTS "Enable write access for admins only" ON public.system_settings;
DROP POLICY IF EXISTS "Enable update access for admins only" ON public.system_settings;

-- Create PERMISSIVE policy
CREATE POLICY "Debug: Allow write for all authenticated"
ON public.system_settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure public read access remains
DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_settings;
CREATE POLICY "Enable read access for all users"
ON public.system_settings FOR SELECT
TO public
USING (true);
