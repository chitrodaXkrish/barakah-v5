import navHomeIcon from '@/assets/nav-home-icon.png.asset.json';
import navMarketplaceIcon from '@/assets/nav-marketplace-icon.png.asset.json';
import navPrayerIcon from '@/assets/nav-prayer-icon.png.asset.json';
import navChatIcon from '@/assets/nav-chat-icon.png.asset.json';
import { ScanLine } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { assetUrl } from '@/lib/assetUrl';

const PILL_BG = '#FFFFFF';
const ACTIVE_BG = '#F5E3D3';
const TEXT_ACTIVE = '#7A3B1E';
const TEXT_INACTIVE = '#9A9A9A';

// Custom image icon components
const HomeIconImg = ({ isActive }: { isActive: boolean }) => (
  <img
    src={assetUrl(navHomeIcon)}
    alt="Home"
    className="shrink-0"
    style={{
      width: 24,
      height: 24,
      objectFit: 'contain',
      filter: isActive ? 'none' : 'grayscale(100%) brightness(1.4)',
    }}
  />
);

const MarketplaceIconImg = ({ isActive }: { isActive: boolean }) => (
  <img
    src={assetUrl(navMarketplaceIcon)}
    alt="Marketplace"
    className="shrink-0"
    style={{
      width: 24,
      height: 24,
      objectFit: 'contain',
      filter: isActive ? 'none' : 'grayscale(100%) brightness(1.4)',
    }}
  />
);

const PrayerIconImg = ({ isActive }: { isActive: boolean }) => (
  <img
    src={assetUrl(navPrayerIcon)}
    alt="Prayer"
    className="shrink-0"
    style={{
      width: 24,
      height: 24,
      objectFit: 'contain',
      filter: isActive ? 'none' : 'grayscale(100%) brightness(1.4)',
    }}
  />
);

type NavItem = {
  key: string;
  labelKey: string;
  customLabel?: string;
  path: string;
  render: (isActive: boolean) => JSX.Element;
};

const NAV_ITEMS: NavItem[] = [
  { key: 'home', labelKey: 'nav.home', path: '/', render: (a) => <HomeIconImg isActive={a} /> },
  { key: 'shop', labelKey: 'nav.store', path: '/shop', render: (a) => <MarketplaceIconImg isActive={a} /> },
  { key: 'prayer', labelKey: 'nav.prayer', path: '/prayer-times', render: (a) => <PrayerIconImg isActive={a} /> },
  { key: 'scan', labelKey: 'nav.scanner', customLabel: 'Halal Scan', path: '/halal-scanner', render: (a) => <ScanLine size={22} color={a ? TEXT_ACTIVE : TEXT_INACTIVE} strokeWidth={1.8} /> },
];

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md z-30 px-3 pb-3 font-arabic">
      <div className="flex items-center gap-2 w-full">
        <div
          className="flex-1 min-w-0 rounded-full flex items-center justify-between h-12 px-1 overflow-hidden"
          style={{
            backgroundColor: PILL_BG,
            boxShadow: '0 10px 28px rgba(60, 30, 15, 0.14), 0 2px 6px rgba(60, 30, 15, 0.06)',
          }}
        >
          {NAV_ITEMS.map(({ key, labelKey, customLabel, path, render }) => {
            const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
            const color = isActive ? TEXT_ACTIVE : TEXT_INACTIVE;
            return (
              <button
                key={key}
                onClick={() => navigate(path)}
                className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-full transition-all duration-200"
                style={{ backgroundColor: isActive ? ACTIVE_BG : 'transparent' }}
              >
                {render(isActive)}
                <span
                  className="text-[10px] leading-none whitespace-nowrap truncate max-w-full"
                  style={{ color, fontWeight: isActive ? 700 : 600 }}
                >
                  {customLabel || t(labelKey)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Chat / Guftagu FAB */}
        <button
          onClick={() => navigate('/forum')}
          className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 active:scale-95"
          style={{
            background: 'radial-gradient(circle at 30% 25%, #C9663A 0%, #8B3A18 70%, #5C2410 100%)',
            boxShadow: '0 8px 20px rgba(139, 58, 24, 0.45), inset 0 1px 2px rgba(255,255,255,0.25)',
          }}
          aria-label="Guftagu"
        >
          <img
            src={assetUrl(navChatIcon)}
            alt="Guftagu"
            className="shrink-0"
            style={{ width: 22, height: 22, objectFit: 'contain' }}
          />
        </button>
      </div>
    </nav>
  );
};
