-- ULTIMATE FIX: Version 3 - Safe Data & Performance
-- 1. Filters out invalid date formats to prevent 400 Errors.
-- 2. Returns JSON to prevent Schema errors.

-- Cleanup
DROP FUNCTION IF EXISTS get_toilet_registration_stats_v2();
DROP FUNCTION IF EXISTS get_toilet_registration_stats();

-- Define V3 Check Function
CREATE OR REPLACE FUNCTION get_toilet_registration_stats_v3()
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
            -- Safe Date Conversion: Only processes rows that match ISO format somewhat
            TO_CHAR(t.created_at::timestamptz AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS "date_key",
            
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
        -- SAFETY FILTER: Exclude rows with missing or malformed dates to prevent Cast Errors
        WHERE t.created_at IS NOT NULL 
          AND t.created_at ~ '^\d{4}-\d{2}-\d{2}' 
        GROUP BY 1, 2
        ORDER BY 1 DESC
    ) agg;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Permissions
GRANT EXECUTE ON FUNCTION get_toilet_registration_stats_v3() TO anon;
GRANT EXECUTE ON FUNCTION get_toilet_registration_stats_v3() TO authenticated;
GRANT EXECUTE ON FUNCTION get_toilet_registration_stats_v3() TO service_role;
