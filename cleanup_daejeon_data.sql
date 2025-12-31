-- 대전광역시 데이터 삭제 SQL

-- 1. toilets 테이블 (실제 화장실 데이터)에서 삭제
DELETE FROM toilets 
WHERE address LIKE '%대전광역시%';

-- 2. toilets_bulk 테이블 (대량 업로드 대기/거절 데이터)에서 삭제
DELETE FROM toilets_bulk 
WHERE address LIKE '%대전광역시%' 
   OR address_raw LIKE '%대전광역시%';
