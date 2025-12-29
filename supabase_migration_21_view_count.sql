-- Add view_count column to toilets table
ALTER TABLE public.toilets ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Comment on column
COMMENT ON COLUMN public.toilets.view_count IS 'Number of times the toilet detail has been viewed';

-- 2. Create RPC function to safely increment view count
CREATE OR REPLACE FUNCTION increment_view_count(t_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.toilets
  SET view_count = view_count + 1
  WHERE id = t_id;
END;
$$;
