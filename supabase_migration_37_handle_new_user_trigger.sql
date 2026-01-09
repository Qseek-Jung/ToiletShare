-- 1. Create Function to Handle New User Sync
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, role, credits, created_at, signup_provider)
  values (
    new.id::text, -- Cast UUID to Text explicitly
    new.email,
    'user', -- Default Role
    5,      -- Default Credits (Login Bonus)
    new.created_at,
    coalesce(new.raw_app_meta_data->>'provider', 'email') -- Provider extraction
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2. Create Trigger
-- Drop if exists to avoid duplication errors during re-runs
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Backfill Missing Users (Fix for currently missing testers)
-- This inserts any users from auth that are missing in public.users
insert into public.users (id, email, role, credits, created_at, signup_provider)
select 
    id::text, -- Cast UUID to Text
    email, 
    'user', 
    5, 
    created_at, 
    coalesce(raw_app_meta_data->>'provider', 'email')
from auth.users
where id::text not in (select id from public.users); -- Cast comparison
