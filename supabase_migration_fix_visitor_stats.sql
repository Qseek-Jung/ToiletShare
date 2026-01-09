-- 1. Ensure columns exist (Idempotent)
alter table daily_stats
add column if not exists visitors_mobile int default 0,
add column if not exists visitors_tablet int default 0,
add column if not exists visitors_pc int default 0,
add column if not exists ad_views_charge int default 0,
add column if not exists ad_views_unlock int default 0,
add column if not exists ad_views_review int default 0;

-- 2. Create RPC function for Atomic Increments
create or replace function increment_daily_stat(
  p_date date,
  p_field text,
  p_amount int default 1
)
returns void
language plpgsql
security definer
as $$
begin
  -- Ensure the row exists for the date
  insert into daily_stats (date)
  values (p_date)
  on conflict (date) do nothing;

  -- Atomic Update based on field name
  if p_field = 'visitors' then
    update daily_stats set visitors = coalesce(visitors, 0) + p_amount where date = p_date;
  elsif p_field = 'new_users' then
    update daily_stats set new_users = coalesce(new_users, 0) + p_amount where date = p_date;
  elsif p_field = 'new_toilets' then
    update daily_stats set new_toilets = coalesce(new_toilets, 0) + p_amount where date = p_date;
  elsif p_field = 'new_reviews' then
    update daily_stats set new_reviews = coalesce(new_reviews, 0) + p_amount where date = p_date;
  elsif p_field = 'new_reports' then
    update daily_stats set new_reports = coalesce(new_reports, 0) + p_amount where date = p_date;
  elsif p_field = 'ad_views' then
    update daily_stats set ad_views = coalesce(ad_views, 0) + p_amount where date = p_date;
  
  -- Device Stats
  elsif p_field = 'visitors_mobile' then
    update daily_stats set visitors_mobile = coalesce(visitors_mobile, 0) + p_amount where date = p_date;
  elsif p_field = 'visitors_tablet' then
    update daily_stats set visitors_tablet = coalesce(visitors_tablet, 0) + p_amount where date = p_date;
  elsif p_field = 'visitors_pc' then
    update daily_stats set visitors_pc = coalesce(visitors_pc, 0) + p_amount where date = p_date;

  -- Ad View Stats
  elsif p_field = 'ad_views_charge' then
    update daily_stats set ad_views_charge = coalesce(ad_views_charge, 0) + p_amount where date = p_date;
  elsif p_field = 'ad_views_unlock' then
    update daily_stats set ad_views_unlock = coalesce(ad_views_unlock, 0) + p_amount where date = p_date;
  elsif p_field = 'ad_views_review' then
    update daily_stats set ad_views_review = coalesce(ad_views_review, 0) + p_amount where date = p_date;
  end if;
end;
$$;
