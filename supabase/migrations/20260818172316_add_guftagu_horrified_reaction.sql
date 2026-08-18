alter table public.guftagu_likes
drop constraint if exists guftagu_likes_reaction_type_check;

update public.guftagu_likes
set reaction_type = 'laugh'
where reaction_type = 'joy';

alter table public.guftagu_likes
add constraint guftagu_likes_reaction_type_check
check (reaction_type in ('like', 'ameen', 'love', 'insightful', 'laugh', 'horrified'));
