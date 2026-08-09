import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Droplets,
  Gift,
  Heart,
  Home,
  Megaphone,
  Moon,
  Plane,
  Search,
  Shield,
  Shirt,
  Star,
  Sun,
  Utensils,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BottomNavigation } from '@/components/BottomNavigation';
import duasData from '../data/duas.json';

const CREAM = '#FFF5E5';
const CREAM_CARD = '#FFFFFF';
const BROWN = '#2C1309';
const BROWN_ACCENT = '#B0431E';
const BROWN_MUTED = '#8B6F5C';
const BORDER = 'rgba(232,213,196,0.86)';

interface DuaItem {
  id: number;
  category: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
  source: string;
  slug: string;
  tags: string[];
}

interface GroupedDua {
  id: string;
  category: string;
  duas: DuaItem[];
  partCount: number;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const groupedDuas: GroupedDua[] = Array.from(
  (duasData as DuaItem[]).reduce((groups, dua) => {
    const categoryName = dua.category || dua.title || 'General';
    const current = groups.get(categoryName) ?? [];
    current.push(dua);
    groups.set(categoryName, current);
    return groups;
  }, new Map<string, DuaItem[]>())
).map(([category, duas]) => ({
  id: slugify(category),
  category,
  duas: duas.sort((a, b) => a.id - b.id),
  partCount: duas.length,
}));

const formatListSubtitle = (group: GroupedDua) => {
  const numbers = group.duas.map((dua) => dua.id);
  const range =
    numbers.length > 1
      ? `#${Math.min(...numbers)}-${Math.max(...numbers)}`
      : `#${numbers[0]}`;
  const partLabel = group.partCount === 1 ? 'section' : 'sections';

  return `Hisnul Muslim ${range} - ${group.partCount} ${partLabel}`;
};

const groupMatchesSearch = (group: GroupedDua, query: string) =>
  group.category.toLowerCase().includes(query) ||
  group.duas.some((dua) =>
    [
      dua.id.toString(),
      dua.title,
      dua.arabic,
      dua.transliteration,
      dua.translation,
      dua.reference,
      ...(dua.tags || []),
    ]
      .join(' ')
      .toLowerCase()
      .includes(query)
  );

const getDuaIcon = (category: string): LucideIcon => {
  const text = category.toLowerCase();
  if (/morning|waking|sunrise|dawn/.test(text)) return Sun;
  if (/evening|night|sleep|bed/.test(text)) return Moon;
  if (/garment|clothes|dress|wearing|undressing/.test(text)) return Shirt;
  if (/ablution|toilet|rain|water/.test(text)) return Droplets;
  if (/home|house|entering|leaving/.test(text)) return Home;
  if (/athan|adhan|call to prayer|prayer|mosque/.test(text)) return Megaphone;
  if (/travel|journey|mount|vehicle/.test(text)) return Plane;
  if (/food|eating|meal|fast/.test(text)) return Utensils;
  if (/protection|evil|enemy|fear|startled/.test(text)) return Shield;
  if (/sick|anxiety|worry|sad|forgiveness/.test(text)) return Heart;
  if (/congrat|new|marriage|child|blessing/.test(text)) return Gift;
  if (/praise|remembrance|glorif|dhikr|tasbih/.test(text)) return Star;
  return BookOpen;
};

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
          Duas & Supplications
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
            placeholder="Search duas, transliteration, meaning..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#B8A898]"
            style={{ color: BROWN }}
          />
        </div>
      </div>

      <div className="px-5 pb-28 space-y-2.5">
        {filteredDuas.map((group) => {
          const Icon = getDuaIcon(group.category);

          return (
            <button
              key={group.id}
              onClick={() => setSelectedDua(group)}
              className="w-full flex items-center gap-4 rounded-2xl px-4 py-4 border text-left transition-transform active:scale-[0.98]"
              style={{ background: CREAM_CARD, borderColor: BORDER }}
            >
              <div
                className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(176,67,30,0.08)', color: BROWN_ACCENT }}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[15px] font-semibold truncate"
                  style={{ color: BROWN }}
                >
                  {group.category}
                </p>
                <p
                  className="text-[13px] truncate"
                  style={{ color: BROWN_MUTED }}
                >
                  {formatListSubtitle(group)}
                </p>
              </div>
              <ChevronRight
                className="h-5 w-5 flex-shrink-0"
                style={{ color: BROWN_ACCENT }}
                strokeWidth={2}
              />
            </button>
          );
        })}

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
              {selectedDua.category}
            </h2>
            <p className="text-[14px] mt-1" style={{ color: BROWN_MUTED }}>
              {formatListSubtitle(selectedDua)}
            </p>

            <div className="my-5 h-px" style={{ background: BORDER }} />

            <div className="space-y-8">
              {selectedDua.duas.map((dua) => (
                <section key={dua.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[13px] font-semibold px-2.5 py-1 rounded-md"
                      style={{ background: 'rgba(176,67,30,0.1)', color: BROWN_ACCENT }}
                    >
                      Hisnul Muslim #{dua.id}
                    </span>
                  </div>

                  {dua.arabic && (
                    <div
                      className="rounded-2xl px-5 py-5"
                      style={{ background: '#FFF9F0' }}
                    >
                      <p
                        className="text-[26px] leading-[2.2] font-arabic text-right"
                        style={{
                          color: BROWN,
                          direction: 'rtl',
                          unicodeBidi: 'plaintext',
                          wordSpacing: '0.08em',
                          textRendering: 'optimizeLegibility',
                        }}
                        dir="rtl"
                        lang="ar"
                      >
                        {dua.arabic}
                      </p>
                    </div>
                  )}

                  {dua.transliteration && (
                    <div
                      className="rounded-2xl border px-4 py-4"
                      style={{ borderColor: BORDER, background: CREAM }}
                    >
                      <p
                        className="text-[14px] font-semibold mb-2"
                        style={{ color: BROWN }}
                      >
                        Transliteration
                      </p>
                      <p
                        className="whitespace-pre-line text-[15px] italic leading-relaxed"
                        style={{ color: BROWN_MUTED }}
                        dir="ltr"
                      >
                        {dua.transliteration}
                      </p>
                    </div>
                  )}

                  {dua.translation && (
                    <div
                      className="rounded-2xl border px-4 py-4"
                      style={{ borderColor: BORDER, background: CREAM_CARD }}
                    >
                      <p
                        className="text-[14px] font-semibold mb-2"
                        style={{ color: BROWN }}
                      >
                        English Translation
                      </p>
                      <p
                        className="whitespace-pre-line text-[15px] leading-relaxed"
                        style={{ color: BROWN }}
                        dir="ltr"
                      >
                        {dua.translation}
                      </p>
                    </div>
                  )}

                  {dua.reference && (
                    <div className="flex items-start gap-2 pt-1">
                      <BookOpen
                        className="h-4 w-4 flex-shrink-0 mt-0.5"
                        style={{ color: BROWN_ACCENT }}
                        strokeWidth={2}
                      />
                      <p className="text-[13px] leading-snug" style={{ color: BROWN_MUTED }}>
                        <span className="font-semibold text-[#6E5544]">Reference:</span> {dua.reference}
                      </p>
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
