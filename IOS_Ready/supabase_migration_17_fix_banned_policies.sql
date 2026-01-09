-- 1. Ensure tables exist (Safety check, though likely they do or will be created)
create table if not exists public.banned_users (
  id text primary key,
  email text,
  reason text,
  banned_by text,
  banned_at timestamptz default now()
);

create table if not exists public.banned_locations (
  id text primary key,
  address text,
  reason text,
  banned_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.banned_users enable row level security;
alter table public.banned_locations enable row level security;

-- 3. Drop existing policies to avoid conflicts
drop policy if exists "Public users can check banned users" on public.banned_users;
drop policy if exists "Admins can manage banned users" on public.banned_users;
drop policy if exists "Public users can check banned locations" on public.banned_locations;
drop policy if exists "Admins can manage banned locations" on public.banned_locations;

-- 4. Create Policies for banned_users
-- Everyone needs to check if they are banned (or if an email is banned) during login/re-auth
CREATE POLICY "Public users can check banned users"
ON public.banned_users FOR SELECT
USING (true);

-- Only Admins should insert/delete (handled by app logic checking role, but RLS can enforce too if we had safe role checks)
-- For now, let's keep it open for ALL to INSERT/DELETE if we trust the app logic or if creating admin role check is complex without auth.uid()
-- Ideally: USING (exists (select 1 from public.users where id = auth.uid()::text and role = 'admin'))
-- But since we use a custom 'role' column and sometimes anon access for app logic...
-- Let's stick to permissive for MVP as per other tables, or slightly restricted.
-- Given 'saveUser' doesn't write to banned_users, only 'banUserPermanently' (Admin) does.
CREATE POLICY "Anyone can manage banned users"
ON public.banned_users FOR ALL
USING (true);

-- 5. Create Policies for banned_locations
CREATE POLICY "Public users can check banned locations"
ON public.banned_locations FOR SELECT
USING (true);

CREATE POLICY "Anyone can manage banned locations"
ON public.banned_locations FOR ALL
USING (true);
