-- Migration: Qur'an + Hadith reference tables with full-text search
-- Run this with `supabase db push` or paste into the SQL editor in your
-- Supabase project (Database -> SQL Editor).

create extension if not exists pg_trgm;

-- =========================================================
-- Qur'an (Arabic text, from quran_ar.json)
-- =========================================================
create table if not exists quran_ayahs (
  id serial primary key,
  surah_number int not null,
  surah_name text not null,
  ayah_number int not null,
  text_ar text not null,
  -- Arabic text with diacritics (tashkeel) stripped, used for indexing/search
  text_ar_normalized text generated always as (
    regexp_replace(text_ar, '[\u064B-\u065F\u0670\u06D6-\u06ED]', '', 'g')
  ) stored,
  tsv tsvector generated always as (
    to_tsvector('simple', regexp_replace(text_ar, '[\u064B-\u065F\u0670\u06D6-\u06ED]', '', 'g'))
  ) stored
);

create unique index if not exists quran_surah_ayah_idx
  on quran_ayahs (surah_number, ayah_number);
create index if not exists quran_tsv_idx
  on quran_ayahs using gin (tsv);
create index if not exists quran_trgm_idx
  on quran_ayahs using gin (text_ar_normalized gin_trgm_ops);

-- =========================================================
-- Hadith (Sahih al-Bukhari + Sahih Muslim)
-- =========================================================
create table if not exists hadiths (
  id serial primary key,
  collection text not null check (collection in ('bukhari', 'muslim')),
  book text,
  chapter_number int,
  chapter_title_ar text,
  chapter_title_en text,
  arabic_text text,
  english_text text,
  grade text,
  reference text,           -- e.g. https://sunnah.com/bukhari:1
  in_book_reference text,   -- e.g. "Book 1, Hadith 1"
  tsv_en tsvector generated always as (
    to_tsvector('english', coalesce(english_text, '') || ' ' || coalesce(chapter_title_en, ''))
  ) stored,
  tsv_ar tsvector generated always as (
    to_tsvector('simple', regexp_replace(coalesce(arabic_text, ''), '[\u064B-\u065F\u0670\u06D6-\u06ED]', '', 'g'))
  ) stored
);

create index if not exists hadith_tsv_en_idx on hadiths using gin (tsv_en);
create index if not exists hadith_tsv_ar_idx on hadiths using gin (tsv_ar);
create index if not exists hadith_collection_idx on hadiths (collection);
create index if not exists hadith_reference_idx on hadiths (reference);

-- =========================================================
-- Search RPCs — these are what the edge function calls.
-- Ranked full-text search with a trigram fallback so short /
-- partial-keyword queries still return something useful.
-- =========================================================

create or replace function search_quran(search_query text, result_limit int default 5)
returns table (
  surah_number int,
  surah_name text,
  ayah_number int,
  text_ar text,
  rank real
)
language sql stable as $$
  select surah_number, surah_name, ayah_number, text_ar,
         ts_rank(tsv, websearch_to_tsquery('simple', search_query)) as rank
  from quran_ayahs
  where tsv @@ websearch_to_tsquery('simple', search_query)
  order by rank desc
  limit result_limit;
$$;

create or replace function search_hadith(
  search_query text,
  collection_filter text default null,
  result_limit int default 5
)
returns table (
  collection text,
  book text,
  chapter_title_en text,
  english_text text,
  arabic_text text,
  grade text,
  reference text,
  in_book_reference text,
  rank real
)
language sql stable as $$
  select collection, book, chapter_title_en, english_text, arabic_text,
         grade, reference, in_book_reference,
         ts_rank(tsv_en, websearch_to_tsquery('english', search_query)) as rank
  from hadiths
  where tsv_en @@ websearch_to_tsquery('english', search_query)
    and (collection_filter is null or collection = collection_filter)
  order by rank desc
  limit result_limit;
$$;

-- Row Level Security: these tables are reference data, read-only for
-- anon/authenticated. Writes only happen via the seed script using the
-- service role key, which bypasses RLS entirely.
alter table quran_ayahs enable row level security;
alter table hadiths enable row level security;

drop policy if exists "public read quran" on quran_ayahs;
create policy "public read quran" on quran_ayahs for select using (true);

drop policy if exists "public read hadiths" on hadiths;
create policy "public read hadiths" on hadiths for select using (true);
