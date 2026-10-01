-- Step 1 of RLS hardening: link app users (public.users) to Supabase Auth users.
-- Additive only: existing app behaviour is unchanged.

-- 1. Link column (existing text IDs like 'kakao_123' stay as-is)
alter table public.users add column if not exists auth_id uuid unique;
create index if not exists users_email_lower_idx on public.users (lower(email));

-- 2. Auth signup trigger: link to the existing app user by email instead of
--    inserting a duplicate row (the app creates public.users rows itself).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set auth_id = new.id
   where auth_id is null
     and lower(email) = lower(new.email);
  return new;
end;
$$;

-- 3. Called by the client after login / after a new app user row is saved.
--    Links the row whose email matches the verified email in the JWT.
create or replace function public.link_auth_user()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_id text;
begin
  if auth.uid() is null or v_email is null then
    return null;
  end if;

  select id into v_id from public.users where auth_id = auth.uid();
  if v_id is not null then
    return v_id;
  end if;

  update public.users
     set auth_id = auth.uid()
   where auth_id is null
     and lower(email) = v_email
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.link_auth_user() from public, anon;
grant execute on function public.link_auth_user() to authenticated;

-- 4. Helper for upcoming RLS policies: app user id of the current session.
create or replace function public.current_app_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_id = auth.uid();
$$;

grant execute on function public.current_app_user_id() to anon, authenticated;
