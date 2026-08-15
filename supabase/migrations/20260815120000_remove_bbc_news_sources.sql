UPDATE public.news_sources
SET is_active = false, updated_at = now()
WHERE name ILIKE 'BBC%' OR rss_url ILIKE '%feeds.bbci.co.uk%';

DELETE FROM public.news_articles
WHERE source_name ILIKE 'BBC%';
