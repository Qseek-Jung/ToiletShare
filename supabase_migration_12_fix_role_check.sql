-- Fix the CHECK constraint on users.role to include 'vip'
-- The previous constraint likely only allowed ('user', 'admin')

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('user', 'admin', 'vip', 'guest'));
