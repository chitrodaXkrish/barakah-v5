-- Firebase auth means Supabase's auth.uid() is null; role/profile lookups after sign-in must work without a Supabase session.
-- Restore anon SELECT while keeping writes restricted.

GRANT SELECT ON public.user_roles TO anon;
GRANT SELECT ON public.profiles TO anon;

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Anyone can read user_roles"
ON public.user_roles
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Anyone can read profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);
