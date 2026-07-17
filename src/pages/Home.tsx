import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bell, MapPin, ChevronDown, Newspaper } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalLocation } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import { ChatAssistant } from '@/components/ChatAssistant';
import { SideMenu } from '@/components/SideMenu';
import { BottomNavigation } from '@/components/BottomNavigation';
import { LocationPicker } from '@/components/LocationPicker';
import { FeedbackForm } from '@/components/FeedbackForm';
import qaQuranAsset from '@/assets/qa-quran-new.png.asset.json';
import qaAiAsset from '@/assets/qa-ai-new.png.asset.json';
import qaPlacesAsset from '@/assets/qa-places-new.png.asset.json';
import qaHajjAsset from '@/assets/qa-hajj-new.png.asset.json';
import barakahArcLogo from '@/assets/barakah-arc-logo.png.asset.json';
import barakahLogo from '@/assets/barakah-logo.png.asset.json';
import { assetUrl } from '@/lib/assetUrl';

interface NewsItem {
  id: string;
  title: string;
  source_name: string;
  category?: string | null;
  image_url?: string | null;
  published_at?: string | null;
}

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=200&h=200&fit=crop';

const timeAgo = (iso?: string | null) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { location } = useGlobalLocation();
  const [userName, setUserName] = useState('');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    const display = user.displayName;
    if (display) {
      setUserName(display.split(' ')[0]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.uid)
        .single();
      if (data?.full_name) setUserName(data.full_name.split(' ')[0]);
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('news_articles')
        .select('id, title, source_name, category, image_url, published_at')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(4);
      if (data) setNews(data as NewsItem[]);
    })();
  }, []);

  // Islamic (Hijri) date
  const hijri = new Intl.DateTimeFormat('en-u-ca-islamic', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(now)
    .replace(' AH', '');

  // Next prayer
  const prayerTimes: Array<[string, number, number]> = [
    ['Fajr', 5, 12],
    ['Dhuhr', 12, 30],
    ['Asr', 15, 45],
    ['Maghrib', 18, 38],
    ['Isha', 19, 55],
  ];
  const cur = now.getHours() * 60 + now.getMinutes();
  const next =
    prayerTimes.find(([, h, m]) => h * 60 + m > cur) || prayerTimes[0];
  const nextHour = next[1];
  const nextMin = next[2];
  const ampm = nextHour >= 12 ? 'pm' : 'am';
  const displayHour = ((nextHour + 11) % 12) + 1;
  const prayerTime = `${displayHour}:${nextMin.toString().padStart(2, '0')} ${ampm}`;

  const cityLabel = location?.city || 'Dubai';

  const quickActions = [
    { label: 'Quran', img: assetUrl(qaQuranAsset), onClick: () => navigate('/quran') },
    { label: 'Islamic AI', img: assetUrl(qaAiAsset), onClick: () => setIsChatOpen(true) },
    { label: 'Places', img: assetUrl(qaPlacesAsset), onClick: () => navigate('/places') },
    { label: 'Hajj Packages', img: assetUrl(qaHajjAsset), onClick: () => navigate('/hajj') },
  ];

  return (
    <div
      className="min-h-screen max-w-md mx-auto relative overflow-hidden"
      style={{ background: '#FFF5E5' }}
    >
      {/* HERO — brown gradient top section */}
      <div
        className="relative pt-4 pb-16 overflow-hidden"
        style={{ background: 'linear-gradient(177deg, #78351A 2.14%, #CE5728 60%, #D97A4A 85%, #E8A87C 100%)' }}
      >
        {/* soft radial glows */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 596,
            height: 299,
            left: -173,
            top: 241,
            background:
              'radial-gradient(42% 42% at 50% 50%, #D79354 0%, rgba(150,80,42,0) 70%)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: 596,
            height: 299,
            left: 8,
            top: 243,
            background:
              'radial-gradient(42% 42% at 50% 50%, #D79354 0%, rgba(150,80,42,0) 70%)',
          }}
        />

        {/* Top app bar */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-2">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="text-[#F9FAFB] p-2 -ml-2"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" strokeWidth={2} />
          </button>
          <img
            src={assetUrl(barakahLogo)}
            alt="Barakah"
            className="h-7 w-auto object-contain"
          />
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#F9FAFB]"
            style={{ background: 'rgba(255,255,255,0.15)' }}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Greeting + location */}
        <div className="relative z-10 px-5 pt-5 flex items-start justify-between">
          <div>
            <p className="text-[12px] font-medium" style={{ color: '#E8D5C4', opacity: 0.85 }}>
              As-Salaam-Alaikum!
            </p>
            <p className="text-[18px] font-bold mt-0.5" style={{ color: '#E8D5C4' }}>
              {userName || 'Friend'}
            </p>
          </div>
          <button
            onClick={() => setIsLocationPickerOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/70 text-[#F9FAFB] transition-transform active:scale-95"
          >
            <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="text-[12px] font-medium">{cityLabel}</span>
            <ChevronDown className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>

        {/* Arc + center logo + prayer info */}
        <ArcTimeline
          hijri={hijri}
          currentPrayer={next[0]}
          prayerTime={prayerTime}
          nowMinutes={cur}
          prayerTimes={prayerTimes}
        />

        {/* Feedback bar */}
        <button
          onClick={() => setIsFeedbackOpen(true)}
          className="relative z-10 mx-5 mb-3 w-[calc(100%-2.5rem)] flex items-center justify-between rounded-xl px-4 py-3 border transition-transform active:scale-[0.99]"
          style={{ background: '#FFF5E5', borderColor: '#E8D5C4' }}
        >
          <span className="text-[13px] font-semibold" style={{ color: '#2C1309' }}>
            Help Us Improve With Your Feedback!
          </span>
          <span className="text-[13px] font-semibold flex items-center gap-0.5" style={{ color: '#CE5728' }}>
            Start <span aria-hidden>›</span>
          </span>
        </button>

        {/* Quick action cards */}
        <div className="relative z-10 px-5 mt-0 grid grid-cols-4 gap-2">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className="flex flex-col items-center justify-end pt-2 pb-2.5 rounded-2xl border transition-transform active:scale-95"
              style={{
                background: '#FFF5E5',
                borderColor: 'rgba(232,213,196,0.86)',
                height: 104,
              }}
            >
              <img src={a.img} alt={a.label} className="h-14 w-auto object-contain" />
              <span
                className="text-[10px] mt-1"
                style={{ color: '#55433D', fontWeight: 500 }}
              >
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* CREAM SHEET — News */}
      <div
        className="relative -mt-6 rounded-t-[24px] border-2 border-b-0 px-5 pt-5 pb-40"
        style={{ background: '#FFF5E5', borderColor: '#E8D5C4' }}
      >
        {/* drag handle */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{ width: 80, height: 3, top: 8, background: '#D9D9D9' }}
        />

        <div className="flex items-center justify-between mb-4 mt-2">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" style={{ color: '#C4733A' }} strokeWidth={2} />
            <h2
              className="text-[18px]"
              style={{ color: '#2C1309', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700 }}
            >
              News
            </h2>
          </div>
          <button
            onClick={() => navigate('/news')}
            className="text-[12px] font-medium"
            style={{ color: '#5F5A4F' }}
          >
            View More
          </button>
        </div>

        <div className="space-y-2.5">
          {(news.length ? news : Array.from({ length: 2 })).map((n: any, i) => (
            <button
              key={n?.id || i}
              onClick={() => n?.id && navigate(`/news/${n.id}`)}
              className="w-full text-left rounded-2xl border p-3 flex items-start gap-3 transition-transform active:scale-[0.99]"
              style={{
                background: 'rgba(255,255,255,0.65)',
                borderColor: '#E8D5C4',
                backdropFilter: 'blur(4px)',
              }}
            >
              <img
                src={n?.image_url || FALLBACK_IMG}
                alt=""
                loading="lazy"
                className="w-20 h-20 rounded-full object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.05em]"
                  style={{ color: '#5C1F05' }}
                >
                  {n?.category || 'Culture'}
                </p>
                <p
                  className="text-[13px] mt-1 line-clamp-2"
                  style={{
                    color: '#2C1309',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontWeight: 600,
                    lineHeight: '18px',
                  }}
                >
                  {n?.title ||
                    "New calligraphy exhibition opens in Istanbul's historic center"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-medium" style={{ color: '#B8622A' }}>
                    {n?.source_name || 'TRT World'}
                  </span>
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ background: 'rgba(184,98,42,0.4)' }}
                  />
                  <span className="text-[10px] font-medium" style={{ color: '#B8622A' }}>
                    {timeAgo(n?.published_at) || '2h ago'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="fixed left-1/2 -translate-x-1/2 max-w-md w-full pointer-events-none"
        style={{
          bottom: 0,
          height: 140,
          background:
            'linear-gradient(0deg, #FFF5E5 30%, rgba(255,245,229,0) 100%)',
        }}
      />

      {/* Bottom nav */}
      <BottomNavigation />

      {/* Chat overlay + side menu */}
      <ChatAssistant open={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <LocationPicker isOpen={isLocationPickerOpen} onClose={() => setIsLocationPickerOpen(false)} />
      <FeedbackForm open={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
};

type ArcTimelineProps = {
  hijri: string;
  currentPrayer: string;
  prayerTime: string;
  nowMinutes: number;
  prayerTimes: Array<[string, number, number]>;
};

const ArcTimeline = ({
  hijri,
  currentPrayer,
  prayerTime,
  nowMinutes,
  prayerTimes,
}: ArcTimelineProps) => {
  const cx = 140;
  const cy = 200;
  const r = 130;
  // Angles spread from 180° (left) to 0° (right) for 5 prayers
  const dots = prayerTimes.map(([name, h, m], i) => {
    const angleDeg = 180 - (i * 180) / (prayerTimes.length - 1);
    const rad = (angleDeg * Math.PI) / 180;
    return {
      name,
      mins: h * 60 + m,
      x: cx + r * Math.cos(rad),
      y: cy - r * Math.sin(rad),
    };
  });

  // Determine active prayer: the most recent one whose time has passed; default to first
  let activeIdx = 0;
  for (let i = 0; i < dots.length; i++) {
    if (nowMinutes >= dots[i].mins) activeIdx = i;
  }
  // If before Fajr, highlight Isha (previous day's last)
  if (nowMinutes < dots[0].mins) activeIdx = dots.length - 1;

  return (
    <div className="relative h-[230px] mt-4">
      {/* Arc + Logo image */}
      <img
        src={assetUrl(barakahArcLogo)}
        alt="Barakah"
        className="absolute left-1/2 -translate-x-1/2 top-0 w-[280px] h-auto"
      />

      {/* Date + prayer (centered inside the semicircle) */}
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: 95 }}>
        <p
          className="text-[15px] tracking-tight"
          style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 300 }}
        >
          {hijri}
        </p>
        <p
          className="text-white text-[30px] mt-2 tracking-tight leading-none"
          style={{ fontWeight: 300 }}
        >
          {currentPrayer} {prayerTime}
        </p>
      </div>
    </div>
  );
};
