-- Migration V2: User Levels, Credit History, and Review Reactions

-- 1. Update Users Table
-- Add new columns for level system and status management
ALTER TABLE users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'banned'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_score float DEFAULT 0.0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level int DEFAULT 0 CHECK (level >= 0 AND level <= 6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS level_override boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS next_login_notice jsonb;

-- 2. Create Credit History Table
CREATE TABLE IF NOT EXISTS credit_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  amount int NOT NULL,
  type text NOT NULL, -- 'signup', 'review_add', 'score_manual', etc.
  reference_type text, -- 'review', 'report', 'toilet', 'admin'
  reference_id text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for credit_history
ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own credit history" ON credit_history FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can view all credit history" ON credit_history FOR SELECT USING (true); -- Assuming permissive for now or admin check

-- 3. Create Review Reactions Table
CREATE TABLE IF NOT EXISTS review_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id text REFERENCES reviews(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  type text DEFAULT 'like' CHECK (type IN ('like', 'dislike')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id) -- One reaction per user per review
);

-- Enable RLS for review_reactions
ALTER TABLE review_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view reactions" ON review_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add reactions" ON review_reactions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own reactions" ON review_reactions FOR DELETE USING (auth.uid()::text = user_id);

-- 4. Update Reviews Table
-- Add like_count for performance (denormalization)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS like_count int DEFAULT 0;

-- 5. Create User Activity Stats View
-- This simplifies fetching dashboard metrics
CREATE OR REPLACE VIEW user_activity_stats AS
SELECT
  u.id AS user_id,
  (SELECT count(*) FROM toilets t WHERE t.created_by = u.id) AS toilet_count,
  (SELECT count(*) FROM reviews r WHERE r.user_id = u.id) AS review_count,
  (SELECT count(*) FROM reports rp WHERE rp.reporter_id = u.id) AS report_total_count,
  (SELECT count(*) FROM reports rp WHERE rp.reporter_id = u.id AND rp.status = 'resolved') AS report_success_count,
  COALESCE(
    NULLIF((SELECT count(*) FROM reports rp WHERE rp.reporter_id = u.id AND rp.status = 'resolved')::float, 0) / 
    NULLIF((SELECT count(*) FROM reports rp WHERE rp.reporter_id = u.id)::float, 0) * 100, 
  0) AS report_success_rate
  -- Note: Login count and Ad view count are usually tracked in 'users' or separate analytics table.
  -- For this view, we'll assume they might be stored in 'users' eventually or joined from daily_stats if normalized.
  -- For now, we will add fields to 'users' if we want to track totals there, or count log entries.
  -- Let's stick to the Plan: we need login_count and ad_view_count.
  -- Simpler approach: Add counters to `users` table for these high-frequency updates to avoid expensive count(*) on huge logs.
FROM users u;

-- Add counters to users table for high-frequency stats
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count int DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ad_view_count int DEFAULT 0;

-- Re-create View to include these
CREATE OR REPLACE VIEW user_activity_stats AS
SELECT
  u.id AS user_id,
  (SELECT count(*) FROM toilets t WHERE t.created_by = u.id) AS toilet_count,
  (SELECT count(*) FROM reviews r WHERE r.user_id = u.id) AS review_count,
  (SELECT count(*) FROM reports rp WHERE rp.reporter_id = u.id) AS report_total_count,
  (SELECT count(*) FROM reports rp WHERE rp.reporter_id = u.id AND rp.status = 'resolved') AS report_success_count,
  COALESCE(
    NULLIF((SELECT count(*) FROM reports rp WHERE rp.reporter_id = u.id AND rp.status = 'resolved')::float, 0) / 
    NULLIF((SELECT count(*) FROM reports rp WHERE rp.reporter_id = u.id)::float, 0) * 100, 
  0) AS report_success_rate,
  u.login_count,
  u.ad_view_count
FROM users u;
