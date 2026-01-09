-- Migration: Create toilets_bulk table for Staging Area

create table if not exists toilets_bulk (
    id uuid primary key default gen_random_uuid(),
    upload_id text references upload_history(id) on delete cascade,
    
    -- Raw Data
    name_raw text,
    address_raw text,
    lat_raw double precision,
    lng_raw double precision,
    
    -- Normalized Data
    name text,
    address text,
    lat double precision,
    lng double precision,
    floor int default 1,
    
    -- Status & Meta
    status text check (status in ('auto_ready', 'review_needed', 'done', 'rejected')),
    reason text,
    logs jsonb,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Index for querying by upload_id
create index if not exists toilets_bulk_upload_id_idx on toilets_bulk(upload_id);

-- RLS Policies
alter table toilets_bulk enable row level security;

create policy "Admins can do everything on toilets_bulk"
    on toilets_bulk for all
    using (true) -- Simplified for MVP/Admin context
    with check (true);
