import { Layout } from '@/components/Layout';
import { ArrowLeft, Loader2, ExternalLink, Clock, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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

export const NewsDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) return;
      const { data } = await supabase
        .from('news_articles')
        .select('id, title, description, content, image_url, article_url, source_name, published_at, author, category')
        .eq('id', id)
        .maybeSingle();
      if (active) {
        setArticle(data as Article | null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const BROWN = '#A35233';
  const BROWN_DARK = '#7a3a22';
  const CREAM = '#FFF5E5';
  const QUOTE_BG = '#FBEFA8';
  const QUOTE_BORDER = '#8a7a1f';

  const timeAgo = (iso: string | null) => {
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
      try {
        await navigator.share({ title: article.title, url: article.article_url });
      } catch {/* ignore */}
    } else {
      navigator.clipboard?.writeText(article.article_url);
    }
  };

  const shortTitle = article?.title
    ? article.title.length > 22
      ? article.title.slice(0, 22).trim() + '…'
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
          <p className="text-center py-20 text-sm" style={{ color: BROWN }}>Article not found.</p>
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

              {/* Body */}
              {article.description && (
                <p className="text-[15px] leading-relaxed text-neutral-700">
                  {article.description}
                </p>
              )}

              {article.content && (
                <div
                  className="text-[15px] leading-relaxed text-neutral-700 space-y-4 [&_img]:rounded-lg [&_img]:my-3 [&_a]:underline [&_p]:my-2"
                  style={{ color: '#3a2a20' }}
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              )}

              {/* Pull quote */}
              <blockquote
                className="rounded-2xl px-5 py-5 mt-2"
                style={{
                  backgroundColor: QUOTE_BG,
                  borderLeft: `4px solid ${QUOTE_BORDER}`,
                }}
              >
                <p
                  className="text-[17px] leading-relaxed italic text-neutral-800"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  "The beauty of our heritage is not that it happened, but that it lives on in the way we choose to perceive the world today."
                </p>
              </blockquote>

              <a
                href={article.article_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold pt-2"
                style={{ color: BROWN }}
              >
                View source <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>
        )}
      </div>
    </Layout>
  );
};
