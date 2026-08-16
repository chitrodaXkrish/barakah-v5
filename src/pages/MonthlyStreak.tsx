import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const CREAM = '#FFF5E5';
const CREAM_CARD = '#FFF5E5';
const BROWN = '#2C1309';
const BROWN_ACCENT = '#A35233';
const MUTED = '#B8A18C';
const FULL = '#A35233';
const PARTIAL = '#3F5A2E';
const MISSED = '#C0392B';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const DAILY_MARKER_TOTAL = PRAYER_KEYS.length + 1;

type SalahLog = {
  date: string;
  fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean;
  quran_read?: boolean;
};

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const MonthlyStreak = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [logs, setLogs] = useState<Record<string, SalahLog>>({});
  const [allLogs, setAllLogs] = useState<SalahLog[]>([]);
  const [loading, setLoading] = useState(true);

  const { t, language } = useLanguage();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const localeMap: Record<string, string> = {
    en: 'en-US', ur: 'ur-PK', ar: 'ar-SA', tr: 'tr-TR', id: 'id-ID', ms: 'ms-MY', ta: 'ta-IN', bn: 'bn-BD'
  };
  const monthName = cursor.toLocaleString(localeMap[language] || 'en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const start = fmt(new Date(year, month, 1));
      const end = fmt(new Date(year, month + 1, 0));
      const [{ data: monthData }, { data: lifetime }] = await Promise.all([
        supabase.from('salah_log').select('*').eq('user_id', user.uid).gte('date', start).lte('date', end),
        supabase.from('salah_log').select('*').eq('user_id', user.uid).order('date', { ascending: true }),
      ]);
      if (cancelled) return;
      const map: Record<string, SalahLog> = {};
      (monthData || []).forEach((l: any) => { map[l.date] = l; });
      setLogs(map);
      setAllLogs((lifetime as any) || []);
      setLoading(false);
    };
    load();

    // Realtime: refetch whenever this user's salah_log changes
    const channel = supabase
      .channel(`salah_log:${user.uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'salah_log', filter: `user_id=eq.${user.uid}` },
        () => { load(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, year, month]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  const cells: Array<{ day: number | null; ds?: string }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, ds: fmt(new Date(year, month, d)) });
  while (cells.length % 7 !== 0) cells.push({ day: null });

  const completedPrayerCount = (l?: SalahLog) => l ? PRAYER_KEYS.filter(k => l[k]).length : 0;
  const completedMarkerCount = (l?: SalahLog) => l ? completedPrayerCount(l) + (l.quran_read ? 1 : 0) : 0;

  // Stats
  const monthLogs = Object.values(logs);
  const totalPossibleMarkersThisMonth = (() => {
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const days = isCurrentMonth ? today.getDate() : daysInMonth;
    return days * DAILY_MARKER_TOTAL;
  })();
  const monthCompleted = monthLogs.reduce((s, l) => s + completedMarkerCount(l), 0);
  const monthPct = totalPossibleMarkersThisMonth ? Math.round((monthCompleted / totalPossibleMarkersThisMonth) * 100) : 0;

  const totalComplete = allLogs.reduce((s, l) => s + completedMarkerCount(l), 0);

  // Qada count: missed prayers ONLY on past days the user actually logged something
  // (avoids counting every untouched day since signup as a missed day).
  const todayStr = fmt(today);
  const qadaCount = allLogs
    .filter(l => l.date < todayStr)
    .reduce((s, l) => s + (PRAYER_KEYS.length - completedPrayerCount(l)), 0);

  // Best streak (consecutive full days)
  const bestStreak = (() => {
    if (allLogs.length === 0) return 0;
    const fulls = new Set(allLogs.filter(l => completedMarkerCount(l) === DAILY_MARKER_TOTAL).map(l => l.date));
    let best = 0, cur = 0;
    const sorted = [...fulls].sort();
    if (sorted.length === 0) return 0;
    let prev: Date | null = null;
    for (const ds of sorted) {
      const d = new Date(ds);
      if (prev && (d.getTime() - prev.getTime()) === 86400000) cur++; else cur = 1;
      if (cur > best) best = cur;
      prev = d;
    }
    return best;
  })();

  const dayDot = (ds?: string, day?: number | null) => {
    if (!ds || !day) return null;
    const isFuture = ds > todayStr;
    if (isFuture) return <span className="block h-1.5 w-1.5 rounded-full mt-1" style={{ background: '#F0E0CB' }} />;
    const c = completedMarkerCount(logs[ds]);
    let color = MISSED;
    if (c === DAILY_MARKER_TOTAL) color = FULL;
    else if (c > 0) color = PARTIAL;
    else if (!logs[ds]) color = MISSED;
    return <span className="block h-1.5 w-1.5 rounded-full mt-1" style={{ background: color }} />;
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto" style={{ background: CREAM, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-4 flex items-center gap-3 bg-white">
        <button
          onClick={() => navigate('/progress')}
          className="h-10 w-10 rounded-full border flex items-center justify-center"
          style={{ borderColor: BROWN, color: BROWN }}
          aria-label={t('login.back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold" style={{ color: BROWN }}>{t('monthly.back_to_mark')}</h1>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: BROWN_ACCENT }} />
        </div>
      ) : (
        <main className="flex-1 px-5 pt-5 pb-10 space-y-5">
          {/* Month switcher */}
          <div className="flex items-center justify-between px-2">
            <button
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="p-2"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" style={{ color: BROWN_ACCENT }} />
            </button>
            <span className="text-[17px] font-semibold" style={{ color: BROWN }}>{monthName}</span>
            <button
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="p-2"
              aria-label="Next month"
              disabled={year === today.getFullYear() && month === today.getMonth()}
              style={{ opacity: year === today.getFullYear() && month === today.getMonth() ? 0.35 : 1 }}
            >
              <ChevronRight className="h-5 w-5" style={{ color: BROWN_ACCENT }} />
            </button>
          </div>

          {/* Calendar card */}
          <div className="rounded-3xl px-4 py-5" style={{ background: CREAM_CARD, boxShadow: '0 2px 12px rgba(120,53,26,0.06)' }}>
            <div className="grid grid-cols-7 mb-3">
              {WEEKDAYS.map((d, i) => (
                <div key={i} className="text-center text-[13px]" style={{ color: MUTED }}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-3">
              {cells.map((c, i) => {
                if (!c.day) return <div key={i} />;
                const isToday = c.ds === todayStr;
                const isFuture = c.ds! > todayStr;
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div
                      className="h-10 w-10 flex items-center justify-center text-[15px] font-semibold"
                      style={{
                        color: isFuture ? '#D9C5AE' : BROWN,
                        border: isToday ? `1.5px solid ${BROWN_ACCENT}` : 'none',
                        borderRadius: 12,
                      }}
                    >
                      {c.day}
                    </div>
                    {dayDot(c.ds, c.day)}
                  </div>
                );
              })}
            </div>
            <div className="border-t mt-5 pt-4 flex items-center justify-center gap-5 text-[13px]" style={{ borderColor: '#F0E0CB', color: BROWN }}>
              <Legend color={FULL} label={t('monthly.legend_full')} />
              <Legend color={PARTIAL} label={t('monthly.legend_partial')} />
              <Legend color={MISSED} label={t('monthly.legend_missed')} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label={t('monthly.this_month_percent')} value={`${monthPct}%`} color={BROWN_ACCENT} />
            <StatCard label={t('progress.best_streak').toUpperCase()} value={`${bestStreak} ${t('monthly.days')}`} color={PARTIAL} />
            <StatCard label={t('progress.read_quran')} value={`${totalComplete}`} color={BROWN_ACCENT} />
            <StatCard label={t('monthly.qada_count')} value={`${qadaCount}`} color={MISSED} />
          </div>
        </main>
      )}
    </div>
  );
};

const Legend = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1.5">
    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
    <span>{label}</span>
  </div>
);

const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="rounded-2xl px-5 py-5" style={{ background: CREAM_CARD, boxShadow: '0 2px 10px rgba(120,53,26,0.05)' }}>
    <div className="text-[13px] leading-tight tracking-wide" style={{ color: BROWN }}>{label}</div>
    <div className="text-[22px] font-semibold mt-4" style={{ color }}>{value}</div>
  </div>
);
