import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, Menu } from 'lucide-react';
import { SideMenu } from '@/components/SideMenu';
import { BottomNavigation } from '@/components/BottomNavigation';

const CREAM = '#FFF5E5';
const CREAM_CARD = '#FFF5E5';
const BROWN = '#2C1309';
const BROWN_ACCENT = '#B0431E';
const HERO_GRAD = 'linear-gradient(177deg, #78351A 2.14%, #CE5728 97.86%)';

export type HadithBook = {
  name: string;
  slug: string;
  edition?: string; // fawazahmed0 hadith-api edition (without "eng-" prefix kept simple)
  altUrl?: string; // A7med3bdulBaset/hadith-json fallback for books not in fawazahmed0
};

export const HADITH_BOOKS: { category: string; books: HadithBook[] }[] = [
  {
    category: 'Core Authentic Collections (Kutub al-Sittah)',
    books: [
      { name: 'Sahih al-Bukhari', slug: 'bukhari', edition: 'eng-bukhari' },
      { name: 'Sahih Muslim', slug: 'muslim', edition: 'eng-muslim' },
      { name: 'Sunan Abu Dawud', slug: 'abudawud', edition: 'eng-abudawud' },
      { name: "Jami' at-Tirmidhi", slug: 'tirmidhi', edition: 'eng-tirmidhi' },
      { name: "Sunan an-Nasa'i", slug: 'nasai', edition: 'eng-nasai' },
      { name: 'Sunan Ibn Majah', slug: 'ibnmajah', edition: 'eng-ibnmajah' },
    ],
  },
  {
    category: 'Daily Life & Character',
    books: [
      {
        name: 'Riyad as-Salihin',
        slug: 'riyadussalihin',
        altUrl:
          'https://raw.githubusercontent.com/A7med3bdulBaset/hadith-json/main/db/by_book/other_books/riyad_assalihin.json',
      },
      {
        name: 'Al-Adab Al-Mufrad',
        slug: 'adab',
        altUrl:
          'https://raw.githubusercontent.com/A7med3bdulBaset/hadith-json/main/db/by_book/other_books/aladab_almufrad.json',
      },
    ],
  },
  {
    category: 'Essential Short Collections',
    books: [
      { name: "Al-Arba'in An-Nawawiyyah", slug: 'nawawi40', edition: 'eng-nawawi40' },
    ],
  },
  {
    category: 'Seerah & Character of the Prophet',
    books: [
      {
        name: "Shama'il Muhammadiyah",
        slug: 'shamail',
        altUrl:
          'https://raw.githubusercontent.com/A7med3bdulBaset/hadith-json/main/db/by_book/other_books/shamail_muhammadiyah.json',
      },
    ],
  },
];

export const Hadith = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const open = (b: HadithBook) => {
    if (b.edition || b.altUrl) navigate(`/hadith/${b.slug}`);
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: CREAM }}>
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Hero header */}
      <div className="px-5 pt-12 pb-10" style={{ background: HERO_GRAD, color: '#FFF5E5' }}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,245,229,0.18)' }}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[20px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            Hadith Books
          </h1>
          <button
            onClick={() => setIsMenuOpen(true)}
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,245,229,0.18)' }}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-4 text-[13px] opacity-90">
          Read the major collections of authentic hadith. Tap any book to open the full text.
        </p>
      </div>

      <div
        className="relative px-5 pt-6"
        style={{
          background: CREAM,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          marginTop: -20,
        }}
      >
        <div className="space-y-3">
          {HADITH_BOOKS.map((group) => (
            <div
              key={group.category}
              className="rounded-2xl border overflow-hidden"
              style={{ background: CREAM_CARD, borderColor: 'rgba(232,213,196,0.86)' }}
            >
              <div className="px-4 py-2.5" style={{ background: 'rgba(120,53,26,0.06)' }}>
                <span
                  className="text-[12px] tracking-wide uppercase"
                  style={{ color: BROWN_ACCENT, fontWeight: 700 }}
                >
                  {group.category}
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(232,213,196,0.5)' }}>
                {group.books.map((book) => (
                  <button
                    key={book.slug}
                    onClick={() => open(book)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left active:opacity-70"
                  >
                    <BookOpen className="h-4 w-4 shrink-0" style={{ color: BROWN_ACCENT }} strokeWidth={2} />
                    <span
                      className="text-[14px] flex-1"
                      style={{ color: BROWN, fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {book.name}
                    </span>
                    <span className="text-[11px]" style={{ color: BROWN_ACCENT, fontWeight: 600 }}>
                      Open
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Hadith;