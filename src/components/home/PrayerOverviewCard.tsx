import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Moon } from "lucide-react";

interface PrayerOverviewCardProps {
  currentPrayerName: string;
  currentTime: string;
  nextTimeLabel: string;
}

export const PrayerOverviewCard = ({
  currentPrayerName,
  currentTime,
  nextTimeLabel,
}: PrayerOverviewCardProps) => {
  const { t } = useLanguage();

  const PRAYER_NAMES = [
    { key: 'fajr', label: t('prayer.fajr') },
    { key: 'dhuhr', label: t('prayer.dhuhr') },
    { key: 'asr', label: t('prayer.asr') },
    { key: 'maghrib', label: t('prayer.maghrib') },
    { key: 'isha', label: t('prayer.isha') },
  ];

  const normalizePrayerName = (label: string) => {
    if (!label) return "";
    return label
      .replace("Next:", "")
      .replace("Time", "")
      .trim()
      .split(" ")[0]
      .toLowerCase();
  };

  const activePrayer = normalizePrayerName(currentPrayerName);

  const getDisplayPrayerName = () => {
    const prayer = PRAYER_NAMES.find(p => p.key === activePrayer);
    return prayer ? prayer.label : t('prayer.upcoming');
  };

  const activePrayerIndex = PRAYER_NAMES.findIndex(p => p.key === activePrayer);

  return (
    <Card className="relative overflow-hidden glass-dark p-4 shine-effect">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,hsl(17_70%_45%/0.1),transparent_60%)] pointer-events-none" />
      
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
            {t('home.next_prayer')}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-brown-gradient">
            {getDisplayPrayerName()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground max-w-[180px] leading-relaxed">
            {nextTimeLabel || t('home.next_prayer_at')}
          </p>
        </div>

        <div className="text-right flex items-start gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
            <Moon className="h-10 w-10 text-primary relative z-10 float drop-shadow-[0_0_10px_hsl(17_70%_45%/0.4)]" strokeWidth={1} fill="hsl(17 70% 45% / 0.1)" />
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums tracking-tight text-brown-gradient drop-shadow-[0_0_15px_hsl(17_70%_45%/0.25)]">
              {currentTime || "--:--:--"}
            </p>
          </div>
        </div>
      </div>

      {/* Prayer timeline with minimal curve */}
      <div className="relative z-10 mt-5">
        {/* Curved line SVG */}
        <svg 
          className="absolute inset-x-0 top-0 h-14 w-full" 
          viewBox="0 0 320 56" 
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="lineGradientBrown" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(17 70% 45% / 0.15)" />
              <stop offset="50%" stopColor="hsl(17 70% 45% / 0.5)" />
              <stop offset="100%" stopColor="hsl(17 70% 45% / 0.15)" />
            </linearGradient>
            <filter id="glowBrown">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path
            d="M 10 45 Q 80 8, 160 8 Q 240 8, 310 45"
            fill="none"
            stroke="url(#lineGradientBrown)"
            strokeWidth="2"
            filter="url(#glowBrown)"
          />
          {/* Dots on curve */}
          {PRAYER_NAMES.map((_, index) => {
            const x = 10 + (index * 75);
            const y = index === 2 ? 8 : index === 1 || index === 3 ? 20 : 42;
            const isActivePrayer = index === activePrayerIndex;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={isActivePrayer ? 7 : 4}
                fill={isActivePrayer ? "hsl(17 70% 45%)" : "hsl(17 70% 45% / 0.25)"}
                filter={isActivePrayer ? "url(#glowBrown)" : undefined}
              />
            );
          })}
        </svg>

        {/* Prayer labels */}
        <div className="flex items-end justify-between pt-14 px-1">
          {PRAYER_NAMES.map(({ key, label }) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "text-[10px] tracking-wider transition-all duration-300 font-medium",
                  activePrayer === key 
                    ? "text-primary font-bold text-xs" 
                    : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
