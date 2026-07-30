const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  'Shaban',
  'Ramadan',
  'Shawwal',
  'Dhul Qadah',
  'Dhul Hijjah',
];

const gregorianToJulianDay = (date: Date) => {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();

  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const century = Math.floor(year / 100);
  const leapCorrection = 2 - century + Math.floor(century / 4);

  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    leapCorrection -
    1524.5
  );
};

const islamicToJulianDay = (year: number, month: number, day: number) => {
  const tabularIslamicEpoch = 1948438.5;
  return (
    day +
    Math.ceil(29.5 * (month - 1)) +
    (year - 1) * 354 +
    Math.floor((3 + 11 * year) / 30) +
    tabularIslamicEpoch -
    1
  );
};

/**
 * Formats a Date into a Hijri (Islamic) date string.
 * Example output: "15 Muharram, 1446 AH"
 */
export const formatHijriDate = (date: Date) => {
  const julianDay = Math.floor(gregorianToJulianDay(date)) + 0.5;
  const tabularIslamicEpoch = 1948438.5;
  const year = Math.floor((30 * (julianDay - tabularIslamicEpoch) + 10646) / 10631);
  const month = Math.min(
    12,
    Math.ceil((julianDay - (29 + islamicToJulianDay(year, 1, 1))) / 29.5) + 1
  );
  const day = Math.floor(julianDay - islamicToJulianDay(year, month, 1) + 1);

  return `${day} ${HIJRI_MONTHS[month - 1]}, ${year} AH`;
};

/**
 * Formats a Date into a standard Gregorian date string.
 * Example output: "Monday, July 22, 2024"
 */
export const formatStandardDate = (date: Date) => {
  const str = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return str.replace(/\s*(?:BC|AD|B\.C\.|A\.D\.)\s*$/gi, '').trim();
};


