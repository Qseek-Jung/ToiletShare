-- Create system_settings table for global configuration
-- Changed updated_by to TEXT to match users.id type
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT REFERENCES public.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can view and edit
DROP POLICY IF EXISTS "Admins can view and edit settings" ON public.system_settings;
CREATE POLICY "Admins can view and edit settings"
ON public.system_settings
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND role IN ('ADMIN', 'VIP')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND role IN ('ADMIN', 'VIP')
  )
);

-- Public read access
DROP POLICY IF EXISTS "Public read settings" ON public.system_settings;
CREATE POLICY "Public read settings"
ON public.system_settings FOR SELECT
USING (true);

-- Insert default value for level up reward
INSERT INTO public.system_settings (key, value, description)
VALUES ('level_up_reward', '10', 'Credits given when a user levels up')
ON CONFLICT (key) DO NOTHING;
