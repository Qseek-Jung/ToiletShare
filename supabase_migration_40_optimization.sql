-- OPTIMIZATION MIGRATION: Improving Notification Page Performance

-- 1. Notifications Table Indexes
-- Index for fetching user notifications sorted by sent_at
CREATE INDEX IF NOT EXISTS idx_notifications_user_sent_at ON notifications (user_id, sent_at DESC);

-- Index for cleanup logic (matching type and sent_at filter)
CREATE INDEX IF NOT EXISTS idx_notifications_cleanup ON notifications (user_id, type, sent_at);

-- 2. App Notices Table Indexes
-- Index for fetching active notices sorted by priority and date
CREATE INDEX IF NOT EXISTS idx_app_notices_active_priority ON app_notices (is_active, priority DESC, created_at DESC);

-- 3. User Hidden Notices Table Indexes
-- Index for checking hidden status
CREATE INDEX IF NOT EXISTS idx_user_hidden_notices_user_id ON user_hidden_notices (user_id);
