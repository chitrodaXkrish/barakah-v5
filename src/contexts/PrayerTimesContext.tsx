import { createContext, ReactNode, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGlobalLocation } from '@/contexts/LocationContext';
import {
  type AppPrayerTime,
  fetchIslamicPrayerTimes,
} from '@/lib/islamicPrayerTimes';

interface PrayerTimesContextType {
  prayers: AppPrayerTime[];
  loading: boolean;
  error: string | null;
}

const PrayerTimesContext = createContext<PrayerTimesContextType | undefined>(
  undefined,
);

export const PrayerTimesProvider = ({ children }: { children: ReactNode }) => {
  const { location } = useGlobalLocation();
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const todayKey = new Date().toLocaleDateString('en-CA');

  const query = useQuery({
    queryKey: ['islamic-api-prayer-times', latitude, longitude, todayKey],
    enabled: typeof latitude === 'number' && typeof longitude === 'number',
    queryFn: () => fetchIslamicPrayerTimes(latitude!, longitude!),
    staleTime: 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
  });

  const error =
    query.error instanceof Error
      ? query.error.message
      : query.error
        ? 'Unable to fetch prayer times'
        : null;

  return (
    <PrayerTimesContext.Provider
      value={{
        prayers: query.data ?? [],
        loading: query.isLoading || query.isFetching,
        error,
      }}
    >
      {children}
    </PrayerTimesContext.Provider>
  );
};

export const usePrayerTimes = () => {
  const context = useContext(PrayerTimesContext);

  if (!context) {
    throw new Error('usePrayerTimes must be used within a PrayerTimesProvider');
  }

  return context;
};
