-- OPTIMIZATION 1: Add Index to address column for faster substring/search
CREATE INDEX IF NOT EXISTS idx_toilets_address ON toilets (address);

-- OPTIMIZATION 2: RPC Function with SECURITY DEFINER
-- 'SECURITY DEFINER' allows the function to run with the privileges of the creator (postgres/service_role),
-- bypassing Row Level Security (RLS) that might filter out rows for anon/authenticated users.
-- This ensures the stats count ALL toilets, regardless of user role.

CREATE OR REPLACE FUNCTION get_regional_stats()
RETURNS TABLE (
    province_id TEXT,
    district_name TEXT,
    total_count BIGINT,
    admin_public_count BIGINT,
    user_male_count BIGINT,
    user_male_locked_count BIGINT,
    user_female_count BIGINT,
    user_female_locked_count BIGINT,
    user_uni_count BIGINT,
    user_uni_locked_count BIGINT,
    rating_sum NUMERIC,
    rating_count BIGINT
) 
SECURITY DEFINER -- IMPORTANT: Run as superuser/creator
AS $$
BEGIN
    RETURN QUERY
    WITH normalized AS (
        SELECT
            *,
            -- Normalize Province ID based on first 2 chars
            CASE
                WHEN substring(address, 1, 2) = '서울' THEN 'seoul'
                WHEN substring(address, 1, 2) = '경기' THEN 'gyeonggi'
                WHEN substring(address, 1, 2) = '인천' THEN 'incheon'
                WHEN substring(address, 1, 2) = '강원' THEN 'gangwon'
                WHEN substring(address, 1, 2) = '제주' THEN 'jeju'
                WHEN substring(address, 1, 2) = '세종' THEN 'sejong'
                WHEN substring(address, 1, 2) = '대전' THEN 'daejeon'
                WHEN substring(address, 1, 2) = '대구' THEN 'daegu'
                WHEN substring(address, 1, 2) = '광주' THEN 'gwangju'
                WHEN substring(address, 1, 2) = '부산' THEN 'busan'
                WHEN substring(address, 1, 2) = '울산' THEN 'ulsan'
                
                -- Explicit Short Forms
                WHEN substring(address, 1, 2) = '충북' THEN 'chungbuk'
                WHEN substring(address, 1, 2) = '충남' THEN 'chungnam'
                WHEN substring(address, 1, 2) = '전북' THEN 'jeonbuk'
                WHEN substring(address, 1, 2) = '전남' THEN 'jeonnam'
                WHEN substring(address, 1, 2) = '경북' THEN 'gyeongbuk'
                WHEN substring(address, 1, 2) = '경남' THEN 'gyeongnam'
                
                -- Extended Forms
                WHEN substring(address, 1, 2) = '충청' THEN
                    CASE 
                        WHEN position('북' in address) > 0 THEN 'chungbuk'
                        ELSE 'chungnam'
                    END
                WHEN substring(address, 1, 2) = '전라' THEN
                    CASE 
                        WHEN position('북' in address) > 0 THEN 'jeonbuk'
                        ELSE 'jeonnam'
                    END
                WHEN substring(address, 1, 2) = '경상' THEN
                    CASE 
                        WHEN position('북' in address) > 0 THEN 'gyeongbuk'
                        ELSE 'gyeongnam'
                    END
                    
                ELSE 'overseas' -- Changed from 'misc' to 'overseas' per user request
            END AS norm_province_id,
            
            COALESCE(split_part(address, ' ', 2), '기타') AS norm_district_name,
            
            -- Is Admin/Public logic
            (source = 'admin' OR created_by = 'admin') AS is_admin_calc
            
        FROM toilets
    )
    SELECT
        norm_province_id,
        norm_district_name,
        COUNT(*) AS total_count,
        
        COUNT(*) FILTER (WHERE is_admin_calc) AS admin_public_count,
        
        COUNT(*) FILTER (WHERE NOT is_admin_calc AND gender_type = 'male') AS user_male_count,
        COUNT(*) FILTER (WHERE NOT is_admin_calc AND gender_type = 'male' AND has_password) AS user_male_locked_count,
        
        COUNT(*) FILTER (WHERE NOT is_admin_calc AND gender_type = 'female') AS user_female_count,
        COUNT(*) FILTER (WHERE NOT is_admin_calc AND gender_type = 'female' AND has_password) AS user_female_locked_count,
        
        COUNT(*) FILTER (WHERE NOT is_admin_calc AND gender_type NOT IN ('male', 'female')) AS user_uni_count,
        COUNT(*) FILTER (WHERE NOT is_admin_calc AND gender_type NOT IN ('male', 'female') AND has_password) AS user_uni_locked_count,
        
        0::NUMERIC AS rating_sum,
        0::BIGINT AS rating_count
        
    FROM normalized
    GROUP BY norm_province_id, norm_district_name;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission to public (or authenticated) so the API can call it
GRANT EXECUTE ON FUNCTION get_regional_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_regional_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_regional_stats() TO service_role;
