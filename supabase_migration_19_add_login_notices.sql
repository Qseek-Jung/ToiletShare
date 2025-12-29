-- Add login_notices column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS login_notices JSONB DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.users.login_notices IS 'Queue of notifications to show on next login (JSON array)';
