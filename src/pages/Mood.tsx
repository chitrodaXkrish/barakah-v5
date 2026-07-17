import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ChevronRight,
  X,
  Sun,
  Heart,
  UtensilsCrossed,
  Home,
  Moon,
  Sunrise,
  MapPin,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { BottomNavigation } from '@/components/BottomNavigation';

const CREAM = '#FFF5E5';
const CREAM_CARD = '#FFFFFF';
const BROWN = '#2C1309';
const BROWN_ACCENT = '#B0431E';
const BROWN_MUTED = '#8B6F5C';
const BORDER = 'rgba(232,213,196,0.86)';

interface DuaItem {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Sun;
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
}

const duas: DuaItem[] = [
  {
    id: 'waking-up',
    title: 'Waking Up',
    subtitle: 'Gratitude for a new day',
    icon: Sun,
    arabic:
      'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration:
      'Alhamdulillahilladhi ahyana ba\'da ma amatana wa ilayhin-nushur',
    translation:
      'All praise is due to Allah, who has given us life after He caused us to die, and to Him is the resurrection.',
    source: 'Sahih al-Bukhari',
  },
  {
    id: 'hardship',
    title: 'Dua for Hardship',
    subtitle: 'Recite when facing difficulty',
    icon: Heart,
    arabic:
      'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا',
    transliteration:
      'Allahumma la sahla illa ma ja\'altahu sahla, wa anta taj\'alu al-hazna idha shi\'ta sahla',
    translation:
      'O Allah, there is no ease except in what You have made easy, and You make the difficulty, if You will, easy.',
    source: 'Sahih Muslim',
  },
  {
    id: 'before-eating',
    title: 'Before Eating',
    subtitle: 'Seeking blessing in rizq',
    icon: UtensilsCrossed,
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillah',
    translation: 'In the name of Allah.',
    source: 'Sahih al-Bukhari',
  },
  {
    id: 'entering-home',
    title: 'Entering Home',
    subtitle: 'Peace for the household',
    icon: Home,
    arabic:
      'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا',
    transliteration:
      'Bismillahi walajna, wa bismillahi kharajna, wa \'ala rabbina tawakkalna',
    translation:
      'In the name of Allah we enter, and in the name of Allah we leave, and upon our Lord we rely.',
    source: 'Abu Dawud',
  },
  {
    id: 'before-sleeping',
    title: 'Before Sleeping',
    subtitle: 'Seeking protection through the night',
    icon: Moon,
    arabic: 'بِسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amutu wa ahya',
    translation: 'In Your name, O Allah, I die and I live.',
    source: 'Sahih al-Bukhari',
  },
  {
    id: 'morning',
    title: 'Morning Remembrance',
    subtitle: 'Protection and gratitude',
    icon: Sunrise,
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    transliteration: 'Hasbunallahu wa ni\'mal wakeel',
    translation:
      'Allah is sufficient for us, and He is the best Disposer of affairs.',
    source: 'Quran 3:173',
  },
  {
    id: 'traveling',
    title: 'When Traveling',
    subtitle: 'Safety and gratitude for transport',
    icon: MapPin,
    arabic:
      'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
    transliteration:
      'Subhanalladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun',
    translation:
      'Glory be to Him who has subjected this to us, and we could never have it by our own efforts. And indeed, to our Lord we will return.',
    source: 'Quran 43:13-14',
  },
  {
    id: 'after-prayer',
    title: 'After Prayer',
    subtitle: 'Seeking forgiveness and blessings',
    icon: Sparkles,
    arabic:
      'أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ\nاللَّهُمَّ أَنْتَ السَّلَامُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    transliteration:
      'Astaghfirullah, astaghfirullah, astaghfirullah\nAllahumma antas-salam, wa minkas-salam, tabarakta ya dhal-jalali wal-ikram',
    translation:
      'I seek forgiveness from Allah, I seek forgiveness from Allah, I seek forgiveness from Allah.\nO Allah, You are Peace, and from You comes peace. Blessed are You, O Owner of majesty and honour.',
    source: 'Sahih Muslim',
  },
];

export const Mood = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDua, setSelectedDua] = useState<DuaItem | null>(null);

  const filteredDuas = useMemo(() => {
    if (!searchQuery.trim()) return duas;
    const q = searchQuery.toLowerCase();
    return duas.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.subtitle.toLowerCase().includes(q) ||
        d.arabic.includes(q)
    );
  }, [searchQuery]);

  return (
    <div
      className="min-h-screen max-w-md mx-auto relative overflow-hidden font-arabic"
      style={{ background: CREAM }}
    >
      {/* Header */}
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

      {/* Search */}
      <div className="px-5 pb-4">
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3 border"
          style={{ background: CREAM_CARD, borderColor: BORDER }}
        >
          <Search className="h-5 w-5 flex-shrink-0" style={{ color: BROWN_MUTED }} strokeWidth={2} />
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

      {/* Dua List */}
      <div className="px-5 pb-28 space-y-2.5">
        {filteredDuas.map((dua) => {
          const Icon = dua.icon;
          return (
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
                <Icon className="h-5 w-5" strokeWidth={2} />
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
                  {dua.subtitle}
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

      {/* Detail Modal */}
      {selectedDua && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedDua(null)}
          />

          {/* Card */}
          <div
            className="relative w-full max-w-md rounded-t-[32px] px-6 pt-6 pb-10 max-h-[90vh] overflow-y-auto"
            style={{ background: CREAM_CARD }}
          >
            {/* Close */}
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

            {/* Title */}
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
              {selectedDua.subtitle}
            </p>

            {/* Divider */}
            <div
              className="my-5 h-px"
              style={{ background: BORDER }}
            />

            {/* Arabic */}
            <p
              className="text-[24px] leading-[1.8] text-center font-arabic"
              style={{ color: BROWN }}
              dir="rtl"
            >
              {selectedDua.arabic}
            </p>

            {/* Transliteration */}
            <p
              className="text-[14px] italic text-center mt-4 leading-relaxed"
              style={{ color: BROWN_MUTED }}
            >
              &ldquo;{selectedDua.transliteration}&rdquo;
            </p>

            {/* Divider */}
            <div
              className="my-5 h-px"
              style={{ background: BORDER }}
            />

            {/* English */}
            <p
              className="text-[14px] font-semibold mb-3"
              style={{ color: BROWN }}
            >
              English
            </p>
            <p
              className="text-[16px] leading-relaxed"
              style={{ color: BROWN }}
            >
              {selectedDua.translation}
            </p>

            {/* Source */}
            <div className="flex items-center gap-2 mt-6">
              <BookOpen className="h-4 w-4" style={{ color: BROWN_ACCENT }} strokeWidth={2} />
              <p className="text-[13px]" style={{ color: BROWN_MUTED }}>
                Source: {selectedDua.source}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
