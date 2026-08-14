create table if not exists public.guftagu_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.guftagu_posts(id) on delete cascade,
  reporter_id text not null,
  reporter_name text,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamp with time zone not null default now(),
  unique (post_id, reporter_id)
);

alter table public.guftagu_post_reports enable row level security;

create index if not exists guftagu_post_reports_post_id_idx
  on public.guftagu_post_reports(post_id);

create index if not exists guftagu_post_reports_reporter_id_idx
  on public.guftagu_post_reports(reporter_id);

create index if not exists guftagu_post_reports_status_created_idx
  on public.guftagu_post_reports(status, created_at desc);

drop policy if exists "Users can create own guftagu post reports" on public.guftagu_post_reports;
create policy "Users can create own guftagu post reports"
on public.guftagu_post_reports
for insert to authenticated
with check (reporter_id = auth.uid()::text);

drop policy if exists "Users can read own guftagu post reports" on public.guftagu_post_reports;
create policy "Users can read own guftagu post reports"
on public.guftagu_post_reports
for select to authenticated
using (reporter_id = auth.uid()::text);

drop policy if exists "Admins can manage guftagu post reports" on public.guftagu_post_reports;
create policy "Admins can manage guftagu post reports"
on public.guftagu_post_reports
for all to authenticated
using (public.has_role(auth.uid()::text, 'admin'::public.app_role))
with check (public.has_role(auth.uid()::text, 'admin'::public.app_role));

grant select, insert on public.guftagu_post_reports to authenticated;
grant all on public.guftagu_post_reports to service_role;
