-- FINAL FIX: Toilet Statistics RPC
-- Renamed and Cleaned to ensure no conflicts.

-- 1. Cleanup Old Functions (to remove confusion)
DROP FUNCTION IF EXISTS get_daily_stats();
DROP FUNCTION IF EXISTS get_toilet_registration_stats();

-- 2. Index for Performance (Safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_toilets_created_at ON toilets (created_at);

-- 3. Define the Optimized RPC Function
-- Name: get_toilet_registration_stats
-- Returns: Daily aggregation of toilet data
CREATE OR REPLACE FUNCTION get_toilet_registration_stats()
RETURNS TABLE (
    date_key TEXT,           -- 'YYYY-MM-DD'
    is_admin BOOLEAN,        -- true if source='admin' or creator is ADMIN/VIP
    total_count BIGINT,
    male_count BIGINT,
    male_locked_count BIGINT,
    female_count BIGINT,
    female_locked_count BIGINT,
    uni_count BIGINT,
    uni_locked_count BIGINT,
    rating_sum NUMERIC,
    rating_count BIGINT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(t.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS date_key,
        -- Determine Admin Status
        (t.source = 'admin' OR t.created_by = 'admin' OR u.role IN ('ADMIN', 'VIP')) AS is_admin,
        
        COUNT(*) AS total_count,
        
        COUNT(*) FILTER (WHERE t.gender_type = 'male') AS male_count,
        COUNT(*) FILTER (WHERE t.gender_type = 'male' AND t.has_password) AS male_locked_count,
        
        COUNT(*) FILTER (WHERE t.gender_type = 'female') AS female_count,
        COUNT(*) FILTER (WHERE t.gender_type = 'female' AND t.has_password) AS female_locked_count,
        
        COUNT(*) FILTER (WHERE t.gender_type NOT IN ('male', 'female')) AS uni_count,
        COUNT(*) FILTER (WHERE t.gender_type NOT IN ('male', 'female') AND t.has_password) AS uni_locked_count,
        
        COALESCE(SUM(t.rating_avg), 0) AS rating_sum,
        COUNT(t.rating_avg) FILTER (WHERE t.rating_avg > 0) AS rating_count

    FROM toilets t
    LEFT JOIN users u ON t.created_by = u.id
    GROUP BY 1, 2
    ORDER BY 1 DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Grant Permissions (Crucial for 400/403 Fix)
GRANT EXECUTE ON FUNCTION get_toilet_registration_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_toilet_registration_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_toilet_registration_stats() TO service_role;
