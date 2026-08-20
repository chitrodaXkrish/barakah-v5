create extension if not exists pg_net with schema extensions;

create or replace function public.send_welcome_email_on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://fltyhbpfyanzdamzlsif.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'schema', 'auth',
      'table', 'users',
      'record', jsonb_build_object(
        'id', new.id,
        'email', new.email,
        'raw_user_meta_data', new.raw_user_meta_data,
        'created_at', new.created_at
      )
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

revoke all on function public.send_welcome_email_on_auth_user_created() from public;
revoke all on function public.send_welcome_email_on_auth_user_created() from anon;
revoke all on function public.send_welcome_email_on_auth_user_created() from authenticated;

drop trigger if exists on_auth_user_created_send_welcome_email on auth.users;

create trigger on_auth_user_created_send_welcome_email
after insert on auth.users
for each row
execute function public.send_welcome_email_on_auth_user_created();
