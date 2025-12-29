-- Add withdrawal related columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS withdrawal_reason text,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Add index for better performance when filtering withdrawn users
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- Update RLS policies (optional but recommended) to handle 'deleted' status if necessary
-- For now, we assume existing policies cover update access for the user themselves.
