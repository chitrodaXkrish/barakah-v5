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
