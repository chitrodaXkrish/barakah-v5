
CREATE TABLE public.news_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  rss_url text NOT NULL,
  category text DEFAULT 'world',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guid text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  content text,
  image_url text,
  article_url text NOT NULL,
  source_name text NOT NULL,
  published_at timestamptz,
  author text,
  category text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_articles_published_at ON public.news_articles (published_at DESC);
CREATE INDEX idx_news_articles_category ON public.news_articles (category);
CREATE INDEX idx_news_articles_source ON public.news_articles (source_name);

ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active news sources"
  ON public.news_sources FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage news sources"
  ON public.news_sources FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view news articles"
  ON public.news_articles FOR SELECT USING (true);

CREATE POLICY "Admins can manage news articles"
  ON public.news_articles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_news_sources_updated_at
  BEFORE UPDATE ON public.news_sources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.news_sources (name, rss_url, category) VALUES
  ('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', 'world'),
  ('Middle East Eye', 'https://www.middleeasteye.net/rss', 'world'),
  ('Islamic Relief Worldwide', 'https://islamic-relief.org/feed/', 'charity'),
  ('TRT World', 'https://www.trtworld.com/rss', 'world');
