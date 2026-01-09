-- 1. Ensure system_settings table exists and RLS is enabled
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb,
  description text
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 2. RESET all policies on system_settings to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.system_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_settings;
DROP POLICY IF EXISTS "Enable write access for admins only" ON public.system_settings;
DROP POLICY IF EXISTS "Enable update access for admins only" ON public.system_settings;
DROP POLICY IF EXISTS "Enable full access for admins" ON public.system_settings;

-- 3. Policy: Public Read Access (Anyone can read settings)
CREATE POLICY "Enable read access for all users"
ON public.system_settings FOR SELECT
TO public
USING (true);

-- 4. Policy: Admin Write Access (Insert/Update/Delete)
-- Using 'FOR ALL' to cover UPSERT operations
CREATE POLICY "Enable full access for admins"
ON public.system_settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role = 'admin'
  )
);

-- 5. CRITICAL: Ensure public.users is readable for the subquery to work
-- If RLS is enabled on public.users, the above subquery will fail if the user can't read their own row.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to read own profile" ON public.users;
CREATE POLICY "Allow users to read own profile"
ON public.users FOR SELECT
TO authenticated
USING (
  id = auth.uid()::text
);
