-- Create profile and role rows from the auth signup event.
-- This avoids client-side inserts during signup, which can fail RLS when
-- email confirmation is enabled and no authenticated session exists yet.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
  safe_role public.app_role;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'normal_user');

  safe_role := CASE requested_role
    WHEN 'seller' THEN 'seller'::public.app_role
    WHEN 'travel_partner' THEN 'travel_partner'::public.app_role
    ELSE 'normal_user'::public.app_role
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id::text, safe_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id::text,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'), '')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_create_profile_role ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

