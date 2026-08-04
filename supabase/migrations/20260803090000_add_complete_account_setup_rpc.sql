CREATE OR REPLACE FUNCTION public.complete_account_setup(_role public.app_role, _full_name text)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id text;
  clean_full_name text;
BEGIN
  current_user_id := auth.uid()::text;
  clean_full_name := NULLIF(BTRIM(_full_name), '');

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to complete setup.';
  END IF;

  IF clean_full_name IS NULL THEN
    RAISE EXCEPTION 'Please enter your full name.';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (current_user_id, clean_full_name)
  ON CONFLICT (user_id) DO UPDATE
  SET full_name = EXCLUDED.full_name;

  RETURN _role;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_account_setup(public.app_role, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_account_setup(public.app_role, text) TO authenticated;
