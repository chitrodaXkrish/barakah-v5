INSERT INTO public.news_sources (name, rss_url, category, is_active)
VALUES
  ('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', 'world', true),
  ('Middle East Eye', 'https://www.middleeasteye.net/rss', 'world', true),
  ('TRT World', 'https://www.trtworld.com/rss', 'world', true),
  ('BBC World', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'world', true),
  ('Islamic Relief Worldwide', 'https://islamic-relief.org/feed/', 'charity', true),
  ('Islamic Relief Press Releases', 'https://islamic-relief.org/news_category/press-releases/feed/', 'charity', true),
  ('Muslim Matters', 'https://muslimmatters.org/feed/', 'education', true),
  ('BBC Education', 'https://feeds.bbci.co.uk/news/education/rss.xml', 'education', true),
  ('About Islam', 'https://aboutislam.net/feed/', 'community', true),
  ('The Muslim Vibe', 'https://themuslimvibe.com/feed/', 'community', true),
  ('Islamic Finance Guru', 'https://www.islamicfinanceguru.com/feed/', 'business', true),
  ('BBC Business', 'https://feeds.bbci.co.uk/news/business/rss.xml', 'business', true),
  ('BBC Politics', 'https://feeds.bbci.co.uk/news/politics/rss.xml', 'politics', true),
  ('Middle East Eye Politics', 'https://www.middleeasteye.net/rss', 'politics', true)
ON CONFLICT (name) DO UPDATE
SET
  rss_url = EXCLUDED.rss_url,
  category = EXCLUDED.category,
  is_active = true,
  updated_at = now();

UPDATE public.news_sources
SET is_active = false, updated_at = now()
WHERE rss_url ILIKE 'https://news.google.com/rss/search%';
