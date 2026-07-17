import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { BottomNavigation } from '@/components/BottomNavigation';
import hajjImage from '@/assets/hajj-coming-soon-user.png.asset.json';
import { assetUrl } from '@/lib/assetUrl';

const CREAM = '#FFF8F0';
const WHITE = '#FFFFFF';
const BROWN_ACCENT = '#A35233';
const BORDER = '#E8D5C4';

export const Hajj = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen max-w-md mx-auto relative overflow-hidden font-arabic flex flex-col"
      style={{ background: CREAM }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pt-4 pb-3"
        style={{
          background: WHITE,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2"
          style={{ color: BROWN_ACCENT }}
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={2} />
        </button>
        <h1
          className="text-[18px] font-bold"
          style={{
            color: BROWN_ACCENT,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Hajj & Umrah
        </h1>
        <button
          className="p-2 -mr-2"
          style={{ color: BROWN_ACCENT }}
          aria-label="Search"
        >
          <Search className="h-6 w-6" strokeWidth={2} />
        </button>
      </div>

      {/* Image only */}
      <div className="flex-1 flex items-center justify-center px-6">
        <img
          src={assetUrl(hajjImage)}
          alt="Hajj and Umrah coming soon"
          className="w-full max-w-[380px] h-auto object-contain"
        />
      </div>

      {/* Bottom Button */}
      <div className="px-6 pb-28">
        <button
          onClick={() => navigate('/prayer-times')}
          className="w-full py-4 rounded-full text-[16px] font-semibold text-white transition-transform active:scale-95"
          style={{
            background: BROWN_ACCENT,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Explore Prayer
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
};
