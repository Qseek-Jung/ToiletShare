-- 1. Create Function to Handle New User Stats
create or replace function handle_new_user_stats()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Insert or Update daily_stats for today
  insert into daily_stats (date, new_users)
  values (current_date, 1)
  on conflict (date)
  do update set new_users = daily_stats.new_users + 1;
  return new;
end;
$$;

-- 2. Create Trigger (Drop if exists first to be safe)
drop trigger if exists on_new_user_created on users;

create trigger on_new_user_created
after insert on users
for each row
execute function handle_new_user_stats();

-- 3. Backfill Data (Resync daily_stats.new_users from users table)
with daily_counts as (
  select
    created_at::date as day,
    count(*) as cnt
  from users
  group by created_at::date
)
update daily_stats s
set new_users = d.cnt
from daily_counts d
where s.date = d.day;

-- 3.1 Insert missing days from backfill if they don't exist in daily_stats
insert into daily_stats (date, new_users)
select
  created_at::date as day,
  count(*) as cnt
from users
group by created_at::date
on conflict (date) do nothing; -- We already updated existing ones above via UPDATE join, but this catches rows that strictly didn't exist.

-- NOTE: The UPDATE above only updates rows that exist.
-- The INSERT ON CONFLICT DO NOTHING handles rows that didn't exist.
-- To be absolutely sure data is correct, let's do an upsert logic for backfill.

-- Re-do Backfill more robustly:
do $$
declare
  r record;
begin
  for r in (
      select created_at::date as day, count(*) as cnt
      from users
      group by created_at::date
  ) loop
      insert into daily_stats (date, new_users)
      values (r.day, r.cnt)
      on conflict (date)
      do update set new_users = r.cnt;
  end loop;
end;
$$;
