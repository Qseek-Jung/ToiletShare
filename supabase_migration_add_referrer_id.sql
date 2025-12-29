alter table public.users add column if not exists referrer_id uuid references public.users(id);
