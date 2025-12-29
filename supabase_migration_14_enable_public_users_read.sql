-- Enable RLS on users table (good practice to ensure it is explicitly on)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing read policy if any (to avoid conflicts or duplicates)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can see all profiles" ON public.users;
DROP POLICY IF EXISTS "Allow public read access to users" ON public.users;

-- Create a policy that allows anyone to read users data
-- This is required for:
-- 1. Displaying nickname/level in Reviews (joined query)
-- 2. Leaderboards
-- 3. Profile viewing
CREATE POLICY "Public profiles are viewable by everyone"
ON public.users FOR SELECT
USING (true);

-- Ensure Insert/Update/Delete are still restricted to owner or service role (usually handled by other policies or default deny)
-- For completeness, ensure users can update their own data
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid()::text = id);
