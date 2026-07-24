export type PrayerKey = 'sunrise' | 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface AppPrayerTime {
  key: PrayerKey;
  label: string;
  h: number;
  m: number;
}

interface IslamicPrayerTimeResponse {
  code: number;
  status: string;
  message?: string;
  data?: {
    times?: Record<string, string>;
  };
}

interface AlAdhanPrayerTimeResponse {
  code: number;
  status: string;
  data?: {
    timings?: Record<string, string>;
  };
}

const PRAYER_LABELS: Record<PrayerKey, string> = {
  sunrise: 'Sunrise',
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

const parsePrayerTime = (value?: string) => {
  if (!value) return null;

  const trimmed = value.trim();
  const meridiem = trimmed.match(/\b(am|pm)\b/i)?.[1]?.toLowerCase();
  const time = trimmed.split(' ')[0];
  const [hour, minute] = time.split(':').map(Number);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  let normalizedHour = hour;
  if (meridiem === 'pm' && normalizedHour < 12) normalizedHour += 12;
  if (meridiem === 'am' && normalizedHour === 12) normalizedHour = 0;

  return { h: normalizedHour, m: minute };
};

export const fetchIslamicPrayerTimes = async (
  latitude: number,
  longitude: number,
  date = new Date(),
) => {
  const apiKey = import.meta.env.VITE_ISLAMIC_API_KEY?.trim();
  const dateParam = [
    date.getFullYear(),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getDate().toString().padStart(2, '0'),
  ].join('-');

  if (apiKey) {
    try {
      return await fetchIslamicApiPrayerTimes(latitude, longitude, dateParam, apiKey);
    } catch (error) {
      console.warn('Islamic API prayer times failed, using fallback:', error);
    }
  }

  return fetchAlAdhanPrayerTimes(latitude, longitude, date);
};

const mapTimings = (timings: Record<string, string>) => {
  const keys: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const sourceKeys: Record<PrayerKey, string> = {
    sunrise: 'Sunrise',
    fajr: 'Fajr',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
  };

  return keys.map((key) => {
    const parsed = parsePrayerTime(timings[sourceKeys[key]]);

    if (!parsed) {
      throw new Error(`Missing ${PRAYER_LABELS[key]} prayer time`);
    }

    return {
      key,
      label: PRAYER_LABELS[key],
      h: parsed.h,
      m: parsed.m,
    };
  });
};

const fetchIslamicApiPrayerTimes = async (
  latitude: number,
  longitude: number,
  dateParam: string,
  apiKey: string,
) => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    date: dateParam,
    method: '3',
    school: '1',
    api_key: apiKey,
  });

  const response = await fetch(
    `https://islamicapi.com/api/v1/prayer-time/?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Unable to fetch prayer times');
  }

  const data = (await response.json()) as IslamicPrayerTimeResponse;
  const timings = data.data?.times;

  if (data.code !== 200 || data.status !== 'success' || !timings) {
    throw new Error(data.message || 'Prayer time data was not available');
  }

  return mapTimings(timings);
};

const fetchAlAdhanPrayerTimes = async (
  latitude: number,
  longitude: number,
  date: Date,
) => {
  const dateParam = [
    date.getDate().toString().padStart(2, '0'),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getFullYear(),
  ].join('-');
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    method: '3',
    school: '1',
  });

  const response = await fetch(
    `https://api.aladhan.com/v1/timings/${dateParam}?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Unable to fetch prayer times');
  }

  const data = (await response.json()) as AlAdhanPrayerTimeResponse;
  const timings = data.data?.timings;

  if (data.code !== 200 || data.status !== 'OK' || !timings) {
    throw new Error('Prayer time data was not available');
  }

  return mapTimings(timings);
};

export const prayerMinutes = (prayer: Pick<AppPrayerTime, 'h' | 'm'>) =>
  prayer.h * 60 + prayer.m;

export const getNextPrayer = (
  prayers: AppPrayerTime[],
  now = new Date(),
  includeSunrise = false,
) => {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const orderedPrayers = includeSunrise
    ? prayers
    : prayers.filter((prayer) => prayer.key !== 'sunrise');

  return (
    orderedPrayers.find((prayer) => prayerMinutes(prayer) > currentMinutes) ||
    orderedPrayers[0] ||
    null
  );
};

export const formatPrayerTime12 = (prayer: Pick<AppPrayerTime, 'h' | 'm'>) => {
  const ampm = prayer.h >= 12 ? 'pm' : 'am';
  const hour = ((prayer.h + 11) % 12) + 1;
  return `${hour}:${prayer.m.toString().padStart(2, '0')} ${ampm}`;
};

export const formatPrayerTime24 = (prayer: Pick<AppPrayerTime, 'h' | 'm'>) =>
  `${prayer.h.toString().padStart(2, '0')}:${prayer.m
    .toString()
    .padStart(2, '0')}`;
