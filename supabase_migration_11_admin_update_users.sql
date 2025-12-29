-- Create a policy to allow Admins to UPDATE the users table
-- This enables role management (changing User -> VIP -> Admin etc.)

-- Assuming check_is_admin() function exists from migration 7.
-- If not, re-declare or rely on previous executed migrations.

DROP POLICY IF EXISTS "Admins can update user roles" ON public.users;

CREATE POLICY "Admins can update user roles"
ON public.users FOR UPDATE
USING (
  public.check_is_admin()
)
WITH CHECK (
  public.check_is_admin()
);
