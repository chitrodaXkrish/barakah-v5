import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, X, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BottomNavigation } from '@/components/BottomNavigation';

type NewsCategory = 'all' | 'world' | 'education' | 'community' | 'charity' | 'business' | 'politics';

interface NewsItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  article_url: string;
  source: string;
  category: NewsCategory;
  time: string;
}

const categories: { key: NewsCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'world', label: 'Ummah' },
  { key: 'community', label: 'Lifestyle' },
  { key: 'education', label: 'Heritage' },
  { key: 'charity', label: 'Charity' },
  { key: 'business', label: 'Business' },
  { key: 'politics', label: 'Politics' },
];

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const News = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory>('all');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('news_articles')
      .select('id, title, description, image_url, article_url, source_name, published_at, category')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(50);
    if (selectedCategory !== 'all') q = q.eq('category', selectedCategory);
    const { data, error } = await q;
    if (!error && data) {
      setItems(
        data.map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          image_url: d.image_url,
          article_url: d.article_url,
          source: d.source_name,
          category: (d.category as NewsCategory) ?? 'world',
          time: timeAgo(d.published_at),
        })),
      );
    }
    setLoading(false);
  }, [selectedCategory]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-news');
      if (error) throw error;
      toast({ title: 'Feed refreshed', description: `Fetched ${data?.totalProcessed ?? 0} items` });
      await load();
    } catch (e) {
      toast({ title: 'Refresh failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) => i.title.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q),
    );
  }, [items, search]);

  const latest = filtered.slice(0, 5);
  const topStories = filtered.slice(5);

  const BROWN = '#A35233';
  const BROWN_SOFT = '#F5D9C4';
  const CREAM = '#FFF5E5';

  return (
    <Layout showHeader={false} showNavigation={false}>
      <div className="relative min-h-screen" style={{ backgroundColor: CREAM }}>
        {/* Top header bar — white */}
        <div className="bg-white px-4 pt-4 pb-4">
          {searchOpen ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearch('');
                }}
                className="h-10 w-10 shrink-0 rounded-full border flex items-center justify-center"
                style={{ borderColor: BROWN, color: BROWN }}
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex-1 relative">
                <Input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search news"
                  className="h-10 rounded-full bg-neutral-100 border-0 pl-4 pr-10 text-sm"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center"
                    style={{ color: BROWN }}
                    aria-label="Clear"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="h-10 w-10 rounded-full border flex items-center justify-center"
                style={{ borderColor: BROWN, color: BROWN }}
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-xl font-bold" style={{ color: BROWN }}>News</h1>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ color: BROWN }}
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className="px-4 pt-5 pb-8 space-y-6">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {categories.map(({ key, label }) => {
              const active = selectedCategory === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedCategory(key)}
                  className="rounded-full px-5 py-2 text-sm font-semibold shrink-0 transition-colors"
                  style={{
                    backgroundColor: active ? BROWN : BROWN_SOFT,
                    color: active ? '#fff' : BROWN,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: BROWN }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Sparkles className="h-8 w-8 mx-auto" style={{ color: BROWN }} />
              <p className="text-sm" style={{ color: BROWN }}>
                No articles yet. Tap refresh to load the latest news.
              </p>
              <Button
                onClick={refresh}
                disabled={refreshing}
                className="rounded-full"
                style={{ backgroundColor: BROWN, color: '#fff' }}
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Fetch news
              </Button>
            </div>
          ) : (
            <>
              {/* Latest News */}
              {latest.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold" style={{ color: BROWN }}>Latest News</h2>
                    <button
                      type="button"
                      onClick={refresh}
                      className="text-sm font-medium opacity-70"
                      style={{ color: BROWN }}
                    >
                      {refreshing ? 'Refreshing…' : 'See all'}
                    </button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2 snap-x snap-mandatory">
                    {latest.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(`/news/${item.id}`)}
                        className="snap-start shrink-0 w-[78%] text-left rounded-3xl overflow-hidden bg-white shadow-sm"
                        style={{ border: `1px solid ${BROWN_SOFT}` }}
                      >
                        <div className="h-44 w-full bg-neutral-100 overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              loading="lazy"
                              className="h-full w-full object-cover"
                              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center" style={{ color: BROWN }}>
                              <Sparkles className="h-6 w-6 opacity-50" />
                            </div>
                          )}
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md text-white"
                              style={{ backgroundColor: BROWN }}
                            >
                              {item.category}
                            </span>
                            <span className="text-xs text-neutral-500">{item.time}</span>
                          </div>
                          <h3 className="text-[15px] font-bold leading-snug text-neutral-900 line-clamp-2">
                            {item.title}
                          </h3>
                          <p className="text-sm font-semibold" style={{ color: BROWN }}>
                            {item.source}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Top Stories */}
              {topStories.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold" style={{ color: BROWN }}>Top Stories</h2>
                    <button type="button" className="text-sm font-medium opacity-70" style={{ color: BROWN }}>
                      See all
                    </button>
                  </div>
                  <div className="space-y-3">
                    {topStories.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(`/news/${item.id}`)}
                        className={cn(
                          'w-full text-left rounded-2xl bg-white p-3 flex items-center gap-3 shadow-sm',
                        )}
                        style={{ border: `1px solid ${BROWN_SOFT}` }}
                      >
                        <div
                          className="h-16 w-16 shrink-0 rounded-full overflow-hidden bg-neutral-100"
                          style={{ border: `1px solid ${BROWN_SOFT}` }}
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              loading="lazy"
                              className="h-full w-full object-cover"
                              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center" style={{ color: BROWN }}>
                              <Sparkles className="h-5 w-5 opacity-50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[10px] font-bold uppercase tracking-wide"
                            style={{ color: BROWN }}
                          >
                            {item.category}
                          </p>
                          <h3 className="text-[14px] font-bold leading-snug text-neutral-900 line-clamp-2 mt-0.5">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold" style={{ color: BROWN }}>
                              {item.source}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-neutral-300" />
                            <span className="text-xs text-neutral-500">{item.time}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
      <BottomNavigation />
    </Layout>
  );
};
