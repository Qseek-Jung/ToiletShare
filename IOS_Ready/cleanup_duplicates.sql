-- cleanup_duplicates.sql
-- 동일한 'address'를 가진 중복 화장실 제거 (가장 최근에 생성된 1개만 유지)

BEGIN;

-- 1. 삭제 전 중복 개수 확인 (로그용)
DO $$
DECLARE
    duplicate_count INT;
BEGIN
    SELECT COUNT(*)
    INTO duplicate_count
    FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY address ORDER BY created_at DESC) as rn
        FROM public.toilets
        WHERE address IS NOT NULL AND address != '' AND address != '주소 없음'
    ) t
    WHERE t.rn > 1;

    RAISE NOTICE '삭제 예정인 중복 데이터 수: %', duplicate_count;
END $$;

-- 2. 중복 데이터 삭제 실행
DELETE FROM public.toilets
WHERE id IN (
    SELECT id
    FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY address ORDER BY created_at DESC) as rn
        FROM public.toilets
        WHERE address IS NOT NULL AND address != '' AND address != '주소 없음'
    ) t
    WHERE t.rn > 1
);

COMMIT;

-- 3. 확인용: 남아있는 중복이 있는지 조회 (0이어야 정상)
SELECT address, count(*) 
FROM public.toilets 
WHERE address IS NOT NULL AND address != '' AND address != '주소 없음'
GROUP BY address 
HAVING count(*) > 1;
