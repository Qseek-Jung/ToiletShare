-- Create credit_logs table for tracking credit history
-- Matches requirements in db_supabase.ts

create table if not exists credit_logs (
    id uuid default gen_random_uuid() primary key,
    user_id text references users(id) on delete set null,
    amount int not null,
    type text not null, -- 'signup', 'review', 'ad_reward', etc.
    related_type text, -- 'review', 'toilet', etc.
    related_id text, -- ID of the related item
    description text,
    created_at timestamptz default now()
);

-- Add indexes
create index if not exists idx_credit_logs_created_at on credit_logs(created_at);
create index if not exists idx_credit_logs_user_id on credit_logs(user_id);
create index if not exists idx_credit_logs_type on credit_logs(type);

-- Enable RLS
alter table credit_logs enable row level security;

-- Policies (Drop first to avoid "already exists" error on retry)
drop policy if exists "Admins can view all credit logs" on credit_logs;
create policy "Admins can view all credit logs" 
on credit_logs for select 
using (
    exists (
        select 1 from users
        where users.id = auth.uid()::text 
        and users.role = 'admin'
    )
);

drop policy if exists "Users can view their own credit logs" on credit_logs;
create policy "Users can view their own credit logs"
on credit_logs for select
using (
    auth.uid()::text = user_id
);

drop policy if exists "Users and Service Key can insert logs" on credit_logs;
create policy "Users and Service Key can insert logs"
on credit_logs for insert
with check (
    -- Allow user to insert their own logs (for client-side triggers)
    auth.uid()::text = user_id
);

-- Create RPC function to log transactions (Security Definer to ensure writes work)
-- First, drop conflicting signatures to resolve "Count not choose best candidate function" error
drop function if exists log_credit_transaction_rpc(text, int, text, text, text, text);
drop function if exists log_credit_transaction_rpc(text, numeric, text, text, text, text);

create or replace function log_credit_transaction_rpc(
    p_user_id text,
    p_amount int,
    p_type text,
    p_related_type text default null,
    p_related_id text default null,
    p_description text default null
)
returns void
language plpgsql
security definer -- Run as owner (bypass RLS for insertion if needed)
as $$
begin
    insert into credit_logs (user_id, amount, type, related_type, related_id, description)
    values (p_user_id, p_amount, p_type, p_related_type, p_related_id, p_description);
end;
$$;

-- Create RPC to fetch logs for Admin Stats (Bypassing RLS for Dashboard)
drop function if exists get_credit_logs_rpc(int);
create or replace function get_credit_logs_rpc(days int)
returns setof credit_logs
language plpgsql
security definer
as $$
begin
    return query
    select *
    from credit_logs
    where created_at >= (now() - (days || ' days')::interval)
    order by created_at asc;
end;
$$;

-- Create Aggregation RPC (Fixes 1000 row limit issue by grouping on server)
drop function if exists get_credit_stats_summary_rpc(int);
create or replace function get_credit_stats_summary_rpc(days int)
returns table (
    log_date text,
    log_type text,
    total_amount bigint
)
language plpgsql
security definer
as $$
begin
    return query
    select 
        to_char(created_at, 'YYYY-MM-DD') as log_date,
        type as log_type,
        sum(amount)::bigint as total_amount
    from credit_logs
    where created_at >= (now() - (days || ' days')::interval)
    group by to_char(created_at, 'YYYY-MM-DD'), type
    order by log_date asc;
end;
$$;
