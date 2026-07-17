import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, BookOpen, Play, Pause, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/* ---------------- Theme ---------------- */
const CREAM_BG = '#FFF5E5';
const CREAM_CARD = '#FFF7E5';
const OLIVE = '#7A8B2A';
const OLIVE_DARK = '#6E7E26';
const BROWN = '#2C1309';
const BROWN_ACCENT = '#B0431E';
const BROWN_RING = '#B5662C';
const MUTED = '#8B6F5C';
const BORDER = '#E8D3AE';
const SERIF = "'Plus Jakarta Sans', sans-serif";
const ARABIC_FONT = "'Plus Jakarta Sans', sans-serif";

/* ---------------- Types ---------------- */
interface Surah {
  surahName: string;
  surahNameArabic: string;
  surahNameArabicLong: string;
  surahNameTranslation: string;
  revelationPlace: string;
  totalAyah: number;
}
interface SurahDetail extends Surah {
  surahNo: number;
  arabic1: string[];
  english: string[];
  audio: Record<string, { reciter: string; url: string; originalUrl: string }>;
}

const RECITERS: Record<string, string> = {
  '1': 'Mishary Rashid Al Afasy',
  '2': 'Abu Bakr Al Shatri',
  '3': 'Nasser Al Qatami',
  '4': 'Yasser Al Dosari',
  '5': 'Hani Ar Rifai',
};

const RECITER_FOLDER: Record<string, string> = {
  '1': 'Alafasy_128kbps',
  '2': 'Abu_Bakr_Ash-Shaatree_128kbps',
  '3': 'Nasser_Alqatami_128kbps',
  '4': 'Yasser_Ad-Dussary_128kbps',
  '5': 'Hani_Rifai_192kbps',
};

const verseAudio = (surahNo: number, verseNo: number, reciterId: string) =>
  `https://everyayah.com/data/${RECITER_FOLDER[reciterId]}/${String(surahNo).padStart(3, '0')}${String(
    verseNo,
  ).padStart(3, '0')}.mp3`;

/* ---------------- Reusable bits ---------------- */

const StarBadge = ({ n }: { n: number }) => (
  <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
    <svg viewBox="0 0 40 40" className="absolute inset-0" fill="none" stroke={BROWN_RING} strokeWidth="1.5">
      <path d="M20 2 L25 7 L32 5 L33 12 L38 15 L35 21 L38 27 L32 30 L31 37 L24 35 L20 40 L16 35 L9 37 L8 30 L2 27 L5 21 L2 15 L7 12 L8 5 L15 7 Z" />
    </svg>
    <span className="relative text-[13px] font-semibold" style={{ color: BROWN_ACCENT }}>
      {n}
    </span>
  </div>
);

const TopBar = ({ onBack }: { onBack: () => void }) => (
  <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ backgroundColor: CREAM_BG }}>
    <div className="flex items-center gap-3">
      <button onClick={onBack} aria-label="Back" className="-ml-1">
        <ArrowLeft className="h-5 w-5" style={{ color: BROWN_ACCENT }} strokeWidth={2} />
      </button>
      <h1 className="text-[22px] font-bold" style={{ color: BROWN_ACCENT, fontFamily: SERIF }}>
        Quran
      </h1>
    </div>
    <button aria-label="Search">
      <Search className="h-5 w-5" style={{ color: BROWN_ACCENT }} strokeWidth={2} />
    </button>
  </div>
);

/* ---------------- Page ---------------- */

export const Quran = () => {
  const navigate = useNavigate();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurah, setSelectedSurah] = useState<SurahDetail | null>(null);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [tab, setTab] = useState<'surah' | 'para'>('surah');
  const [detailTab, setDetailTab] = useState<'translation' | 'arabic'>('translation');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('selectedReciter') || '1' : '1',
  );
  const [playingVerse, setPlayingVerse] = useState<number | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Fetch surah list
  useEffect(() => {
    fetch('https://quranapi.pages.dev/api/surah.json')
      .then((r) => r.json())
      .then((d) => setSurahs(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchSurahDetails = async (surahNo: number) => {
    setLoadingSurah(true);
    setDetailTab('translation');
    try {
      const r = await fetch(`https://quranapi.pages.dev/api/${surahNo}.json`);
      const data = await r.json();
      setSelectedSurah({ ...data, surahNo });
    } finally {
      setLoadingSurah(false);
    }
  };

  const handleReciterChange = (id: string) => {
    setSelectedReciter(id);
    localStorage.setItem('selectedReciter', id);
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setPlayingVerse(null);
    }
  };

  const playVerse = (verseNo: number) => {
    if (!selectedSurah) return;
    if (currentAudio) {
      currentAudio.pause();
      if (playingVerse === verseNo) {
        setPlayingVerse(null);
        setCurrentAudio(null);
        return;
      }
    }
    const audio = new Audio(verseAudio(selectedSurah.surahNo, verseNo, selectedReciter));
    audio.play().catch(() => {});
    audio.onended = () => {
      setPlayingVerse(null);
      setCurrentAudio(null);
    };
    setCurrentAudio(audio);
    setPlayingVerse(verseNo);
  };

  const filtered = useMemo(
    () =>
      surahs.filter(
        (s) =>
          s.surahName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.surahNameTranslation.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.surahNameArabic.includes(searchQuery),
      ),
    [surahs, searchQuery],
  );

  /* ---------------- Detail view ---------------- */
  if (selectedSurah) {
    return (
      <div className="min-h-screen max-w-md mx-auto pb-28 font-arabic" style={{ backgroundColor: CREAM_BG }}>
        <TopBar onBack={() => setSelectedSurah(null)} />

        {/* Olive hero card */}
        <div className="px-5 mt-2">
          <div
            className="rounded-[28px] px-6 pt-7 pb-10 text-center text-white shadow-sm overflow-hidden"
            style={{ backgroundColor: OLIVE }}
          >
            <h2 className="text-[32px] font-bold leading-tight" style={{ fontFamily: SERIF }}>
              {selectedSurah.surahName}
            </h2>
            <p className="text-[16px] mt-1 opacity-95">{selectedSurah.surahNameTranslation}</p>
            <div className="my-3 h-px mx-auto w-2/3" style={{ backgroundColor: 'rgba(255,255,255,0.35)' }} />
            <p className="text-[11px] tracking-[0.22em] font-medium opacity-95">
              {selectedSurah.revelationPlace?.toUpperCase()} • {selectedSurah.totalAyah} VERSES
            </p>
            <p
              className="mt-4 text-[28px] leading-none"
              dir="rtl"
              style={{ fontFamily: ARABIC_FONT }}
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 mt-6">
          <div className="grid grid-cols-2 text-center">
            {(['translation', 'arabic'] as const).map((t) => {
              const active = detailTab === t;
              return (
                <button
                  key={t}
                  onClick={() => setDetailTab(t)}
                  className="pb-2 text-[15px] font-semibold relative"
                  style={{ color: active ? BROWN_ACCENT : '#B69E84' }}
                >
                  {t === 'translation' ? 'With Translation' : 'Arabic'}
                  <span
                    className="absolute left-0 right-0 -bottom-px h-[2px]"
                    style={{ backgroundColor: active ? BROWN_ACCENT : BORDER }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Reciter (compact) */}
        <div className="px-5 mt-4">
          <Select value={selectedReciter} onValueChange={handleReciterChange}>
            <SelectTrigger
              className="w-full rounded-full text-[13px]"
              style={{ backgroundColor: CREAM_CARD, borderColor: BORDER, color: BROWN }}
            >
              <SelectValue placeholder="Reciter" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RECITERS).map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Body */}
        <div className="px-5 mt-5">
          {loadingSurah ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : detailTab === 'translation' ? (
            <div className="space-y-7">
              {selectedSurah.arabic1?.map((arabic, i) => {
                const n = i + 1;
                const isPlaying = playingVerse === n;
                return (
                  <div key={n}>
                    {/* Action bar */}
                    <div
                      className="rounded-full flex items-center justify-between px-2 py-2"
                      style={{ backgroundColor: '#F1E0BC' }}
                    >
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold"
                        style={{ backgroundColor: BROWN_ACCENT }}
                      >
                        {n}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          aria-label="Translate"
                          className="h-8 w-8 rounded-full flex items-center justify-center"
                          style={{ color: BROWN_ACCENT }}
                        >
                          <Globe className="h-4 w-4" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => playVerse(n)}
                          aria-label={isPlaying ? 'Pause' : 'Play'}
                          className="h-8 w-8 rounded-full flex items-center justify-center"
                          style={{ color: BROWN_ACCENT }}
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" strokeWidth={2} />
                          ) : (
                            <Play className="h-4 w-4" strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    </div>
                    {/* Arabic */}
                    <p
                      dir="rtl"
                      className="text-right mt-4 text-[22px] leading-[2.4]"
                      style={{ fontFamily: ARABIC_FONT, color: BROWN }}
                    >
                      {arabic}
                    </p>
                    {/* Translation */}
                    {selectedSurah.english?.[i] && (
                      <p className="mt-3 text-[15px] leading-relaxed" style={{ color: BROWN }}>
                        {selectedSurah.english[i]}
                      </p>
                    )}
                    <div className="mt-5 h-px" style={{ backgroundColor: BORDER }} />
                  </div>
                );
              })}
            </div>
          ) : (
            // Arabic-only continuous view
            <div
              dir="rtl"
              className="text-right leading-[2.6] text-[22px]"
              style={{ fontFamily: ARABIC_FONT, color: BROWN }}
            >
              {selectedSurah.arabic1?.map((a, i) => (
                <span key={i}>
                  {a}
                  <span
                    className="inline-block mx-1 align-middle text-[14px] rounded-full px-2"
                    style={{ color: BROWN_ACCENT, border: `1px solid ${BORDER}` }}
                  >
                    {i + 1}
                  </span>{' '}
                </span>
              ))}
            </div>
          )}
        </div>

        <BottomNavigation />
      </div>
    );
  }

  /* ---------------- List view ---------------- */
  return (
    <div className="min-h-screen max-w-md mx-auto pb-28 font-arabic" style={{ backgroundColor: CREAM_BG }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} aria-label="Back" className="-ml-1">
            <ArrowLeft className="h-5 w-5" style={{ color: BROWN_ACCENT }} strokeWidth={2} />
          </button>
          <h1 className="text-[22px] font-bold" style={{ color: BROWN_ACCENT, fontFamily: SERIF }}>
            Quran
          </h1>
        </div>
        <button aria-label="Search" onClick={() => setShowSearch((s) => !s)}>
          <Search className="h-5 w-5" style={{ color: BROWN_ACCENT }} strokeWidth={2} />
        </button>
      </div>

      {/* Last Read */}
      <div className="px-5 mt-2">
        <div
          className="rounded-2xl px-5 py-5 text-white shadow-sm"
          style={{ backgroundColor: OLIVE }}
        >
          <div className="flex items-center gap-2 text-[13px] opacity-95">
            <BookOpen className="h-4 w-4" strokeWidth={2} />
            Last Read
          </div>
          <div className="mt-3 text-[22px] font-bold leading-tight" style={{ fontFamily: SERIF }}>
            Al-Fatiah
          </div>
          <div className="text-[13px] opacity-90 mt-1">Ayah No: 1</div>
        </div>
      </div>

      {/* Search input (toggleable) */}
      {showSearch && (
        <div className="px-5 mt-4">
          <Input
            placeholder="Search chapters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-full"
            style={{ backgroundColor: CREAM_CARD, borderColor: BORDER, color: BROWN }}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="px-10 mt-6">
        <div className="grid grid-cols-2 text-center">
          {(['surah', 'para'] as const).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="pb-2 text-[16px] font-semibold relative capitalize"
                style={{ color: active ? BROWN_ACCENT : '#B69E84' }}
              >
                {t === 'surah' ? 'Surah' : 'Para'}
                <span
                  className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full"
                  style={{ backgroundColor: active ? BROWN_ACCENT : BORDER }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="mt-2">
        {loading ? (
          <div className="px-5 space-y-3 mt-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : tab === 'surah' ? (
          <ul>
            {filtered.map((s, idx) => {
              const num = surahs.findIndex((x) => x.surahName === s.surahName) + 1;
              return (
                <li key={num}>
                  <button
                    onClick={() => fetchSurahDetails(num)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4"
                  >
                    <StarBadge n={num} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[16px] font-semibold" style={{ color: BROWN }}>
                        {s.surahName}
                      </div>
                      <div className="text-[11px] tracking-[0.18em] font-medium mt-0.5" style={{ color: MUTED }}>
                        {s.revelationPlace?.toUpperCase()} • {s.totalAyah} VERSES
                      </div>
                    </div>
                    <div
                      className="text-[22px] shrink-0"
                      dir="rtl"
                      style={{ fontFamily: ARABIC_FONT, color: BROWN_ACCENT }}
                    >
                      {s.surahNameArabic}
                    </div>
                  </button>
                  {idx < filtered.length - 1 && (
                    <div className="mx-5 h-px" style={{ backgroundColor: BORDER }} />
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <ul>
            {Array.from({ length: 30 }).map((_, i) => (
              <li key={i}>
                <button className="w-full text-left px-5 py-4 flex items-center gap-4">
                  <StarBadge n={i + 1} />
                  <div className="flex-1">
                    <div className="text-[16px] font-semibold" style={{ color: BROWN }}>
                      Para {i + 1}
                    </div>
                    <div className="text-[11px] tracking-[0.18em] font-medium mt-0.5" style={{ color: MUTED }}>
                      JUZ {i + 1}
                    </div>
                  </div>
                  <div
                    className="text-[22px] shrink-0"
                    dir="rtl"
                    style={{ fontFamily: ARABIC_FONT, color: BROWN_ACCENT }}
                  >
                    الجزء {i + 1}
                  </div>
                </button>
                {i < 29 && <div className="mx-5 h-px" style={{ backgroundColor: BORDER }} />}
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};