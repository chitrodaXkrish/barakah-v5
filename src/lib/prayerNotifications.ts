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

const notificationId = (index: number, isReminder: boolean) =>
  7000 + index * 2 + (isReminder ? 0 : 1);

const subtractMinutes = (h: number, m: number, minutes: number) => {
  const total = (h * 60 + m - minutes + 24 * 60) % (24 * 60);
  return {
    h: Math.floor(total / 60),
    m: total % 60,
  };
};

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

export const createPrayerNotificationPreviews = (
  prayers: PrayerNotificationTime[],
  now: Date,
  limit = 6,
) =>
  prayers
    .flatMap((prayer) => {
      const reminder = subtractMinutes(prayer.h, prayer.m, 5);
      const reminderAt = nextDateForTime(reminder.h, reminder.m, now);
      const prayerAt = nextDateForTime(prayer.h, prayer.m, now);

      return [
        {
          id: `${prayer.key}-reminder`,
          title: `${prayer.label} in 5 minutes`,
          body: `It's almost time for ${prayer.label} prayer.`,
          timeLabel: formatPreviewTime(reminderAt, now),
          at: reminderAt,
        },
        {
          id: `${prayer.key}-time`,
          title: `${prayer.label} time`,
          body: `It's time for ${prayer.label} prayer.`,
          timeLabel: formatPreviewTime(prayerAt, now),
          at: prayerAt,
        },
      ];
    })
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

  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Prayer Times',
    description: 'Prayer time reminders and alerts',
    importance: 4,
    visibility: 1,
    vibration: true,
  });

  const ids = prayers.flatMap((_, index) => [
    { id: notificationId(index, true) },
    { id: notificationId(index, false) },
  ]);

  await LocalNotifications.cancel({ notifications: ids });

  const notifications: LocalNotificationSchema[] = prayers.flatMap(
    (prayer, index) => {
      const reminder = subtractMinutes(prayer.h, prayer.m, 5);

      return [
        {
          id: notificationId(index, true),
          title: `${prayer.label} in 5 minutes`,
          body: `It's almost time for ${prayer.label} prayer.`,
          channelId: CHANNEL_ID,
          group: NOTIFICATION_GROUP,
          autoCancel: true,
          schedule: {
            on: { hour: reminder.h, minute: reminder.m },
            repeats: true,
          },
        },
        {
          id: notificationId(index, false),
          title: `${prayer.label} time`,
          body: `It's time for ${prayer.label} prayer.`,
          channelId: CHANNEL_ID,
          group: NOTIFICATION_GROUP,
          autoCancel: true,
          schedule: {
            on: { hour: prayer.h, minute: prayer.m },
            repeats: true,
            allowWhileIdle: true,
          },
        },
      ];
    },
  );

  await LocalNotifications.schedule({ notifications });
  return true;
};
