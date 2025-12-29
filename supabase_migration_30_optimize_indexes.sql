-- Database Optimization Migration
-- Adds missing indexes to improve query performance particularly for Statistics and Map filtering.

-- 1. Toilets: Improve Statistics Query Speed (Sorting/Filtering by Date)
CREATE INDEX IF NOT EXISTS idx_toilets_created_at ON toilets(created_at DESC);

-- 2. Toilets: Improve "My Registered Toilets" & Admin Joins
CREATE INDEX IF NOT EXISTS idx_toilets_created_by ON toilets(created_by);

-- 3. Toilets: Improve Source Filtering (Admin vs User)
CREATE INDEX IF NOT EXISTS idx_toilets_source ON toilets(source);

-- 4. Reviews: Improve Fetching Reviews for a Toilet (Join Key)
CREATE INDEX IF NOT EXISTS idx_reviews_toilet_id ON reviews(toilet_id);

-- 5. Users: Improve Admin Filtering (Role checks)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 6. Notifications: Improve "Unread" Fetches
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;


