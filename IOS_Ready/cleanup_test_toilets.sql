-- Final Cleanup Script: Deleting ALL toilets in Seoul and Gyeonggi-do
-- Targeted regions: Seoul, Gyeonggi-do

-- 1. Dry Run / Selection (Optional)
-- SELECT name, address FROM toilets 
-- WHERE (address LIKE '서울%' OR address LIKE '경기도%');

-- 2. Delete ALL toilets in Seoul and Gyeonggi-do
-- AND also delete Daegu addresses that are incorrectly located in Seoul (Lat > 37)
DELETE FROM toilets 
WHERE 
    address LIKE '서울%' 
    OR address LIKE '경기도%'
    OR (
        (address LIKE '%대구%' OR address LIKE '%군위%') 
        AND lat > 37.0
    );

-- 3. Related reviews will be deleted automatically due to CASCADE.
