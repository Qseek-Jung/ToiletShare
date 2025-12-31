-- 육지 검증 로직 개선: 버퍼(여유 범위) 적용
-- Natural Earth 데이터의 해상도 한계를 극복하고 해안가/섬 지역 인식을 위해
-- ST_DWithin을 사용하여 육지 폴리곤에서 약 500m~1km 이내면 육지로 간주합니다.

create or replace function check_is_on_land(lat double precision, lng double precision)
returns boolean
language plpgsql
security definer
as $$
declare
  is_near_land boolean;
begin
  -- 1. Check distance to Korea Polygon (Mainland + Jeju)
  -- ST_DWithin(geog1, geog2, distance_meters)
  -- 1000m (1km) buffer to be safe for coastal roads and small nearby islands
  select exists (
    select 1 
    from korea_geography
    where ST_DWithin(
      geog, 
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      1000 -- 1000 meters buffer (넉넉하게 1km 적용)
    )
  ) into is_near_land;

  if is_near_land then
    return true;
  end if;

  -- 2. Explicit Check for Dokdo (독도) - Already covered by logic above if polygon exists, 
  -- but keeping specific logic for safety if Dokdo is far from main polygon
  if ST_DWithin(
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(131.8665, 37.2429), 4326)::geography,
      3000 -- 3km radius for Dokdo
  ) then
      return true;
  end if;

   -- 3. Explicit Check for Ulleungdo (울릉도)
  if ST_DWithin(
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(130.8666, 37.5029), 4326)::geography,
      5000 -- 5km radius
  ) then
      return true;
  end if;

  return false;
end;
$$;
