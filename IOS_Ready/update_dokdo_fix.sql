-- 독도 및 울릉도 정밀 보정을 위한 함수 업데이트
create or replace function check_is_on_land(lat double precision, lng double precision)
returns boolean
language plpgsql
security definer
as $$
declare
  is_in_poly boolean;
begin
  -- 1. Check Natural Earth Polygon
  select exists (
    select 1 
    from korea_geography
    where ST_Intersects(
      geog, 
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    )
  ) into is_in_poly;

  if is_in_poly then
    return true;
  end if;

  -- 2. Explicit Check for Dokdo (독도)
  -- Center: 37.2429, 131.8665. Allow ~2km radius buffer
  if ST_DWithin(
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(131.8665, 37.2429), 4326)::geography,
      3000 -- 3km radius
  ) then
      return true;
  end if;

   -- 3. Explicit Check for Ulleungdo (울릉도) just in case
  if ST_DWithin(
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(130.8666, 37.5029), 4326)::geography,
      10000 -- 10km radius
  ) then
      return true;
  end if;

  return false;
end;
$$;
