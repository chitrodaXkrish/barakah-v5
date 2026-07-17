import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CheckCheck, Loader2, Sunrise, Sun, CloudSun, Sunset, Moon, X, Flame, Trophy, Calendar as CalendarIcon } from 'lucide-react';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useSalahTracker } from '@/hooks/useSalahTracker';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const CREAM = '#FFF5E5';
const CREAM_CARD = '#FFF5E5';
const BROWN = '#2C1309';
const BROWN_DARK = '#3A1E12';
const BROWN_ACCENT = '#B0431E';
const PEACH = '#FCE3BE';
const PEACH_SOFT = '#F8DDB6';
const OLIVE = '#7E8A3E';
const MUTED = '#8B6B55';

const PRAYER_META: Record<string, { label: string; time: string; icon: any }> = {
  fajr:    { label: 'Fajr',    time: '04:32 AM', icon: Sunrise },
  dhuhr:   { label: 'Dhuhr',   time: '12:14 PM', icon: Sun },
  asr:     { label: 'Asr',     time: '03:48 PM', icon: CloudSun },
  maghrib: { label: 'Maghrib', time: '06:54 PM', icon: Sunset },
  isha:    { label: 'Isha',    time: '08:12 PM', icon: Moon },
};
const PRAYER_ORDER: Array<keyof typeof PRAYER_META> = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function timeToMinutes(t: string) {
  const [hm, ap] = t.split(' ');
  let [h, m] = hm.split(':').map(Number);
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

export const Progress = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading, prayerStatus, streak, togglePrayer, progressPercentage, weeklyData } = useSalahTracker();
  const [showMonth, setShowMonth] = useState(false);

  const completedMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    prayerStatus.forEach(p => { m[p.key] = p.completed; });
    return m;
  }, [prayerStatus]);

  // Reorder Mon-Sun starting from today minus 6, mockup uses Mon..Sun fixed.
  // Map weeklyData (Sun-based) into Mon..Sun grid for current week.
  const weekCells = useMemo(() => {
    const now = new Date();
    const todayIdx = (now.getDay() + 6) % 7; // 0=Mon ... 6=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - todayIdx);
    return DAY_LABELS.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entry = weeklyData.find(w => w.date === ds);
      const isToday = i === todayIdx;
      const isFuture = i > todayIdx;
      const completed = entry?.completed ?? 0;
      return { label, isToday, isFuture, completed, total: 5 };
    });
  }, [weeklyData]);

  const weekPercent = useMemo(() => {
    const done = weekCells.filter(c => !c.isFuture).reduce((s, c) => s + c.completed, 0);
    const total = weekCells.filter(c => !c.isFuture).length * 5;
    return total ? Math.round((done / total) * 100) : 0;
  }, [weekCells]);

  // Determine current active prayer = first uncompleted whose time has passed (or first uncompleted)
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const activeKey = useMemo(() => {
    const past = PRAYER_ORDER.filter(k => timeToMinutes(PRAYER_META[k].time) <= nowMin && !completedMap[k]);
    if (past.length) return past[past.length - 1];
    return PRAYER_ORDER.find(k => !completedMap[k]) ?? null;
  }, [completedMap, nowMin]);

  const hijri = useMemo(() => {
    try {
      const fmt = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' });
      return fmt.format(new Date()).replace(' AH', '') + ' AH';
    } catch { return '14 Shawwal 1445 AH'; }
  }, []);

  const handleToggle = (key: keyof typeof PRAYER_META) => {
    if (!user) { toast.error('Please log in to track prayers'); return; }
    togglePrayer(key as any);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CREAM }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: BROWN_ACCENT }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative font-arabic" style={{ background: CREAM }}>
      {/* Header */}
      <header className="px-5 pt-5 pb-4 flex items-center gap-3 bg-white">
        <button
          onClick={() => navigate('/prayer-times')}
          className="h-10 w-10 rounded-full border flex items-center justify-center"
          style={{ borderColor: BROWN, color: BROWN }}
          aria-label="Back to Prayer"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </button>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: BROWN, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Back to Prayer
        </h1>
      </header>

      <main className="flex-1 px-5 pt-5 pb-28 space-y-6">
        {/* Weekly Overview Card */}
        <section
          className="rounded-2xl px-5 py-5"
          style={{ background: CREAM_CARD, boxShadow: '0 1px 0 rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-[13px] font-semibold tracking-[0.14em]" style={{ color: BROWN }}>
              WEEKLY OVERVIEW
            </span>
            <span className="text-[15px] font-bold tracking-wide" style={{ color: BROWN_ACCENT }}>
              {weekPercent}% COMPLETE
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {weekCells.map((c, i) => {
              const full = c.completed === 5;
              const partial = c.completed > 0 && c.completed < 5;
              const missed = !c.isFuture && !c.isToday && c.completed === 0;
              const isToday = c.isToday;

              let circle: React.ReactNode;
              if (c.isFuture) {
                circle = (
                  <div
                    className="h-11 w-11 rounded-full"
                    style={{ border: `1.5px dashed ${PEACH}` }}
                  />
                );
              } else if (isToday) {
                circle = (
                  <div
                    className="h-11 w-11 rounded-full flex items-center justify-center text-white text-[12px] font-bold"
                    style={{ background: BROWN_ACCENT }}
                  >
                    {c.completed}/5
                  </div>
                );
              } else if (full) {
                circle = (
                  <div
                    className="h-11 w-11 rounded-full flex items-center justify-center"
                    style={{ background: BROWN_DARK }}
                  >
                    <Check className="h-5 w-5 text-white" strokeWidth={3} />
                  </div>
                );
              } else if (missed) {
                circle = (
                  <div
                    className="h-11 w-11 rounded-full flex items-center justify-center"
                    style={{ border: `1.5px solid ${PEACH}`, color: MUTED }}
                  >
                    <X className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                );
              } else {
                circle = (
                  <div
                    className="h-11 w-11 rounded-full flex items-center justify-center text-[11px] font-semibold"
                    style={{ border: `1.5px solid ${PEACH}`, color: BROWN }}
                  >
                    {c.completed}/5
                  </div>
                );
              }

              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  {circle}
                  <span
                    className="text-[12px]"
                    style={{
                      color: isToday ? BROWN_ACCENT : c.isFuture ? MUTED : BROWN,
                      fontWeight: isToday ? 700 : 500,
                    }}
                  >
                    {c.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* See Whole Month Streak */}
        <button
          onClick={() => navigate('/monthly-streak')}
          className="w-full rounded-full pl-5 pr-1.5 py-1.5 flex items-center justify-between"
          style={{ background: CREAM_CARD }}
        >
          <span className="text-[15px] font-semibold" style={{ color: BROWN }}>
            See Whole Month Streak
          </span>
          <span
            className="rounded-full px-6 py-2.5 text-white text-[14px] font-semibold"
            style={{ background: OLIVE }}
          >
            See
          </span>
        </button>

        {/* Today header */}
        <div className="flex items-end justify-between pt-2">
          <h2 className="text-[28px] font-bold leading-none" style={{ color: BROWN, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Today
          </h2>
          <span className="text-[14px]" style={{ color: BROWN }}>{hijri}</span>
        </div>

        {/* Prayer rows */}
        <div className="space-y-3">
          {PRAYER_ORDER.map((key) => {
            const meta = PRAYER_META[key];
            const Icon = meta.icon;
            const completed = completedMap[key];
            const isActive = !completed && activeKey === key;
            const minutes = timeToMinutes(meta.time);
            const upcoming = !completed && minutes > nowMin && !isActive;

            const status = completed ? 'Completed' : isActive ? 'Time to Pray' : upcoming ? 'Upcoming' : 'Missed';

            const rowStyle: React.CSSProperties = completed
              ? { background: PEACH_SOFT }
              : isActive
                ? { background: PEACH_SOFT, border: `1.5px solid ${BROWN_ACCENT}` }
                : { background: 'transparent' };

            return (
              <div
                key={key}
                className="rounded-2xl px-4 py-3.5 flex items-center gap-4"
                style={rowStyle}
              >
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: completed || isActive ? '#E9CFA8' : '#E7DFD3', color: BROWN }}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[18px] font-bold leading-tight"
                    style={{ color: isActive ? BROWN_ACCENT : BROWN }}
                  >
                    {meta.label}
                  </div>
                  <div className="text-[13px] mt-0.5" style={{ color: MUTED }}>
                    {meta.time} · {status}
                  </div>
                </div>
                {completed ? (
                  <button
                    onClick={() => handleToggle(key)}
                    className="h-10 w-10 rounded-full flex items-center justify-center"
                    style={{ background: OLIVE }}
                    aria-label="Unmark prayer"
                  >
                    <CheckCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </button>
                ) : isActive ? (
                  <button
                    onClick={() => handleToggle(key)}
                    className="rounded-full px-5 py-2.5 text-white text-[14px] font-semibold"
                    style={{ background: BROWN_ACCENT }}
                  >
                    Mark Done
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggle(key)}
                    className="rounded-full px-5 py-2.5 text-[14px] font-medium"
                    style={{ border: `1px solid ${MUTED}`, color: MUTED, background: 'transparent' }}
                  >
                    Mark Done
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Streak summary */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: CREAM_CARD }}>
            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: BROWN_ACCENT }}>
              <Flame className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[20px] font-bold leading-none" style={{ color: BROWN }}>{streak.current_streak}</div>
              <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: MUTED }}>Day Streak</div>
            </div>
          </div>
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: CREAM_CARD }}>
            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: OLIVE }}>
              <Trophy className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[20px] font-bold leading-none" style={{ color: BROWN }}>{streak.longest_streak}</div>
              <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: MUTED }}>Best Streak</div>
            </div>
          </div>
        </div>
      </main>

      <BottomNavigation />

      {/* Month Streak Modal */}
      <Dialog open={showMonth} onOpenChange={setShowMonth}>
        <DialogContent
          className="max-w-sm rounded-3xl border-0 p-0"
          style={{ background: CREAM }}
        >
          <DialogHeader className="px-5 pt-5">
            <DialogTitle className="flex items-center gap-2" style={{ color: BROWN }}>
              <CalendarIcon className="h-5 w-5" style={{ color: BROWN_ACCENT }} />
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>This Month</span>
            </DialogTitle>
          </DialogHeader>
          <MonthGrid completedMap={completedMap} weeklyData={weeklyData} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MonthGrid = ({ completedMap, weeklyData }: { completedMap: Record<string, boolean>; weeklyData: any[] }) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; ds?: string; isToday?: boolean }> = [];
  for (let i = 0; i < startOffset; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, ds, isToday: d === now.getDate() });
  }

  const completedSet = new Set(weeklyData.filter(w => w.completed === 5).map(w => w.date));

  return (
    <div className="px-5 pb-6">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold" style={{ color: MUTED }}>{d[0]}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c, i) => {
          if (!c.day) return <div key={i} className="h-9" />;
          const isFuture = c.day > now.getDate();
          const isDone = c.ds ? completedSet.has(c.ds) : false;
          return (
            <div
              key={i}
              className="h-9 rounded-lg flex items-center justify-center text-[12px] font-semibold"
              style={{
                background: isDone ? BROWN_DARK : c.isToday ? BROWN_ACCENT : CREAM_CARD,
                color: isDone || c.isToday ? '#fff' : isFuture ? MUTED : BROWN,
                border: isFuture && !c.isToday ? `1px dashed ${PEACH}` : 'none',
              }}
            >
              {c.day}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-4 text-[11px]" style={{ color: MUTED }}>
        <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: BROWN_DARK }} /> Complete</div>
        <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: BROWN_ACCENT }} /> Today</div>
      </div>
    </div>
  );
};