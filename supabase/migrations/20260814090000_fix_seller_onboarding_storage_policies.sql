-- Allow signed-in users to upload and manage their own seller onboarding
-- banner/logo assets before the seller role/profile has been fully created.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
set public = true;

drop policy if exists "Users can upload own seller onboarding images" on storage.objects;
create policy "Users can upload own seller onboarding images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] in ('seller-banner', 'seller-logo')
);

drop policy if exists "Users can update own seller onboarding images" on storage.objects;
create policy "Users can update own seller onboarding images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] in ('seller-banner', 'seller-logo')
)
with check (
  bucket_id = 'product-images'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] in ('seller-banner', 'seller-logo')
);

drop policy if exists "Users can delete own seller onboarding images" on storage.objects;
create policy "Users can delete own seller onboarding images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] in ('seller-banner', 'seller-logo')
);
