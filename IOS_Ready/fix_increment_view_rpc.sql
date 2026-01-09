-- 1. Drop the old UUID version if it exists to avoid ambiguity
DROP FUNCTION IF EXISTS increment_toilet_view(uuid);

-- 2. Create the function with TEXT parameter type
-- The toilets table uses TEXT for the 'id' column
CREATE OR REPLACE FUNCTION increment_toilet_view(t_id text)
RETURNS int AS $$
DECLARE
  new_count int;
BEGIN
  UPDATE public.toilets
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = t_id
  RETURNING view_count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execution permissions
GRANT EXECUTE ON FUNCTION increment_toilet_view(text) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_toilet_view(text) TO anon;
GRANT EXECUTE ON FUNCTION increment_toilet_view(text) TO service_role;
