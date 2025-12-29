-- Add device specific visitor columns to daily_stats
alter table daily_stats
add column if not exists visitors_mobile int default 0,
add column if not exists visitors_tablet int default 0,
add column if not exists visitors_pc int default 0;

-- Optional: If you want to distribute existing visitors (heuristic: assume 80% mobile for past data if you want "fake" backfill, but better to keep 0 or leave as is)
-- We will leave them as 0 for past days, or we can just say past visitors are 'unknown' or just ignore breakdown for past.
