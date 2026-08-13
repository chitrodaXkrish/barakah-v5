-- Incremental schema additions for an existing Barakah Supabase project.
-- Use this when the base schema already exists and full schema_dump.sql fails with already-exists errors.
-- Includes product halal cache, Guftagu community tables/admin rights, and email/notification/scan tables.


-- -----------------------------------------------------------------------------
-- supabase/migrations/20260810090000_create_product_halal_cache.sql
-- -----------------------------------------------------------------------------

-- Phase 2: Canonical product halal result cache.
-- One row per normalized barcode, shared across all users.
-- scan_history remains the per-user scan log.

CREATE TABLE IF NOT EXISTS public.product_halal_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_barcode TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  brand TEXT,
  status TEXT NOT NULL CHECK (status IN ('halal', 'haram', 'mushbooh', 'unknown')),
  confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
  verdict TEXT,
  ingredients JSONB NOT NULL,
  ingredients_hash TEXT NOT NULL,
  source TEXT,
  rules_version TEXT DEFAULT 'halal-rules-v1',
  ai_model TEXT,
  ai_prompt_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_halal_cache_status_idx
  ON public.product_halal_cache(status);

CREATE INDEX IF NOT EXISTS product_halal_cache_ingredients_hash_idx
  ON public.product_halal_cache(ingredients_hash);

CREATE INDEX IF NOT EXISTS product_halal_cache_rules_version_idx
  ON public.product_halal_cache(rules_version);

GRANT SELECT ON public.product_halal_cache TO authenticated, anon;
GRANT ALL ON public.product_halal_cache TO service_role;

ALTER TABLE public.product_halal_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read product halal cache"
  ON public.product_halal_cache;

CREATE POLICY "Authenticated can read product halal cache"
  ON public.product_halal_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- scan_history: add nullable FK to the canonical cache when that table exists.
-- Some checkouts/projects do not include scan_history, so keep this dump replayable.
DO $$
BEGIN
  IF to_regclass('public.scan_history') IS NOT NULL THEN
    ALTER TABLE public.scan_history
      ADD COLUMN IF NOT EXISTS product_cache_id UUID
      REFERENCES public.product_halal_cache(id)
      ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS scan_history_product_cache_id_idx
      ON public.scan_history(product_cache_id);
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260813090000_create_guftagu_communities.sql
-- -----------------------------------------------------------------------------

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  image_url text,
  category text not null default 'ummah',
  created_by uuid not null references auth.users(id) on delete cascade,
  member_count integer not null default 1,
  post_count integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamp with time zone not null default now(),
  unique (community_id, user_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  image_url text,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  unique (post_id, user_id)
);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.post_likes enable row level security;

drop policy if exists "Anyone can read communities" on public.communities;
create policy "Anyone can read communities" on public.communities
for select using (true);

drop policy if exists "Authenticated users can create communities" on public.communities;
create policy "Authenticated users can create communities" on public.communities
for insert to authenticated
with check (auth.uid() = created_by);

drop policy if exists "Creators can update their communities" on public.communities;
create policy "Creators can update their communities" on public.communities
for update to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Anyone can read community members" on public.community_members;
create policy "Anyone can read community members" on public.community_members
for select using (true);

drop policy if exists "Users can join communities" on public.community_members;
create policy "Users can join communities" on public.community_members
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can leave communities" on public.community_members;
create policy "Users can leave communities" on public.community_members
for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Everyone can read community posts" on public.community_posts;
create policy "Everyone can read community posts" on public.community_posts
for select using (true);

drop policy if exists "Authenticated users can create community posts" on public.community_posts;
create policy "Authenticated users can create community posts" on public.community_posts
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their community posts" on public.community_posts;
create policy "Users can delete their community posts" on public.community_posts
for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Everyone can read community comments" on public.community_comments;
create policy "Everyone can read community comments" on public.community_comments
for select using (true);

drop policy if exists "Authenticated users can create community comments" on public.community_comments;
create policy "Authenticated users can create community comments" on public.community_comments
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their community comments" on public.community_comments;
create policy "Users can delete their community comments" on public.community_comments
for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Everyone can read post likes" on public.post_likes;
create policy "Everyone can read post likes" on public.post_likes
for select using (true);

drop policy if exists "Authenticated users can like community posts" on public.post_likes;
create policy "Authenticated users can like community posts" on public.post_likes
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can unlike community posts" on public.post_likes;
create policy "Users can unlike community posts" on public.post_likes
for delete to authenticated
using (auth.uid() = user_id);

create index if not exists community_members_community_id_idx
  on public.community_members(community_id);

create index if not exists community_members_user_id_idx
  on public.community_members(user_id);

create index if not exists community_posts_community_created_idx
  on public.community_posts(community_id, created_at desc);

create index if not exists community_comments_post_created_idx
  on public.community_comments(post_id, created_at asc);

create index if not exists post_likes_post_id_idx
  on public.post_likes(post_id);

create or replace function public.refresh_community_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.communities
    set member_count = (
      select count(*) from public.community_members where community_id = new.community_id
    )
    where id = new.community_id;
    return new;
  end if;

  update public.communities
  set member_count = (
    select count(*) from public.community_members where community_id = old.community_id
  )
  where id = old.community_id;
  return old;
end;
$$;

create or replace function public.refresh_community_post_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.communities
    set post_count = (
      select count(*) from public.community_posts where community_id = new.community_id
    )
    where id = new.community_id;
    return new;
  end if;

  update public.communities
  set post_count = (
    select count(*) from public.community_posts where community_id = old.community_id
  )
  where id = old.community_id;
  return old;
end;
$$;

create or replace function public.refresh_community_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts
    set comment_count = (
      select count(*) from public.community_comments where post_id = new.post_id
    )
    where id = new.post_id;
    return new;
  end if;

  update public.community_posts
  set comment_count = (
    select count(*) from public.community_comments where post_id = old.post_id
  )
  where id = old.post_id;
  return old;
end;
$$;

create or replace function public.refresh_community_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts
    set like_count = (
      select count(*) from public.post_likes where post_id = new.post_id
    )
    where id = new.post_id;
    return new;
  end if;

  update public.community_posts
  set like_count = (
    select count(*) from public.post_likes where post_id = old.post_id
  )
  where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists refresh_community_member_count_trigger on public.community_members;
create trigger refresh_community_member_count_trigger
after insert or delete on public.community_members
for each row execute function public.refresh_community_member_count();

drop trigger if exists refresh_community_post_count_trigger on public.community_posts;
create trigger refresh_community_post_count_trigger
after insert or delete on public.community_posts
for each row execute function public.refresh_community_post_count();

drop trigger if exists refresh_community_comment_count_trigger on public.community_comments;
create trigger refresh_community_comment_count_trigger
after insert or delete on public.community_comments
for each row execute function public.refresh_community_comment_count();

drop trigger if exists refresh_community_like_count_trigger on public.post_likes;
create trigger refresh_community_like_count_trigger
after insert or delete on public.post_likes
for each row execute function public.refresh_community_like_count();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'communities'
  ) then
    alter publication supabase_realtime add table public.communities;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_posts'
  ) then
    alter publication supabase_realtime add table public.community_posts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_comments'
  ) then
    alter publication supabase_realtime add table public.community_comments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_members'
  ) then
    alter publication supabase_realtime add table public.community_members;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_likes'
  ) then
    alter publication supabase_realtime add table public.post_likes;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260813091000_add_guftagu_community_admin_rights.sql
-- -----------------------------------------------------------------------------

drop policy if exists "Creators can delete their communities" on public.communities;
create policy "Creators can delete their communities" on public.communities
for delete to authenticated
using (auth.uid() = created_by);

drop policy if exists "Users can leave communities" on public.community_members;
create policy "Users can leave communities" on public.community_members
for delete to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.communities c
    where c.id = community_members.community_id
      and c.created_by = auth.uid()
  )
);

drop policy if exists "Users can delete their community posts" on public.community_posts;
drop policy if exists "Users and community owners can delete community posts" on public.community_posts;
create policy "Users and community owners can delete community posts" on public.community_posts
for delete to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.communities c
    where c.id = community_posts.community_id
      and c.created_by = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260813092000_create_email_notification_scan_tables.sql
-- -----------------------------------------------------------------------------

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
