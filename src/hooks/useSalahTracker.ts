import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SalahLog {
  id: string;
  user_id: string;
  date: string;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

interface SalahStreak {
  current_streak: number;
  longest_streak: number;
  last_updated: string;
}

interface PrayerStatus {
  name: string;
  key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  completed: boolean;
}

const PRAYER_KEYS: Array<'fajr' | 'dhuhr' | 'maghrib' | 'asr' | 'isha'> = [
  'fajr', 'dhuhr', 'maghrib', 'asr', 'isha'
];

export const useSalahTracker = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayLog, setTodayLog] = useState<SalahLog | null>(null);
  const [streak, setStreak] = useState<SalahStreak>({ current_streak: 0, longest_streak: 0, last_updated: '' });
  const [weeklyLogs, setWeeklyLogs] = useState<SalahLog[]>([]);

  // Use local date to avoid timezone issues
  const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPrayerStatus = useCallback((): PrayerStatus[] => {
    return [
      { name: 'FAJR', key: 'fajr', completed: todayLog?.fajr ?? false },
      { name: 'DHUHR', key: 'dhuhr', completed: todayLog?.dhuhr ?? false },
      { name: 'MAGHRIB', key: 'maghrib', completed: todayLog?.maghrib ?? false },
      { name: 'ASR', key: 'asr', completed: todayLog?.asr ?? false },
      { name: "ISHA'A", key: 'isha', completed: todayLog?.isha ?? false },
    ];
  }, [todayLog]);

  const fetchTodayLog = useCallback(async () => {
    if (!user) return;
    
    const today = getToday();
    const { data, error } = await supabase
      .from('salah_log')
      .select('*')
      .eq('user_id', user.uid)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      console.error('Error fetching today log:', error);
      return;
    }
    
    setTodayLog(data);
  }, [user]);

  const fetchStreak = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('salah_streaks')
      .select('*')
      .eq('user_id', user.uid)
      .maybeSingle();

    if (error) {
      console.error('Error fetching streak:', error);
      return;
    }

    if (data) {
      setStreak({
        current_streak: data.current_streak,
        longest_streak: data.longest_streak,
        last_updated: data.last_updated,
      });
    }
  }, [user]);

  const fetchWeeklyLogs = useCallback(async () => {
    if (!user) return;

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);

    // Use local date format for queries
    const formatLocalDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const { data, error } = await supabase
      .from('salah_log')
      .select('*')
      .eq('user_id', user.uid)
      .gte('date', formatLocalDate(weekAgo))
      .lte('date', formatLocalDate(today))
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching weekly logs:', error);
      return;
    }

    setWeeklyLogs(data || []);
  }, [user]);

  // Helper to parse date string to local Date object
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // Helper to get date difference in days
  const getDayDifference = (date1: Date, date2: Date): number => {
    const d1 = new Date(date1);
    d1.setHours(0, 0, 0, 0);
    const d2 = new Date(date2);
    d2.setHours(0, 0, 0, 0);
    return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Check if all prayers are completed for a log
  const isFullyCompleted = (log: SalahLog): boolean => {
    return log.fajr && log.dhuhr && log.asr && log.maghrib && log.isha;
  };

  const calculateStreak = useCallback(async () => {
    if (!user) return;

    // Get all logs ordered by date descending
    const { data: logs, error } = await supabase
      .from('salah_log')
      .select('*')
      .eq('user_id', user.uid)
      .order('date', { ascending: false })
      .limit(365); // Check up to a year of data

    if (error) {
      console.error('Error fetching logs for streak:', error);
      return;
    }

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getToday();

    if (!logs || logs.length === 0) {
      // No logs at all, streak is 0
      currentStreak = 0;
    } else {
      // Create a map of date -> log for quick lookup
      const logMap = new Map<string, SalahLog>();
      logs.forEach(log => logMap.set(log.date, log));

      // Check if today is fully completed
      const todayLog = logMap.get(todayStr);
      const todayCompleted = todayLog && isFullyCompleted(todayLog);

      // Get yesterday's date
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      const yesterdayLog = logMap.get(yesterdayStr);
      const yesterdayCompleted = yesterdayLog && isFullyCompleted(yesterdayLog);

      if (todayCompleted) {
        // Today is completed, count streak starting from today
        currentStreak = 1;
        
        // Count backwards from yesterday
        let checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - 1);
        
        while (true) {
          const checkDateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
          const log = logMap.get(checkDateStr);
          
          if (log && isFullyCompleted(log)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      } else if (yesterdayCompleted) {
        // Today not complete yet, but yesterday was - show streak from yesterday
        // This maintains the streak display until the user completes today or misses it
        currentStreak = 1;
        
        // Count backwards from day before yesterday
        let checkDate = new Date(yesterday);
        checkDate.setDate(checkDate.getDate() - 1);
        
        while (true) {
          const checkDateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
          const log = logMap.get(checkDateStr);
          
          if (log && isFullyCompleted(log)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      } else {
        // Neither today nor yesterday is complete - streak is 0
        // This handles the "missed day reset" rule
        currentStreak = 0;
      }
    }

    // Update streak in database
    const { data: existingStreak } = await supabase
      .from('salah_streaks')
      .select('*')
      .eq('user_id', user.uid)
      .maybeSingle();

    const longestStreak = Math.max(currentStreak, existingStreak?.longest_streak || 0);
    const updateData = {
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_updated: todayStr,
    };

    if (existingStreak) {
      await supabase
        .from('salah_streaks')
        .update(updateData)
        .eq('user_id', user.uid);
    } else {
      await supabase
        .from('salah_streaks')
        .insert({
          user_id: user.uid,
          ...updateData,
        });
    }

    setStreak({
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_updated: todayStr,
    });
  }, [user]);

  const togglePrayer = async (prayerKey: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha') => {
    if (!user) {
      toast.error('Please log in to track prayers');
      return;
    }

    const today = getToday();
    const newValue = !todayLog?.[prayerKey];

    try {
      if (todayLog) {
        // Update existing record
        const { error } = await supabase
          .from('salah_log')
          .update({ [prayerKey]: newValue })
          .eq('id', todayLog.id);

        if (error) throw error;

        setTodayLog({ ...todayLog, [prayerKey]: newValue });
      } else {
        // Create new record
        const newLog = {
          user_id: user.uid,
          date: today,
          fajr: false,
          dhuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
          [prayerKey]: true,
        };

        const { data, error } = await supabase
          .from('salah_log')
          .insert(newLog)
          .select()
          .single();

        if (error) throw error;
        setTodayLog(data);
      }

      // Recalculate streak after update
      await calculateStreak();
      await fetchWeeklyLogs();
      
      toast.success(newValue ? 'Prayer marked as completed' : 'Prayer unmarked');
    } catch (error) {
      console.error('Error updating prayer:', error);
      toast.error('Failed to update prayer status');
    }
  };

  const getWeeklyData = useCallback(() => {
    const today = new Date();
    const days: { date: string; dayName: string; completed: number; total: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      // Use local date format
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const log = weeklyLogs.find(l => l.date === dateStr);
      const completed = log
        ? PRAYER_KEYS.filter(key => log[key]).length
        : 0;

      days.push({ date: dateStr, dayName, completed, total: 5 });
    }

    return days;
  }, [weeklyLogs]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTodayLog(), fetchStreak(), fetchWeeklyLogs()]);
      setLoading(false);
    };

    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, fetchTodayLog, fetchStreak, fetchWeeklyLogs]);

  const completedToday = todayLog
    ? PRAYER_KEYS.filter(key => todayLog[key]).length
    : 0;

  const progressPercentage = Math.round((completedToday / 5) * 100);

  return {
    loading,
    prayerStatus: getPrayerStatus(),
    streak,
    togglePrayer,
    completedToday,
    progressPercentage,
    weeklyData: getWeeklyData(),
  };
};
