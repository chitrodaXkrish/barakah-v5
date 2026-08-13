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
