import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Search, Loader2, ExternalLink } from 'lucide-react';
import { HADITH_BOOKS } from './Hadith';
import { supabase } from '@/integrations/supabase/client';

const CREAM = '#FFF5E5';
const BROWN = '#2C1309';
const BROWN_ACCENT = '#B0431E';
const HERO_GRAD = 'linear-gradient(177deg, #78351A 2.14%, #CE5728 97.86%)';

type Hadith = {
  hadithnumber: number | string;
  arabicnumber?: number | string;
  text: string;
  reference?: { book?: number; hadith?: number };
};

type Edition = {
  metadata: { name: string; section?: Record<string, string> };
  hadiths: Hadith[];
};

const PAGE_SIZE = 25;

export const HadithBook = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const book = useMemo(() => {
    for (const g of HADITH_BOOKS) {
      const b = g.books.find((x) => x.slug === slug);
      if (b) return b;
    }
    return null;
  }, [slug]);

  const [data, setData] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [filled, setFilled] = useState<Record<string, { text: string; arabic?: string }>>({});
  const [filling, setFilling] = useState(false);

  useEffect(() => {
    if (!book?.edition && !book?.altUrl) return;
    let cancel = false;
    setLoading(true);
    setError(null);
    const url = book.edition
      ? `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${book.edition}.min.json`
      : (book.altUrl as string);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        return r.json();
      })
      .then((j: any) => {
        if (cancel) return;
        if (book.altUrl && !book.edition) {
          // A7med3bdulBaset/hadith-json shape: { hadiths: [{ idInBook, arabic, english: { text } }] }
          const hadiths: Hadith[] = (j.hadiths || []).map((h: any) => ({
            hadithnumber: h.idInBook ?? h.id,
            text:
              typeof h?.english === 'string'
                ? h.english
                : [h?.english?.narrator, h?.english?.text].filter(Boolean).join(' — '),
          }));
          setData({
            metadata: { name: j?.metadata?.english?.title || book.name },
            hadiths,
          });
        } else {
          setData({ ...j, hadiths: j.hadiths || [] });
        }
      })
      .catch((e) => {
        if (cancel) return;
        setError(e?.message || 'Could not load this book.');
      })
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [book?.edition, book?.altUrl]);

  const filtered = useMemo(() => {
    if (!data) return [] as Hadith[];
    if (!query.trim()) return data.hadiths;
    const q = query.trim().toLowerCase();
    return data.hadiths.filter(
      (h) => String(h.hadithnumber).includes(q) || (h.text || '').toLowerCase().includes(q),
    );
  }, [data, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query]);

  // Backfill blank entries on the current page from hadithapi.com via edge function.
  useEffect(() => {
    if (!slug || !data || slice.length === 0) return;
    const missing = slice
      .filter((h) => !(typeof h.text === 'string' && h.text.trim().length > 0))
      .map((h) => Number(h.hadithnumber))
      .filter((n) => Number.isFinite(n) && !filled[String(n)]);
    if (missing.length === 0) return;
    let cancel = false;
    setFilling(true);
    supabase.functions
      .invoke('fill-hadith', { body: { slug, numbers: missing } })
      .then(({ data: res, error: err }) => {
        if (cancel || err || !res?.results) return;
        setFilled((prev) => ({ ...prev, ...res.results }));
      })
      .finally(() => !cancel && setFilling(false));
    return () => {
      cancel = true;
    };
  }, [slug, data, safePage, query]);

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CREAM, color: BROWN }}>
        <div className="text-center">
          <p className="mb-3">Book not found.</p>
          <button onClick={() => navigate('/hadith')} className="underline">Back to Hadith</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: CREAM }}>
      <div className="px-5 pt-12 pb-8" style={{ background: HERO_GRAD, color: '#FFF5E5' }}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/hadith')}
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,245,229,0.18)' }}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[17px] text-center px-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            {book.name}
          </h1>
          <div className="w-10" />
        </div>
        {data && (
          <p className="mt-2 text-[12px] opacity-90 text-center">
            {data.hadiths.length.toLocaleString()} hadith
          </p>
        )}
        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: 'rgba(255,245,229,0.18)' }}>
          <Search className="h-4 w-4 opacity-80" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by number or text"
            className="bg-transparent flex-1 outline-none placeholder:opacity-70 text-[13px]"
            style={{ color: '#FFF5E5' }}
          />
        </div>
      </div>

      <div
        className="relative px-5 pt-5"
        style={{ background: CREAM, borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -20 }}
      >
        {loading && (
          <div className="flex items-center justify-center py-16" style={{ color: BROWN }}>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Loading book…</span>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border p-4 text-[13px]" style={{ borderColor: 'rgba(232,213,196,0.86)', color: BROWN }}>
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="space-y-3">
              {slice.map((h) => {
                const filledEntry = filled[String(h.hadithnumber)];
                const displayText =
                  typeof h.text === 'string' && h.text.trim().length > 0
                    ? h.text
                    : filledEntry?.text || '';
                const hasText = displayText.trim().length > 0;
                const sunnahUrl = `https://sunnah.com/${slug}:${h.hadithnumber}`;
                return (
                  <div
                    key={String(h.hadithnumber)}
                    className="rounded-2xl border p-4"
                    style={{ background: '#FFF5E5', borderColor: 'rgba(232,213,196,0.86)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(120,53,26,0.08)', color: BROWN_ACCENT, fontWeight: 700 }}
                      >
                        #{h.hadithnumber}
                      </span>
                    </div>
                    {hasText ? (
                      <p className="text-[14px] leading-[1.65]" style={{ color: BROWN, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {displayText}
                      </p>
                    ) : (
                      <div className="text-[13px] leading-[1.6]" style={{ color: BROWN, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        <p className="opacity-80 mb-3">
                          {filling
                            ? 'Loading translation…'
                            : "Translation unavailable. You can read the full text on Sunnah.com."}
                        </p>
                        <a
                          href={sunnahUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px]"
                          style={{ background: HERO_GRAD, color: '#FFF5E5', fontWeight: 600 }}
                        >
                          Read on Sunnah.com
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
              {slice.length === 0 && (
                <div className="text-center py-10 text-[13px]" style={{ color: BROWN }}>
                  No hadith match your search.
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 rounded-full border text-[13px] disabled:opacity-40"
                  style={{ borderColor: 'rgba(232,213,196,0.86)', color: BROWN, fontWeight: 600 }}
                >
                  Previous
                </button>
                <span className="text-[12px]" style={{ color: BROWN }}>
                  Page {safePage} of {totalPages}
                </span>
                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-4 py-2 rounded-full text-[13px] disabled:opacity-40"
                  style={{ background: HERO_GRAD, color: '#FFF5E5', fontWeight: 600 }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HadithBook;