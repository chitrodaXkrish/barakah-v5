import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from '@capacitor/local-notifications';

export interface PrayerNotificationTime {
  key: string;
  label: string;
  h: number;
  m: number;
}

export interface PrayerNotificationPreview {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  at: Date;
}

const CHANNEL_ID = 'prayer-times';
const NOTIFICATION_GROUP = 'barakah-prayer-times';
const MAX_PRAYER_NOTIFICATION_SLOTS = 6;
const PRE_PRAYER_MINUTES = 5;
const AFTER_PRAYER_MINUTES = 30;
const TAHAJJUD_BEFORE_FAJR_MINUTES = 90;
const STRICT_NOTIFICATION_WINDOW_MS = 2 * 60 * 1000;

type NotificationKind = 'pre' | 'time' | 'after';

const notificationId = (index: number, kind: NotificationKind) =>
  7000 + index * 3 + (kind === 'pre' ? 0 : kind === 'time' ? 1 : 2);

const tahajjudNotificationId = 7999;

const notificationIdsForSlots = (slotCount: number) => [
  ...Array.from({ length: slotCount }).flatMap((_, index) => [
    { id: notificationId(index, 'pre') },
    { id: notificationId(index, 'time') },
    { id: notificationId(index, 'after') },
  ]),
  { id: tahajjudNotificationId },
];

const shiftMinutes = (h: number, m: number, deltaMinutes: number) => {
  const total = (h * 60 + m + deltaMinutes + 24 * 60) % (24 * 60);
  return {
    h: Math.floor(total / 60),
    m: total % 60,
  };
};

const subtractMinutes = (h: number, m: number, minutes: number) =>
  shiftMinutes(h, m, -minutes);

const nextDateForTime = (h: number, m: number, now: Date) => {
  const next = new Date(now);
  next.setHours(h, m, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
};

const formatPreviewTime = (date: Date, now: Date) => {
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const time = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
};

const dailyScheduleAt = (h: number, m: number, allowWhileIdle = false) => ({
  on: {
    hour: h,
    minute: m,
    second: 0,
  },
  ...(allowWhileIdle ? { allowWhileIdle: true } : {}),
});

const notificationExtraFor = (
  prayer: PrayerNotificationTime | { key: string; label: string },
  kind: NotificationKind | 'tahajjud',
  h: number,
  m: number,
) => ({
  source: 'barakah-prayer-times',
  prayerKey: prayer.key,
  prayerLabel: prayer.label,
  kind,
  scheduledMinuteOfDay: h * 60 + m,
  strictWindowMs: STRICT_NOTIFICATION_WINDOW_MS,
});

const prayerCopy = {
  fajr: {
    pre: {
      title: '🌙 FAJR',
      body: "Wake up for what your heart needs. 🌄\nFajr is almost here. Hayya 'alal-falah.",
    },
    time: {
      title: '🌙 FAJR',
      body: "Your morning starts now. 🌙\nIt's time for Fajr.",
    },
  },
  dhuhr: {
    pre: {
      title: '☀️ ZUHR',
      body: 'Your dunya can wait a few minutes. ⏳\nZuhr is coming. Make time for Allah.',
    },
    time: {
      title: '☀️ ZUHR',
      body: "Pause the dunya. ⏸️\nIt's time for Zuhr.",
    },
  },
  asr: {
    pre: {
      title: '🌤️ ASR',
      body: 'Before the day gets away from you... 🌅\nTurn back to Allah with Asr.',
    },
    time: {
      title: '🌤️ ASR',
      body: 'A few minutes for Allah. ☝🏻\nMake time for Asr.',
    },
  },
  maghrib: {
    pre: {
      title: '🌅 MAGHRIB',
      body: 'As the day closes, remember Who gave it to you. 🌟\nMaghrib is almost here.',
    },
    time: {
      title: '🌅 MAGHRIB',
      body: "The sun has set. 🌙\nIt's time for Maghrib.",
    },
  },
  isha: {
    pre: {
      title: '🌙 ISHA',
      body: 'You made it through today. Say Alhamdulillah. ☝🏻\nNow get ready for Isha.',
    },
    time: {
      title: '🌙 ISHA',
      body: 'Put the day down for a moment. 🤍\nIsha time is here.',
    },
  },
} as const;

const afterPrayerCopy = {
  title: 'Mark as done / Streak',
  body: 'Another salah, another step. 🌟\nMark it done. Keep your streak going.',
};

const tahajjudCopy = {
  title: '🌙 Tahajjud: Set your Alarm',
  body: 'Got something on your heart? ❤️‍🩹\nTake it to Allah in Tahajjud.',
};

const notificationCopyFor = (
  prayer: PrayerNotificationTime,
  kind: NotificationKind,
) => {
  const key = prayer.key.toLowerCase() as keyof typeof prayerCopy;
  if (kind === 'after') return afterPrayerCopy;
  return prayerCopy[key]?.[kind] ?? {
    title: kind === 'pre' ? `${prayer.label} in ${PRE_PRAYER_MINUTES} minutes` : `${prayer.label} time`,
    body: kind === 'pre'
      ? `It's almost time for ${prayer.label} prayer.`
      : `It's time for ${prayer.label} prayer.`,
  };
};

export const createPrayerNotificationPreviews = (
  prayers: PrayerNotificationTime[],
  now: Date,
  limit = 6,
) =>
  prayers
    .flatMap((prayer) => {
      const reminder = subtractMinutes(prayer.h, prayer.m, PRE_PRAYER_MINUTES);
      const reminderAt = nextDateForTime(reminder.h, reminder.m, now);
      const prayerAt = nextDateForTime(prayer.h, prayer.m, now);
      const afterTime = shiftMinutes(prayer.h, prayer.m, AFTER_PRAYER_MINUTES);
      const after = nextDateForTime(afterTime.h, afterTime.m, now);
      const preCopy = notificationCopyFor(prayer, 'pre');
      const timeCopy = notificationCopyFor(prayer, 'time');

      return [
        {
          id: `${prayer.key}-reminder`,
          title: preCopy.title,
          body: preCopy.body,
          timeLabel: formatPreviewTime(reminderAt, now),
          at: reminderAt,
        },
        {
          id: `${prayer.key}-time`,
          title: timeCopy.title,
          body: timeCopy.body,
          timeLabel: formatPreviewTime(prayerAt, now),
          at: prayerAt,
        },
        {
          id: `${prayer.key}-after`,
          title: afterPrayerCopy.title,
          body: afterPrayerCopy.body,
          timeLabel: formatPreviewTime(after, now),
          at: after,
        },
      ];
    })
    .concat((() => {
      const fajr = prayers.find((prayer) => prayer.key.toLowerCase() === 'fajr');
      if (!fajr) return [];
      const tahajjud = subtractMinutes(fajr.h, fajr.m, TAHAJJUD_BEFORE_FAJR_MINUTES);
      const tahajjudAt = nextDateForTime(tahajjud.h, tahajjud.m, now);
      return [{
        id: 'tahajjud-alarm',
        title: tahajjudCopy.title,
        body: tahajjudCopy.body,
        timeLabel: formatPreviewTime(tahajjudAt, now),
        at: tahajjudAt,
      }];
    })())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, limit);

export const schedulePrayerNotifications = async (
  prayers: PrayerNotificationTime[],
) => {
  if (!Capacitor.isNativePlatform()) return false;

  const displayPermission = await LocalNotifications.checkPermissions();
  const permission =
    displayPermission.display === 'granted'
      ? displayPermission
      : await LocalNotifications.requestPermissions();

  if (permission.display !== 'granted') return false;

  if (Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Prayer Times',
      description: 'Prayer time reminders and alerts',
      importance: 4,
      visibility: 1,
      vibration: true,
    });
  }

  await LocalNotifications.cancel({
    notifications: notificationIdsForSlots(
      Math.max(prayers.length, MAX_PRAYER_NOTIFICATION_SLOTS),
    ),
  });

  const notifications: LocalNotificationSchema[] = prayers.flatMap(
    (prayer, index) => {
      const reminder = subtractMinutes(prayer.h, prayer.m, PRE_PRAYER_MINUTES);
      const after = shiftMinutes(prayer.h, prayer.m, AFTER_PRAYER_MINUTES);
      const preCopy = notificationCopyFor(prayer, 'pre');
      const timeCopy = notificationCopyFor(prayer, 'time');

      return [
        {
          id: notificationId(index, 'pre'),
          title: preCopy.title,
          body: preCopy.body,
          channelId: CHANNEL_ID,
          group: NOTIFICATION_GROUP,
          autoCancel: true,
          schedule: dailyScheduleAt(reminder.h, reminder.m),
          extra: notificationExtraFor(prayer, 'pre', reminder.h, reminder.m),
        },
        {
          id: notificationId(index, 'time'),
          title: timeCopy.title,
          body: timeCopy.body,
          channelId: CHANNEL_ID,
          group: NOTIFICATION_GROUP,
          autoCancel: true,
          schedule: dailyScheduleAt(prayer.h, prayer.m, true),
          extra: notificationExtraFor(prayer, 'time', prayer.h, prayer.m),
        },
        {
          id: notificationId(index, 'after'),
          title: afterPrayerCopy.title,
          body: afterPrayerCopy.body,
          channelId: CHANNEL_ID,
          group: NOTIFICATION_GROUP,
          autoCancel: true,
          schedule: dailyScheduleAt(after.h, after.m),
          extra: notificationExtraFor(prayer, 'after', after.h, after.m),
        },
      ];
    },
  );

  const fajr = prayers.find((prayer) => prayer.key.toLowerCase() === 'fajr');
  if (fajr) {
    const tahajjud = subtractMinutes(fajr.h, fajr.m, TAHAJJUD_BEFORE_FAJR_MINUTES);
    notifications.push({
      id: tahajjudNotificationId,
      title: tahajjudCopy.title,
      body: tahajjudCopy.body,
      channelId: CHANNEL_ID,
      group: NOTIFICATION_GROUP,
      autoCancel: true,
      schedule: dailyScheduleAt(tahajjud.h, tahajjud.m, true),
      extra: notificationExtraFor(
        { key: 'tahajjud', label: 'Tahajjud' },
        'tahajjud',
        tahajjud.h,
        tahajjud.m,
      ),
    });
  }

  await LocalNotifications.schedule({ notifications });
  return true;
};

export const cancelPrayerNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return false;

  await LocalNotifications.cancel({
    notifications: notificationIdsForSlots(MAX_PRAYER_NOTIFICATION_SLOTS),
  });

  return true;
};
