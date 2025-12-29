-- ULTIMATE FIX: Version 2 - JSON Return
-- Using JSON Return type avoids PostgREST schema mapping errors (400 Bad Request).

-- 1. Drop old attempts if they exist (Cleanup)
DROP FUNCTION IF EXISTS get_toilet_registration_stats();
DROP FUNCTION IF EXISTS get_daily_stats();

-- 2. Define V2 Function (Returns JSON directly)
CREATE OR REPLACE FUNCTION get_toilet_registration_stats_v2()
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(agg), '[]'::json)
    INTO result
    FROM (
        SELECT
            TO_CHAR(t.created_at::timestamptz AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS "date_key",
            
            -- Boolean Logic: Explicitly handle NULLs
            COALESCE(
                (t.source = 'admin' OR t.created_by = 'admin' OR u.role IN ('ADMIN', 'VIP')), 
                FALSE
            ) AS "is_admin",
            
            COUNT(*) AS "total_count",
            
            COUNT(*) FILTER (WHERE t.gender_type = 'male') AS "male_count",
            COUNT(*) FILTER (WHERE t.gender_type = 'male' AND t.has_password) AS "male_locked_count",
            
            COUNT(*) FILTER (WHERE t.gender_type = 'female') AS "female_count",
            COUNT(*) FILTER (WHERE t.gender_type = 'female' AND t.has_password) AS "female_locked_count",
            
            COUNT(*) FILTER (WHERE t.gender_type NOT IN ('male', 'female')) AS "uni_count",
            COUNT(*) FILTER (WHERE t.gender_type NOT IN ('male', 'female') AND t.has_password) AS "uni_locked_count",
            
            COALESCE(SUM(t.rating_avg), 0) AS "rating_sum",
            COUNT(t.rating_avg) FILTER (WHERE t.rating_avg > 0) AS "rating_count"

        FROM toilets t
        LEFT JOIN users u ON t.created_by = u.id
        GROUP BY 1, 2
        ORDER BY 1 DESC
    ) agg;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Grant Permissions
GRANT EXECUTE ON FUNCTION get_toilet_registration_stats_v2() TO anon;
GRANT EXECUTE ON FUNCTION get_toilet_registration_stats_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION get_toilet_registration_stats_v2() TO service_role;
