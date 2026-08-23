import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, MapPin, ChevronDown, Sun, Sunrise, Sunset, Moon, Cloud, CloudSun, Sparkles, X, BookOpen, Flame, Trophy, Calendar as CalendarIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SideMenu } from '@/components/SideMenu';
import { BottomNavigation } from '@/components/BottomNavigation';
import { LocationPicker } from '@/components/LocationPicker';
import { useGlobalLocation } from '@/contexts/LocationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrayerTimes } from '@/contexts/PrayerTimesContext';
import prayerArcLogo from '@/assets/prayer-arc-logo.png.asset.json';
import hadithIcon from '@/assets/hadith-icon-v2.png.asset.json';
import qaQuranAsset from '@/assets/qa-quran-new.png.asset.json';
import quranIconFallback from '@/assets/qa-quran.png';
import hajjIcon from '@/assets/hajj-icon.png.asset.json';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, MapPin, ChevronDown, Sun, Sunrise, Sunset, Moon, Cloud, CloudSun, Sparkles, X, BookOpen, Flame, Trophy, Calendar as CalendarIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SideMenu } from '@/components/SideMenu';
import { BottomNavigation } from '@/components/BottomNavigation';
import { LocationPicker } from '@/components/LocationPicker';
import { useGlobalLocation } from '@/contexts/LocationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrayerTimes } from '@/contexts/PrayerTimesContext';
import prayerArcLogo from '@/assets/prayer-arc-logo.png.asset.json';
import hadithIcon from '@/assets/hadith-icon-v2.png.asset.json';
import qaQuranAsset from '@/assets/qa-quran-new.png.asset.json';
import quranIconFallback from '@/assets/qa-quran.png';
import hajjIcon from '@/assets/hajj-icon.png.asset.json';
import placesIcon from '@/assets/places-icon.png.asset.json';
import zakatIcon from '@/assets/zakat-icon.png.asset.json';
import duaIcon from '@/assets/dua-icon.png.asset.json';
import qiblaIcon from '@/assets/qibla-icon.png.asset.json';
import prayerMarkIcon from '@/assets/prayer-mark-icon.png.asset.json';
import { assetUrl } from '@/lib/assetUrl';
import {
  cancelPrayerNotifications,
  schedulePrayerNotifications,
} from '@/lib/prayerNotifications';
import { useAppNotifications, formatNotificationTimeLabel } from '@/hooks/useAppNotifications';
import {
  formatPrayerTime12,
  formatPrayerTime24,
  getNextPrayer,
  prayerMinutes,
  type PrayerKey,
} from '@/lib/islamicPrayerTimes';
import { formatHijriDate, formatStandardDate } from '@/lib/dateUtils';

const CREAM = '#FFF5E5';
const CREAM_CARD = '#FFF5E5';
const BROWN = '#2C1309';
const BROWN_ACCENT = '#B0431E';
const OLIVE = '#7E8A3E';
const HERO_GRAD = 'linear-gradient(177deg, #78351A 2.14%, #CE5728 97.86%)';
const DAILY_BROWN = '#5C2A14';
const QURAN_READING_STATS_KEY = 'barakah_quran_reading_stats';

interface QuranReadingStats {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string;
  totalReadDays: number;
}

const loadQuranReadingStats = (): QuranReadingStats => {
  const empty = { currentStreak: 0, longestStreak: 0, lastReadDate: '', totalReadDays: 0 };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = localStorage.getItem(QURAN_READING_STATS_KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
};

const PRAYER_ICONS: Record<PrayerKey, LucideIcon> = {
  sunrise: Sun,
  fajr: CloudSun,
  dhuhr: Sun,
  asr: Cloud,
  maghrib: Sunset,
  isha: Moon,
};

const essentials = [
  { key: 'action.hadith', img: assetUrl(hadithIcon), icon: null, path: '/hadith' },
  { key: 'action.quran', img: assetUrl(qaQuranAsset), fallbackImg: quranIconFallback, icon: null, path: '/quran' },
  { key: 'action.hajj_packages', img: assetUrl(hajjIcon), icon: null, path: '/hajj' },
  { key: 'action.nearby', img: assetUrl(placesIcon), icon: null, path: '/places' },
  { key: 'action.zakat_calc', img: assetUrl(zakatIcon), icon: null, path: '/zakat' },
  { key: 'action.mood', img: assetUrl(duaIcon), icon: null, path: '/mood' },
  { key: 'action.qibla', img: assetUrl(qiblaIcon), icon: null, path: '/qibla' },
  { key: 'action.prayer_mark', img: assetUrl(prayerMarkIcon), icon: null, path: '/progress' },
];

const hadithBooks = [
  {
    category: "Core Authentic Collections (Kutub al-Sittah)",
    books: [
      "Sahih al-Bukhari",
      "Sahih Muslim",
      "Sunan Abu Dawud",
      "Jami' at-Tirmidhi",
      "Sunan an-Nasa'i",
      "Sunan Ibn Majah",
    ],
  },
  {
    category: "Daily Life & Character",
    books: ["Riyad as-Salihin", "Al-Adab Al-Mufrad"],
  },
  {
    category: "Essential Short Collections",
    books: ["Al-Arba'in An-Nawawiyyah"],
  },
  {
    category: "Seerah & Character of the Prophet",
    books: ["Shama'il Muhammadiyah"],
  },
];


export const PrayerTimes = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { location, loading: locationLoading } = useGlobalLocation();
  const {
    prayers: apiPrayers,
    loading: prayerTimesLoading,
    error: prayerTimesError,
  } = usePrayerTimes();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => localStorage.getItem('barakah_notifications_enabled') !== 'false',
  );
  const [quranStats, setQuranStats] = useState<QuranReadingStats>(() => loadQuranReadingStats());
  const [now, setNow] = useState(new Date());


  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const syncNotificationSetting = () => {
      setNotificationsEnabled(localStorage.getItem('barakah_notifications_enabled') !== 'false');
    };

    window.addEventListener('barakah-notification-setting-changed', syncNotificationSetting);
    window.addEventListener('storage', syncNotificationSetting);

    return () => {
      window.removeEventListener('barakah-notification-setting-changed', syncNotificationSetting);
      window.removeEventListener('storage', syncNotificationSetting);
    };
  }, []);

  useEffect(() => {
    const refreshQuranStats = () => setQuranStats(loadQuranReadingStats());
    window.addEventListener('barakah-quran-reading-updated', refreshQuranStats);
    window.addEventListener('storage', refreshQuranStats);
    return () => {
      window.removeEventListener('barakah-quran-reading-updated', refreshQuranStats);
      window.removeEventListener('storage', refreshQuranStats);
    };
  }, []);

  const hijri = useMemo(() => formatHijriDate(now), [now]);
  const standardDate = useMemo(() => formatStandardDate(now), [now]);

  const cur = now.getHours() * 60 + now.getMinutes();
  const prayers = useMemo(
    () =>
      apiPrayers.map((prayer) => ({
        ...prayer,
        icon: PRAYER_ICONS[prayer.key],
      })),
    [apiPrayers],
  );
  const orderedDay = useMemo(
    () => prayers.filter((p) => p.key !== 'sunrise'),
    [prayers],
  );
  const next = getNextPrayer(prayers, now);
  const cityLabel = location ? location.area || location.city : (locationLoading ? 'Locating...' : 'Set location');
  const { notifications } = useAppNotifications();

  useEffect(() => {
    if (!notificationsEnabled) {
      cancelPrayerNotifications().catch(() => {});
      return;
    }

    if (orderedDay.length === 0) return;

    schedulePrayerNotifications(orderedDay).catch(() => {});
  }, [notificationsEnabled, orderedDay]);

  const openNotifications = () => {
    setIsNotificationsOpen(true);
  };

  return (
    <div
      className="min-h-screen max-w-md mx-auto relative overflow-hidden font-arabic"
      style={{
        background: CREAM,
        paddingBottom: 'var(--app-bottom-navigation-height)',
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ background: CREAM }}>
        <button
          onClick={() => setIsMenuOpen(true)}
          className="p-2 -ml-2"
          style={{ color: BROWN }}
          aria-label="Menu"
        >
          <Menu className="h-6 w-6" strokeWidth={2} />
        </button>
        <h1
          className="text-[20px] font-bold"
          style={{ color: BROWN, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Prayers
        </h1>
        <div className="relative">
          <button
            onClick={openNotifications}
            className="w-10 h-10 rounded-full flex items-center justify-center relative"
            style={{ background: '#F1E0C8', color: BROWN }}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" strokeWidth={2} />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: '#E89D2F' }} />
            )}
          </button>

          {isNotificationsOpen && (
            <div
              className="absolute right-0 top-12 z-40 w-[300px] rounded-2xl border shadow-xl overflow-hidden"
              style={{ background: '#FFF7E8', borderColor: 'rgba(232,213,196,0.9)' }}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ background: '#F1E0C8' }}>
                <div>
                  <p className="text-[15px] font-bold" style={{ color: BROWN }}>
                    Notifications
                  </p>
                  <p className="text-[11px]" style={{ color: '#8B6F5C' }}>
                    Prayer time alerts
                  </p>
                </div>
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{ color: BROWN }}
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <div className="max-h-[330px] overflow-y-auto py-2">
                {notifications.length > 0 ? (
                  notifications.map((item) => (
                    <div key={item.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(176,67,30,0.1)', color: BROWN_ACCENT }}
                        >
                          <Bell className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold" style={{ color: BROWN }}>
                            {item.title}
                          </p>
                          <p className="text-[12px] leading-snug mt-0.5" style={{ color: '#8B6F5C' }}>
                            {item.body}
                          </p>
                          <p className="text-[11px] mt-1" style={{ color: BROWN_ACCENT }}>
                            {formatNotificationTimeLabel(item.receivedAt, now)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-[14px] font-semibold" style={{ color: BROWN }}>
                      No new notifications
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: '#8B6F5C' }}>
                      Notifications received will be saved here for 24 hours.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hero arc card */}
      <div
        className="relative mx-0 px-5 pt-6 pb-20 overflow-hidden"
        style={{ background: HERO_GRAD }}
      >
        {/* Arc + Logo image */}
        <div className="absolute inset-x-0 top-3 flex justify-center">
          <img
            src={assetUrl(prayerArcLogo)}
            alt="Barakah"
            className="w-full max-w-[300px] object-contain"
            style={{ height: 150 }}
          />
        </div>

        <div className="relative z-10 text-center mt-16">
          <p className="text-[14px]" style={{ color: '#FFE8CA', opacity: 0.9 }}>
            {hijri}
          </p>
          <p className="text-[11px] mt-1" style={{ color: '#FFE8CA', opacity: 0.72 }}>
            {standardDate}
          </p>
          <p
            className="text-[28px] mt-2"
            style={{ color: '#FFF5E5', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}
          >
            {next
              ? `${next.label} ${formatPrayerTime12(next)}`
              : prayerTimesLoading
                ? 'Loading prayer times'
                : location
                  ? 'Prayer times unavailable'
                  : 'Set location'}
          </p>
        </div>
      </div>

      {/* Beige content with rounded top corners */}
      <div
        className="relative"
        style={{
          background: CREAM,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          marginTop: -20,
          zIndex: 1,
        }}
      >

      {/* Essentials grid */}
      <div className="px-5 pt-6">
        <h2
          className="text-[20px] mb-3"
          style={{ color: BROWN, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
        >
          {t('prayer.essentials')}
        </h2>
        <div className="grid grid-cols-4 gap-2.5">
          {essentials.map((e) => (
            <button
              key={e.key}
              onClick={() => navigate(e.path)}
              className="flex flex-col items-center justify-end pt-2 pb-2 rounded-2xl border transition-transform active:scale-95"
              style={{
                background: CREAM_CARD,
                borderColor: 'rgba(232,213,196,0.86)',
                height: 88,
              }}
            >
              {e.img ? (
                <img
                  src={e.img}
                  alt={t(e.key)}
                  className="h-11 w-auto object-contain"
                  onError={(event) => {
                    if (e.fallbackImg && event.currentTarget.src !== e.fallbackImg) {
                      event.currentTarget.src = e.fallbackImg;
                    }
                  }}
                />
              ) : (
                <div
                  className="h-11 w-11 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(180deg, #C99063 0%, #8B4A22 100%)', color: '#FFF5E5' }}
                >
                  {e.icon && <e.icon className="h-5 w-5" strokeWidth={2} />}
                </div>
              )}
              <span className="text-[10px] mt-1.5 text-center px-1" style={{ color: BROWN, fontWeight: 600 }}>
                {t(e.key)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quran Reading Progress */}
      <div className="px-5 pt-5">
        <button
          onClick={() => navigate('/quran')}
          className="w-full rounded-2xl border px-5 py-4 text-left transition-transform active:scale-[0.99]"
          style={{
            background: CREAM_CARD,
            borderColor: 'rgba(232,213,196,0.86)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-11 w-11 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(176,67,30,0.12)', color: BROWN_ACCENT }}
              >
                <BookOpen className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[16px] font-bold" style={{ color: BROWN }}>
                  Quran Reading
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: '#8B6F5C' }}>
                  {quranStats.lastReadDate ? `Last read ${quranStats.lastReadDate}` : 'Start your first reading'}
                </p>
              </div>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[12px] font-bold"
              style={{ background: '#F1E0C8', color: BROWN_ACCENT }}
            >
              Continue
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-xl px-3 py-3" style={{ background: '#FFF9EF' }}>
              <Flame className="h-4 w-4 mb-2" style={{ color: BROWN_ACCENT }} strokeWidth={2} />
              <div className="text-[20px] font-bold leading-none" style={{ color: BROWN }}>
                {quranStats.currentStreak}
              </div>
              <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: '#8B6F5C' }}>
                Day Streak
              </div>
            </div>
            <div className="rounded-xl px-3 py-3" style={{ background: '#FFF9EF' }}>
              <Trophy className="h-4 w-4 mb-2" style={{ color: OLIVE }} strokeWidth={2} />
              <div className="text-[20px] font-bold leading-none" style={{ color: BROWN }}>
                {quranStats.longestStreak}
              </div>
              <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: '#8B6F5C' }}>
                Best
              </div>
            </div>
            <div className="rounded-xl px-3 py-3" style={{ background: '#FFF9EF' }}>
              <CalendarIcon className="h-4 w-4 mb-2" style={{ color: BROWN }} strokeWidth={2} />
              <div className="text-[20px] font-bold leading-none" style={{ color: BROWN }}>
                {quranStats.totalReadDays}
              </div>
              <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: '#8B6F5C' }}>
                Read Days
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Daily Prayer Times */}
      <div className="px-5 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-[20px]"
            style={{ color: BROWN, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          >
            Daily Prayer Times
          </h2>
          <button
            onClick={() => setIsLocationPickerOpen(true)}
            className="flex items-center gap-1 text-[13px] transition-transform active:scale-95"
            style={{ color: BROWN }}
          >
            <MapPin className="h-4 w-4" strokeWidth={2} />
            <span className="font-medium">{cityLabel}</span>
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-2.5">
          {prayers.length === 0 && (
            <div
              className="rounded-2xl px-5 py-5 border text-center"
              style={{
                background: CREAM_CARD,
                borderColor: 'rgba(232,213,196,0.7)',
                color: BROWN,
              }}
            >
              <p className="text-[14px] font-semibold">
                {prayerTimesLoading
                  ? 'Loading prayer times'
                  : location
                    ? 'Prayer times unavailable'
                    : 'Set your location'}
              </p>
              <p className="text-[12px] mt-1" style={{ color: '#8B6F5C' }}>
                {location
                  ? prayerTimesError || 'Please try refreshing or choose a nearby city.'
                  : 'Prayer times will update once your location is available.'}
              </p>
            </div>
          )}
          {prayers.map((p) => {
            const isActive = p.key === next?.key;
            const isSunrise = p.key === 'sunrise';
            const Icon = p.icon;
            return (
              <div
                key={p.key}
                className="flex items-center justify-between rounded-2xl px-5 py-3.5 border"
                style={{
                  background: CREAM_CARD,
                  borderColor: isActive ? BROWN_ACCENT : 'rgba(232,213,196,0.7)',
                  borderWidth: isActive ? 1.5 : 1,
                }}
              >
                <span
                  className="text-[18px]"
                  style={{
                    color: BROWN,
                    fontWeight: 600,
                    fontStyle: isSunrise ? 'italic' : 'normal',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {p.label}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-[16px] tabular-nums" style={{ color: BROWN, fontWeight: 500 }}>
                    {formatPrayerTime24(p)}
                  </span>
                  <Icon className="h-5 w-5" style={{ color: BROWN }} strokeWidth={2} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Wisdom */}
      <div className="px-5 pt-5 pb-32">
        <div className="rounded-2xl p-5" style={{ background: DAILY_BROWN }}>
          <div className="flex items-start justify-between">
            <Sparkles className="h-7 w-7" style={{ color: '#E8C9A0' }} strokeWidth={1.5} />
            <span
              className="text-[11px] tracking-[0.15em]"
              style={{ color: '#F5E6D0', fontWeight: 600 }}
            >
              DAILY WISDOM
            </span>
          </div>
          <p
            className="mt-4 text-[18px] italic leading-snug"
            style={{ color: '#FFF5E5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            "For indeed, with hardship [will be] ease."
          </p>
          <p
            className="mt-3 text-[11px] tracking-[0.15em]"
            style={{ color: '#C9A882', fontWeight: 700 }}
          >
            ASH-SHARH 94:5
          </p>
        </div>
      </div>
      </div>

      <BottomNavigation />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <LocationPicker isOpen={isLocationPickerOpen} onClose={() => setIsLocationPickerOpen(false)} />
    </div>
  );
};
