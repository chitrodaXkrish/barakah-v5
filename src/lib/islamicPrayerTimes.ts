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
  sunrise: 'SUNRISE',
  fajr: 'FAJR',
  dhuhr: 'DHUHR',
  asr: 'ASR',
  maghrib: 'MAGHRIB',
  isha: 'ISHA',
};

const PRAYER_CACHE_VERSION = 1;
const PRAYER_CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

const prayerCacheKey = (latitude: number, longitude: number, dateParam: string) =>
  `barakah_prayer_times_v${PRAYER_CACHE_VERSION}_${latitude.toFixed(3)}_${longitude.toFixed(3)}_${dateParam}`;

const readPrayerCache = (latitude: number, longitude: number, dateParam: string) => {
  try {
    const raw = localStorage.getItem(prayerCacheKey(latitude, longitude, dateParam));
    if (!raw) return null;
    const entry = JSON.parse(raw) as { version: number; savedAt: number; prayers: AppPrayerTime[] };
    if (
      entry.version !== PRAYER_CACHE_VERSION ||
      !Array.isArray(entry.prayers) ||
      Date.now() - entry.savedAt > PRAYER_CACHE_DURATION_MS
    ) {
      localStorage.removeItem(prayerCacheKey(latitude, longitude, dateParam));
      return null;
    }
    return entry.prayers;
  } catch {
    return null;
  }
};

const writePrayerCache = (
  latitude: number,
  longitude: number,
  dateParam: string,
  prayers: AppPrayerTime[],
) => {
  try {
    localStorage.setItem(
      prayerCacheKey(latitude, longitude, dateParam),
      JSON.stringify({ version: PRAYER_CACHE_VERSION, savedAt: Date.now(), prayers }),
    );
  } catch {
    // Ignore storage failures.
  }
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

  const cached = readPrayerCache(latitude, longitude, dateParam);
  if (cached) return cached;

  if (apiKey) {
    try {
      const prayers = await fetchIslamicApiPrayerTimes(latitude, longitude, dateParam, apiKey);
      writePrayerCache(latitude, longitude, dateParam, prayers);
      return prayers;
    } catch (error) {
      console.warn('Islamic API prayer times failed, using fallback:', error);
    }
  }

  try {
    const prayers = await fetchAlAdhanPrayerTimes(latitude, longitude, date);
    writePrayerCache(latitude, longitude, dateParam, prayers);
    return prayers;
  } catch (error) {
    console.warn('AlAdhan prayer times failed, using local calculation:', error);
    const prayers = calculateLocalPrayerTimes(latitude, longitude, date);
    writePrayerCache(latitude, longitude, dateParam, prayers);
    return prayers;
  }
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

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;
const radiansToDegrees = (radians: number) => (radians * 180) / Math.PI;
const fixHour = (hour: number) => ((hour % 24) + 24) % 24;
const dayOfYear = (date: Date) =>
  Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);

const sunPosition = (date: Date) => {
  const n = dayOfYear(date);
  const gamma = (2 * Math.PI / 365) * (n - 1 + ((12 - 12) / 24));
  const equationOfTime =
    229.18 *
    (
      0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma)
    );
  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  return {
    equationOfTime,
    declination: radiansToDegrees(declination),
  };
};

const hourAngle = (latitude: number, declination: number, angle: number) => {
  const latRad = degreesToRadians(latitude);
  const decRad = degreesToRadians(declination);
  const angleRad = degreesToRadians(angle);
  const value =
    (Math.cos(angleRad) - Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad));

  return radiansToDegrees(Math.acos(Math.min(1, Math.max(-1, value)))) / 15;
};

const asrHourAngle = (latitude: number, declination: number, shadowFactor = 2) => {
  const angle = radiansToDegrees(
    Math.atan(1 / (shadowFactor + Math.tan(Math.abs(degreesToRadians(latitude - declination))))),
  );
  return hourAngle(latitude, declination, 90 - angle);
};

const toPrayer = (key: PrayerKey, hour: number): AppPrayerTime => {
  const normalized = fixHour(hour);
  const h = Math.floor(normalized);
  const m = Math.round((normalized - h) * 60);
  return {
    key,
    label: PRAYER_LABELS[key],
    h: m === 60 ? (h + 1) % 24 : h,
    m: m === 60 ? 0 : m,
  };
};

const calculateLocalPrayerTimes = (latitude: number, longitude: number, date: Date) => {
  const { equationOfTime, declination } = sunPosition(date);
  const timezone = -date.getTimezoneOffset() / 60;
  const dhuhr = fixHour(12 + timezone - longitude / 15 - equationOfTime / 60);
  const sunriseAngle = hourAngle(latitude, declination, 90.833);
  const fajrAngle = hourAngle(latitude, declination, 108);
  const ishaAngle = hourAngle(latitude, declination, 107);

  return [
    toPrayer('fajr', dhuhr - fajrAngle),
    toPrayer('sunrise', dhuhr - sunriseAngle),
    toPrayer('dhuhr', dhuhr),
    toPrayer('asr', dhuhr + asrHourAngle(latitude, declination, 2)),
    toPrayer('maghrib', dhuhr + sunriseAngle),
    toPrayer('isha', dhuhr + ishaAngle),
  ];
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
