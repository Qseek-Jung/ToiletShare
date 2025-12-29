-- Reset Schema (Clean up previous failed attempts)
drop table if exists notifications cascade;
drop table if exists reports cascade;
drop table if exists reviews cascade;
drop table if exists toilets cascade;
drop table if exists users cascade;
drop table if exists banned_locations cascade;
drop table if exists banned_users cascade;
drop table if exists upload_history cascade;
drop table if exists app_config cascade;
drop table if exists daily_stats cascade;

-- Enable PostGIS for location features
create extension if not exists postgis;

-- 1. Users Table   
create table if not exists users (
  id text primary key, -- Changed to TEXT to allow both UUIDs (Supabase Auth) and legacy IDs, and match FKs.
  email text unique not null,
  nickname text,
  gender text check (gender in ('MALE', 'FEMALE', 'OTHER')),
  role text default 'user' check (role in ('user', 'admin')),
  credits int default 0,
  last_login timestamptz,
  push_token text,
  notification_enabled boolean default true,
  created_at timestamptz default now()
);

-- 2. Toilets Table
create table if not exists toilets (
  id text primary key, -- Keeping text id to match existing logic (or UUID if preferred, but existing code uses strings often)
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  location geography(POINT), -- PostGIS column
  type text default 'public',
  gender_type text default 'UNISEX',
  floor int default 1,
  has_password boolean default false,
  password text,
  cleanliness int default 3,
  has_bidet boolean default false,
  has_paper boolean default false,
  stall_count int default 1,
  crowd_level text default 'medium',
  is_unlocked boolean default true,
  note text,
  created_by text,
  is_private boolean default false,
  created_at timestamptz default now()
);

-- Index for spatial queries
create index if not exists toilets_location_idx on toilets using GIST(location);

-- 3. Reviews Table
create table if not exists reviews (
  id text primary key,
  toilet_id text references toilets(id) on delete cascade,
  user_id text, -- references users(id) if strict, but let's keep it loose for now if auth is hybrid
  user_name text,
  rating int check (rating >= 1 and rating <= 5),
  content text,
  created_at timestamptz default now()
);

-- 4. Reports Table
create table if not exists reports (
  id text primary key,
  toilet_id text references toilets(id) on delete set null,
  toilet_name text,
  reporter_id text,
  reason text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- 5. Notifications Table
create table if not exists notifications (
  id text primary key,
  type text,
  user_id text references users(id) on delete cascade, -- Now compatible: text references text
  title text,
  message text,
  data jsonb,
  is_read boolean default false,
  sent_at timestamptz default now(),
  delivery_status text default 'pending'
);

-- 6. Banned Locations
create table if not exists banned_locations (
  id text primary key,
  address text,
  reason text,
  banned_at timestamptz default now()
);

-- 7. Banned Users
create table if not exists banned_users (
  id text primary key,
  email text,
  reason text,
  banned_by text,
  banned_at timestamptz default now()
);

-- 8. Upload History
create table if not exists upload_history (
  id text primary key,
  file_name text,
  uploaded_at timestamptz default now(),
  total_count int,
  success_count int,
  added_count int,
  updated_count int,
  fail_count int,
  uploaded_toilet_ids jsonb, -- Array of IDs
  uploaded_by text,
  logs jsonb
);

-- 9. App Config (Key-Value Store)
create table if not exists app_config (
  key text primary key,
  value jsonb
);

-- 10. Daily Stats
create table if not exists daily_stats (
  date date primary key,
  new_users int default 0,
  visitors int default 0,
  new_toilets int default 0,
  new_reviews int default 0,
  ad_views int default 0,
  new_reports int default 0
);

-- RPC Function for Nearby Search
create or replace function get_toilets_nearby(lat_input float, lng_input float, radius_km float)
returns table (
  id text,
  name text,
  address text,
  lat float,
  lng float,
  dist_meters float,
  review_count bigint,
  rating_avg float
)
language plpgsql
as $$
begin
  return query
  select
    t.id,
    t.name,
    t.address,
    t.lat,
    t.lng,
    st_distance(t.location, st_point(lng_input, lat_input)::geography) as dist_meters,
    count(r.id) as review_count,
    coalesce(avg(r.rating), 0) as rating_avg
  from
    toilets t
    left join reviews r on t.id = r.toilet_id
  where
    st_dwithin(t.location, st_point(lng_input, lat_input)::geography, radius_km * 1000)
  group by
    t.id
  order by
    dist_meters asc;
end;
$$;


-- Enable RLS (Row Level Security)
-- For development/MVP/Demo, we might want to be permissive if auth is not fully hooked up.
-- WARNING: These policies allow public access. Tighten them for production.

alter table users enable row level security;
alter table toilets enable row level security;
alter table reviews enable row level security;
alter table reports enable row level security;
alter table notifications enable row level security;
alter table banned_locations enable row level security;
alter table banned_users enable row level security;
alter table upload_history enable row level security;
alter table app_config enable row level security;
alter table daily_stats enable row level security;

-- Public Read/Write Policies (Permissive)
create policy "Public users can read everything" on users for select using (true);
create policy "Public users can insert/update themselves" on users for all using (true);

create policy "Public toilets are viewable by everyone" on toilets for select using (true);
create policy "Anyone can insert/update toilets" on toilets for all using (true);

create policy "Reviews are viewable by everyone" on reviews for select using (true);
create policy "Anyone can add reviews" on reviews for all using (true);

create policy "Anyone can view reports" on reports for select using (true);
create policy "Anyone can add reports" on reports for insert with check (true);
create policy "Anyone can update reports" on reports for update using (true);

-- Default Config insert
insert into app_config (key, value)
values 
('ad_config', '{"source": "adsense", "youtubeUrls": ["", "", "", "", ""]}'),
('credit_policy', '{"login": 5, "reviewSubmit": 10, "toiletRegister": 50, "reportSubmit": 20, "unlockCost": 1}')
on conflict do nothing;
