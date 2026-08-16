alter table public.guftagu_likes
add column if not exists reaction_type text not null default 'like';

alter table public.guftagu_likes
drop constraint if exists guftagu_likes_reaction_type_check;

alter table public.guftagu_likes
add constraint guftagu_likes_reaction_type_check
check (reaction_type in ('like', 'ameen', 'love', 'insightful', 'joy'));

update public.guftagu_likes
set reaction_type = 'like'
where reaction_type is null;

drop policy if exists "Users can update their own guftagu reactions" on public.guftagu_likes;
create policy "Users can update their own guftagu reactions"
on public.guftagu_likes
for update to authenticated
using (auth.uid()::text = user_id::text)
with check (auth.uid()::text = user_id::text);
