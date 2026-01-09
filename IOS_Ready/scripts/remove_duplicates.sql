-- Supabase SQL Editor에서 실행
-- 대구광역시 중복 화장실 데이터 삭제

-- 1. 먼저 중복 확인 (실행해서 확인)
SELECT 
    address,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as ids,
    MIN(created_at) as oldest
FROM toilets
WHERE address ILIKE '%대구광역시%'
GROUP BY address
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. 중복 삭제 (주의: 첫 번째 등록된 것만 남기고 나머지 삭제)
-- 아래 쿼리를 실행하기 전에 위 쿼리로 확인 필수!

WITH ranked_toilets AS (
    SELECT 
        id,
        address,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY address 
            ORDER BY created_at ASC  -- 가장 오래된 것을 1번으로
        ) as rn
    FROM toilets
    WHERE address ILIKE '%대구광역시%'
)
DELETE FROM toilets
WHERE id IN (
    SELECT id 
    FROM ranked_toilets 
    WHERE rn > 1  -- 2번째 이후는 모두 삭제
);

-- 3. 삭제 결과 확인
SELECT 
    COUNT(*) as total_daegu_toilets
FROM toilets
WHERE address ILIKE '%대구광역시%';
