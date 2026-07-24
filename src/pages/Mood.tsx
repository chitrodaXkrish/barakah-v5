import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { BottomNavigation } from '@/components/BottomNavigation';
import duasData from '../data/duas.json';

const CREAM = '#FFF5E5';
const CREAM_CARD = '#FFFFFF';
const BROWN = '#2C1309';
const BROWN_ACCENT = '#B0431E';
const BROWN_MUTED = '#8B6F5C';
const BORDER = 'rgba(232,213,196,0.86)';

interface DuaItem {
  number: number;
  title: string;
  url: string;
  arabic: string;
  translation: string[];
  transliteration_and_notes: string;
}

interface GroupedDua {
  id: string;
  title: string;
  duas: DuaItem[];
  partCount: number;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const getPartCount = (dua: DuaItem) => Math.max(dua.translation.length, 1);

const groupedDuas: GroupedDua[] = Array.from(
  (duasData as DuaItem[]).reduce((groups, dua) => {
    const current = groups.get(dua.title) ?? [];
    current.push(dua);
    groups.set(dua.title, current);
    return groups;
  }, new Map<string, DuaItem[]>())
).map(([title, duas]) => ({
  id: slugify(title),
  title,
  duas: duas.sort((a, b) => a.number - b.number),
  partCount: duas.reduce((count, dua) => count + getPartCount(dua), 0),
}));

const formatListSubtitle = (group: GroupedDua) => {
  const numbers = group.duas.map((dua) => dua.number);
  const range =
    numbers.length > 1
      ? `#${Math.min(...numbers)}-${Math.max(...numbers)}`
      : `#${numbers[0]}`;
  const partLabel = group.partCount === 1 ? 'section' : 'sections';

  return `Hisnul Muslim ${range} - ${group.partCount} ${partLabel}`;
};

const groupMatchesSearch = (group: GroupedDua, query: string) =>
  group.title.toLowerCase().includes(query) ||
  group.duas.some((dua) =>
    [
      dua.number.toString(),
      dua.arabic,
      dua.transliteration_and_notes,
      ...dua.translation,
    ]
      .join(' ')
      .toLowerCase()
      .includes(query)
  );

export const Mood = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDua, setSelectedDua] = useState<GroupedDua | null>(null);

  const filteredDuas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupedDuas;

    return groupedDuas.filter((group) => groupMatchesSearch(group, q));
  }, [searchQuery]);

  return (
    <div
      className="min-h-screen max-w-md mx-auto relative overflow-hidden font-arabic"
      style={{ background: CREAM }}
    >
      <div
        className="flex items-center gap-3 px-5 pt-4 pb-3"
        style={{ background: CREAM }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2"
          style={{ color: BROWN }}
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={2} />
        </button>
        <h1
          className="text-[20px] font-bold"
          style={{
            color: BROWN,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Duas
        </h1>
      </div>

      <div className="px-5 pb-4">
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3 border"
          style={{ background: CREAM_CARD, borderColor: BORDER }}
        >
          <Search
            className="h-5 w-5 flex-shrink-0"
            style={{ color: BROWN_MUTED }}
            strokeWidth={2}
          />
          <input
            type="text"
            placeholder="Search duas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#B8A898]"
            style={{ color: BROWN }}
          />
        </div>
      </div>

      <div className="px-5 pb-28 space-y-2.5">
        {filteredDuas.map((dua) => (
          <button
            key={dua.id}
            onClick={() => setSelectedDua(dua)}
            className="w-full flex items-center gap-4 rounded-2xl px-4 py-4 border text-left transition-transform active:scale-[0.98]"
            style={{ background: CREAM_CARD, borderColor: BORDER }}
          >
            <div
              className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(176,67,30,0.08)', color: BROWN_ACCENT }}
            >
              <BookOpen className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[15px] font-semibold truncate"
                style={{ color: BROWN }}
              >
                {dua.title}
              </p>
              <p
                className="text-[13px] truncate"
                style={{ color: BROWN_MUTED }}
              >
                {formatListSubtitle(dua)}
              </p>
            </div>
            <ChevronRight
              className="h-5 w-5 flex-shrink-0"
              style={{ color: BROWN_ACCENT }}
              strokeWidth={2}
            />
          </button>
        ))}

        {filteredDuas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[15px]" style={{ color: BROWN_MUTED }}>
              No duas found
            </p>
          </div>
        )}
      </div>

      <BottomNavigation />

      {selectedDua && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedDua(null)}
          />

          <div
            className="relative w-full max-w-md rounded-t-[32px] px-6 pt-6 pb-10 max-h-[90vh] overflow-y-auto"
            style={{ background: CREAM_CARD }}
          >
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setSelectedDua(null)}
                className="p-2 -mr-2"
                style={{ color: BROWN }}
                aria-label="Close"
              >
                <X className="h-6 w-6" strokeWidth={2} />
              </button>
            </div>

            <h2
              className="text-[22px] font-bold"
              style={{
                color: BROWN,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {selectedDua.title}
            </h2>
            <p className="text-[14px] mt-1" style={{ color: BROWN_MUTED }}>
              {formatListSubtitle(selectedDua)}
            </p>

            <div className="my-5 h-px" style={{ background: BORDER }} />

            <div className="space-y-7">
              {selectedDua.duas.map((dua) => (
                <section key={dua.number} className="space-y-5">
                  {selectedDua.duas.length > 1 && (
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: BROWN_ACCENT }}
                    >
                      Hisnul Muslim #{dua.number}
                    </p>
                  )}

                  <p
                    className="whitespace-pre-line text-[24px] leading-[1.8] text-center font-arabic"
                    style={{ color: BROWN }}
                    dir="rtl"
                  >
                    {dua.arabic}
                  </p>

                  <div
                    className="rounded-2xl border px-4 py-4"
                    style={{ borderColor: BORDER, background: CREAM }}
                  >
                    <p
                      className="text-[14px] font-semibold mb-3"
                      style={{ color: BROWN }}
                    >
                      English
                    </p>
                    <div className="space-y-3">
                      {dua.translation.map((translation, index) => (
                        <p
                          key={`${dua.number}-translation-${index}`}
                          className="text-[16px] leading-relaxed"
                          style={{ color: BROWN }}
                        >
                          {dua.translation.length > 1 && (
                            <span
                              className="mr-2 text-[13px] font-semibold"
                              style={{ color: BROWN_ACCENT }}
                            >
                              {index + 1}.
                            </span>
                          )}
                          {translation}
                        </p>
                      ))}
                    </div>
                  </div>

                  {dua.transliteration_and_notes && (
                    <div>
                      <p
                        className="text-[14px] font-semibold mb-3"
                        style={{ color: BROWN }}
                      >
                        Transliteration and notes
                      </p>
                      <p
                        className="whitespace-pre-line text-[14px] italic leading-relaxed"
                        style={{ color: BROWN_MUTED }}
                      >
                        {dua.transliteration_and_notes}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <BookOpen
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: BROWN_ACCENT }}
                      strokeWidth={2}
                    />
                    <p className="text-[13px]" style={{ color: BROWN_MUTED }}>
                      Source: Hisnul Muslim #{dua.number}
                    </p>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
