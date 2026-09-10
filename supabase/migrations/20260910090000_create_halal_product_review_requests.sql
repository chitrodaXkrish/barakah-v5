create table if not exists public.halal_product_review_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null default 'review_request'
    check (request_type in ('contribution', 'review_request')),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'in_review', 'approved', 'rejected', 'duplicate')),
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null,
  user_name text not null,
  barcode text,
  scanned_product_name text,
  contributed_product_name text,
  brand text,
  category text,
  region text,
  ingredients_text text,
  notes text,
  scanned_status text not null default 'unknown'
    check (scanned_status in ('halal', 'haram', 'mushbooh', 'unknown')),
  scanned_confidence integer check (scanned_confidence between 0 and 100),
  scanned_verdict text,
  scanned_ingredients jsonb not null default '[]'::jsonb,
  scanner_source text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamp with time zone,
  admin_notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists halal_product_review_requests_status_idx
  on public.halal_product_review_requests(review_status, created_at desc);

create index if not exists halal_product_review_requests_user_idx
  on public.halal_product_review_requests(user_id, created_at desc);

create index if not exists halal_product_review_requests_barcode_idx
  on public.halal_product_review_requests(barcode)
  where barcode is not null;

alter table public.halal_product_review_requests enable row level security;

drop policy if exists "Users create own halal product review requests"
  on public.halal_product_review_requests;
create policy "Users create own halal product review requests"
  on public.halal_product_review_requests
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users read own halal product review requests"
  on public.halal_product_review_requests;
create policy "Users read own halal product review requests"
  on public.halal_product_review_requests
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Service role manages halal product review requests"
  on public.halal_product_review_requests;
create policy "Service role manages halal product review requests"
  on public.halal_product_review_requests
  for all to service_role
  using (true)
  with check (true);
