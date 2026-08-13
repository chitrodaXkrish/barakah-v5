create table if not exists public.auth_email_otps (
  email text primary key,
  code_hash text not null,
  attempts integer not null default 0,
  last_sent_at timestamp with time zone,
  expires_at timestamp with time zone not null,
  verified_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.email_send_log (
  id uuid primary key default gen_random_uuid(),
  message_id text unique,
  template_name text,
  recipient_email text not null,
  status text not null default 'pending',
  provider text,
  provider_message_id text,
  error_message text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.email_send_state (
  id uuid primary key default gen_random_uuid(),
  queue_name text not null,
  message_id text not null unique,
  idempotency_key text unique,
  recipient_email text,
  payload jsonb not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  last_attempt_at timestamp with time zone,
  next_attempt_at timestamp with time zone,
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.email_unsubscribe_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  email text not null,
  token_hash text not null unique,
  scope text not null default 'all',
  expires_at timestamp with time zone,
  used_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.suppressed_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  reason text,
  source text,
  suppressed_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  prayer_reminders boolean not null default true,
  community_updates boolean not null default true,
  marketplace_updates boolean not null default true,
  news_updates boolean not null default true,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  quiet_hours_start time without time zone,
  quiet_hours_end time without time zone,
  timezone text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  title text not null,
  body text,
  type text not null default 'general',
  data jsonb not null default '{}'::jsonb,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  token text not null unique,
  platform text,
  device_id text,
  is_active boolean not null default true,
  last_seen_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.scan_history (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  product_name text not null default 'Unknown Product',
  brand text,
  status text not null default 'unknown' check (status in ('halal', 'haram', 'mushbooh', 'unknown')),
  confidence integer check (confidence between 0 and 100),
  verdict text,
  category text,
  region text,
  ingredients_hash text,
  product_cache_id uuid references public.product_halal_cache(id) on delete set null,
  created_at timestamp with time zone not null default now()
);

create index if not exists auth_email_otps_expires_at_idx
  on public.auth_email_otps(expires_at);

create index if not exists email_send_log_recipient_created_idx
  on public.email_send_log(recipient_email, created_at desc);

create index if not exists email_send_state_status_next_attempt_idx
  on public.email_send_state(status, next_attempt_at);

create index if not exists email_unsubscribe_tokens_email_idx
  on public.email_unsubscribe_tokens(email);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

create index if not exists push_tokens_user_id_idx
  on public.push_tokens(user_id);

create index if not exists scan_history_created_idx
  on public.scan_history(created_at desc);

create index if not exists scan_history_product_cache_id_idx
  on public.scan_history(product_cache_id);

alter table public.auth_email_otps enable row level security;
alter table public.email_send_log enable row level security;
alter table public.email_send_state enable row level security;
alter table public.email_unsubscribe_tokens enable row level security;
alter table public.suppressed_emails enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.scan_history enable row level security;

drop policy if exists "Service role manages auth email otps" on public.auth_email_otps;
create policy "Service role manages auth email otps" on public.auth_email_otps
for all to service_role using (true) with check (true);

drop policy if exists "Service role manages email send log" on public.email_send_log;
create policy "Service role manages email send log" on public.email_send_log
for all to service_role using (true) with check (true);

drop policy if exists "Service role manages email send state" on public.email_send_state;
create policy "Service role manages email send state" on public.email_send_state
for all to service_role using (true) with check (true);

drop policy if exists "Service role manages unsubscribe tokens" on public.email_unsubscribe_tokens;
create policy "Service role manages unsubscribe tokens" on public.email_unsubscribe_tokens
for all to service_role using (true) with check (true);

drop policy if exists "Service role manages suppressed emails" on public.suppressed_emails;
create policy "Service role manages suppressed emails" on public.suppressed_emails
for all to service_role using (true) with check (true);

drop policy if exists "Users read own notification preferences" on public.notification_preferences;
create policy "Users read own notification preferences" on public.notification_preferences
for select to authenticated using (user_id = auth.uid()::text);

drop policy if exists "Users insert own notification preferences" on public.notification_preferences;
create policy "Users insert own notification preferences" on public.notification_preferences
for insert to authenticated with check (user_id = auth.uid()::text);

drop policy if exists "Users update own notification preferences" on public.notification_preferences;
create policy "Users update own notification preferences" on public.notification_preferences
for update to authenticated using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
for select to authenticated using (user_id = auth.uid()::text);

drop policy if exists "Service role creates notifications" on public.notifications;
create policy "Service role creates notifications" on public.notifications
for insert to service_role with check (true);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
for update to authenticated using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists "Users manage own push tokens" on public.push_tokens;
create policy "Users manage own push tokens" on public.push_tokens
for all to authenticated using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists "Users read own scan history" on public.scan_history;
create policy "Users read own scan history" on public.scan_history
for select to authenticated using (user_id is null or user_id = auth.uid()::text);

drop policy if exists "Service role creates scan history" on public.scan_history;
create policy "Service role creates scan history" on public.scan_history
for insert to service_role with check (true);

create or replace function public.enqueue_email(queue_name text, payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
  payload_message_id text;
  payload_idempotency_key text;
begin
  payload_message_id := coalesce(payload->>'message_id', gen_random_uuid()::text);
  payload_idempotency_key := coalesce(payload->>'idempotency_key', payload_message_id);

  insert into public.email_send_state (
    queue_name,
    message_id,
    idempotency_key,
    recipient_email,
    payload,
    status,
    next_attempt_at
  )
  values (
    queue_name,
    payload_message_id,
    payload_idempotency_key,
    payload->>'to',
    payload,
    'queued',
    now()
  )
  on conflict (idempotency_key) do update
  set
    payload = excluded.payload,
    updated_at = now()
  returning id into inserted_id;

  return inserted_id;
end;
$$;

revoke execute on function public.enqueue_email(text, jsonb) from public, anon, authenticated;
grant execute on function public.enqueue_email(text, jsonb) to service_role;
