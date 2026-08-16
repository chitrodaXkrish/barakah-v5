import { Layout } from '@/components/Layout';
import { ArrowLeft, Loader2, ExternalLink, Clock, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isIOSNative, openExternalUrl } from '@/lib/externalUrl';

interface Article {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  article_url: string;
  source_name: string;
  published_at: string | null;
  author: string | null;
  category: string | null;
}

interface CachedNewsArticle {
  guid?: string;
  id?: string;
  title: string;
  description: string | null;
  content?: string | null;
  image_url: string | null;
  article_url: string;
  source_name: string;
  published_at: string | null;
  author?: string | null;
  category: string | null;
}

const NEWS_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-news`;
const NEWS_FUNCTION_HEADERS = {
  'Content-Type': 'application/json',
  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
};
const FETCHED_ARTICLE_CACHE_KEY = 'barakah:fetched-news-articles:v1';

function readCachedArticle(id: string): Article | null {
  try {
    const cached = JSON.parse(sessionStorage.getItem(FETCHED_ARTICLE_CACHE_KEY) || '{}') as Record<string, CachedNewsArticle>;
    const article = cached[id];
    if (!article) return null;
    return {
      id,
      title: article.title,
      description: article.description,
      content: article.content ?? article.description,
      image_url: article.image_url,
      article_url: article.article_url,
      source_name: article.source_name,
      published_at: article.published_at,
      author: article.author ?? null,
      category: article.category,
    };
  } catch {
    return null;
  }
}

async function fetchNewsFromEdge(): Promise<void> {
  const response = await fetch(NEWS_FUNCTION_URL, {
    method: 'POST',
    headers: NEWS_FUNCTION_HEADERS,
    body: '{}',
  });
  if (!response.ok) {
    throw new Error(`Could not fetch news (${response.status})`);
  }
}

/** Convert plain text to HTML paragraphs by splitting on sentence boundaries */
function textToParagraphs(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const sentences = clean
    .split(/(?<=[.!?])\s+(?=[A-Z"])/)
    .reduce<string[]>((acc, sentence) => {
      const last = acc[acc.length - 1] ?? '';
      if (!last || last.length > 420) acc.push(sentence);
      else acc[acc.length - 1] = `${last} ${sentence}`;
      return acc;
    }, []);
  return sentences.map((chunk) => `<p>${escapeHtml(chunk)}</p>`).join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isHtmlContent(value: string | null): boolean {
  if (!value) return false;
  return /<[a-z][\s\S]*>/i.test(value);
}

export const NewsDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingArticle, setRefreshingArticle] = useState(false);
  const refreshedArticleRef = useRef(false);

  const loadArticle = useCallback(async () => {
    if (!id) return null;
    const cachedArticle = readCachedArticle(id);
    if (cachedArticle) return cachedArticle;
    const { data } = await supabase
      .from('news_articles')
      .select('id, title, description, content, image_url, article_url, source_name, published_at, author, category')
      .eq('id', id)
      .maybeSingle();
    return data as Article | null;
  }, [id]);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await loadArticle();
      if (active) {
        setArticle(data);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loadArticle]);

  const BROWN = '#A35233';
  const BROWN_DARK = '#7a3a22';
  const CREAM = '#FFF5E5';
  const REMOVED_QUOTE =
    'The beauty of our heritage is not that it happened, but that it lives on in the way we choose to perceive the world today.';

  const cleanContent = (value: string | null): string =>
    (value ?? '')
      .replace(new RegExp(`[\\u201C\\u201D"]${REMOVED_QUOTE}[\\u201C\\u201D"]`, 'g'), '')
      .replace(new RegExp(`"${REMOVED_QUOTE}"`, 'g'), '')
      .replace(new RegExp(REMOVED_QUOTE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
      .replace(/\s*<p>\s*<\/p>\s*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const plainText = (value: string | null): string =>
    cleanContent(value)
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const rawDescription = cleanContent(article?.description ?? null);
  const rawContent = cleanContent(article?.content ?? null);

  const cleanTruncation = (text: string) => {
    return text.replace(/\s*(?:\.\.\.|…)?\s*\[\+\d+\s+(?:chars|words)\]\s*$/i, '').trim();
  };

  const displayDesc = cleanTruncation(rawDescription);
  const displayCont = cleanTruncation(rawContent);

  let displayHtml = '';
  const descIsHtml = isHtmlContent(displayDesc);
  const contIsHtml = isHtmlContent(displayCont);

  const descText = descIsHtml ? displayDesc.replace(/<[^>]+>/g, '') : displayDesc;
  const contText = contIsHtml ? displayCont.replace(/<[^>]+>/g, '') : displayCont;

  if (descText.length > 0 && contText.length > 0) {
    if (contText.toLowerCase().includes(descText.toLowerCase())) {
      displayHtml = contIsHtml ? displayCont : textToParagraphs(displayCont);
    } else if (descText.toLowerCase().includes(contText.toLowerCase())) {
      displayHtml = descIsHtml ? displayDesc : textToParagraphs(displayDesc);
    } else {
      const formattedDesc = descIsHtml ? displayDesc : `<p><strong>${escapeHtml(displayDesc)}</strong></p>`;
      const formattedCont = contIsHtml ? displayCont : textToParagraphs(displayCont);
      displayHtml = `${formattedDesc}${formattedCont}`;
    }
  } else if (contText.length > 0) {
    displayHtml = contIsHtml ? displayCont : textToParagraphs(displayCont);
  } else if (descText.length > 0) {
    displayHtml = descIsHtml ? displayDesc : textToParagraphs(displayDesc);
  }

  const descriptionText = plainText(displayDesc);
  const contentText = plainText(displayCont);
  const bodyLength = Math.max(descriptionText.length, contentText.length);

  useEffect(() => {
    if (!article || refreshedArticleRef.current || bodyLength >= 700) return;
    refreshedArticleRef.current = true;
    setRefreshingArticle(true);
    fetchNewsFromEdge()
      .then(() => loadArticle())
      .then((freshArticle) => {
        if (freshArticle) setArticle(freshArticle);
      })
      .catch(() => {})
      .finally(() => setRefreshingArticle(false));
  }, [article, bodyLength, loadArticle]);

  const timeAgo = (iso: string | null): string => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} days ago`;
    return new Date(iso).toLocaleDateString();
  };

  const handleShare = async () => {
    if (!article) return;
    if (navigator.share) {
      try { await navigator.share({ title: article.title, url: article.article_url }); }
      catch { /* ignore */ }
    } else {
      navigator.clipboard?.writeText(article.article_url);
    }
  };

  const shortTitle = article?.title
    ? article.title.length > 22
      ? article.title.slice(0, 22).trim() + '\u2026'
      : article.title
    : '';

  return (
    <Layout showHeader={false} showNavigation={false}>
      <div className="min-h-screen" style={{ backgroundColor: CREAM }}>
        {/* Top bar */}
        <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full border flex items-center justify-center"
            style={{ borderColor: BROWN, color: BROWN }}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-semibold truncate px-3" style={{ color: BROWN }}>
            {shortTitle}
          </h1>
          <button
            type="button"
            onClick={handleShare}
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ color: BROWN }}
            aria-label="Share"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: BROWN }} />
          </div>
        ) : !article ? (
          <p className="text-center py-20 text-sm" style={{ color: BROWN }}>{t('news.article_not_found')}</p>
        ) : (
          <article className="pb-16">
            {/* Hero image */}
            {article.image_url && (
              <div className="relative w-full bg-neutral-200">
                <img
                  src={article.image_url}
                  alt={article.title}
                  className="w-full h-64 object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
                {article.category && (
                  <span
                    className="absolute left-4 bottom-3 text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-md text-white"
                    style={{ backgroundColor: BROWN }}
                  >
                    {article.category}
                  </span>
                )}
              </div>
            )}

            <div className="px-5 pt-6 space-y-5">
              {/* Title */}
              <h2 className="text-[26px] leading-[1.2] font-bold text-neutral-900">
                {article.title}
              </h2>

              {/* Source row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: BROWN }}
                  >
                    {article.source_name?.[0] ?? 'N'}
                  </div>
                  <div className="leading-tight">
                    <p className="text-[14px] font-bold text-neutral-900">{article.source_name}</p>
                    {article.author && (
                      <p className="text-xs text-neutral-500">{article.author}</p>
                    )}
                  </div>
                </div>
                {article.published_at && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: '#F5D9C4', color: BROWN_DARK }}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {timeAgo(article.published_at)}
                  </span>
                )}
              </div>

              <div className="h-px" style={{ backgroundColor: '#E8D2B8' }} />

              {/* Body content — renders best available content as formatted HTML */}
              {displayHtml ? (
                <div
                  className="text-[15px] leading-relaxed text-neutral-700 space-y-4 [&_img]:rounded-lg [&_img]:my-3 [&_a]:underline [&_p]:my-2"
                  style={{ color: '#3a2a20' }}
                  dangerouslySetInnerHTML={{ __html: displayHtml }}
                />
              ) : (
                <p className="text-[15px] leading-relaxed text-neutral-500 italic">
                  {t('news.no_content')}
                </p>
              )}

              {refreshingArticle && (
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: '#F5D9C4', color: BROWN_DARK }}>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('news.fetching_content')}
                </div>
              )}

              <a
                href={article.article_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  if (isIOSNative()) {
                    event.preventDefault();
                    void openExternalUrl(article.article_url);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold pt-2"
                style={{ color: BROWN }}
              >
                {t('news.view_source')} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>
        )}
      </div>
    </Layout>
  );
};
