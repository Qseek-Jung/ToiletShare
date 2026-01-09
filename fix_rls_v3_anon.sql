-- VERSION 3: ALLOW ANONYMOUS ACCESS (For Mock/Test Users)
-- Use this ONLY if you want to use the "Test Login" feature to update the database.
-- WARNING: This is INSECURE for production as anyone can change your settings.

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 1. Reset previous policies
DROP POLICY IF EXISTS "Enable full access for admins" ON public.system_settings;
DROP POLICY IF EXISTS "Enable write access for admins only" ON public.system_settings;
DROP POLICY IF EXISTS "Enable update access for admins only" ON public.system_settings;
DROP POLICY IF EXISTS "Debug: Allow write for all authenticated" ON public.system_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_settings;
DROP POLICY IF EXISTS "Allow anonymous write for testing" ON public.system_settings;

-- 2. Policy: Allow ALL (Read/Write) for PUBLIC (Anonymous + Authenticated)
CREATE POLICY "Allow anonymous write for testing"
ON public.system_settings FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 3. Ensure users table is also readable for other app logic
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
CREATE POLICY "Enable read access for all users"
ON public.users FOR SELECT
TO public
USING (true);
