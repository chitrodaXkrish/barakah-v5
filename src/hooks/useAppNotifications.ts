import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface AppNotificationItem {
  id: string;
  title: string;
  body: string;
  receivedAt: number;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const STRICT_EARLY_TOLERANCE_MS = 30 * 1000;

export const formatNotificationTimeLabel = (receivedAt: number, nowDate: Date = new Date()) => {
  const diffSeconds = Math.max(0, Math.floor((nowDate.getTime() - receivedAt) / 1000));
  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return new Date(receivedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const useAppNotifications = () => {
  const { user } = useAuth();
  const userId = user?.uid || 'guest';

  const loginTimeKey = `barakah_login_time_${userId}`;
  const notificationsKey = `barakah_user_notifications_${userId}`;

  // Get or initialize login timestamp for the current user/session
  const getLoginTime = useCallback((): number => {
    let stored = localStorage.getItem(loginTimeKey);
    if (!stored) {
      const now = Date.now();
      localStorage.setItem(loginTimeKey, now.toString());
      return now;
    }
    const parsed = parseInt(stored, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
  }, [loginTimeKey]);

  // Load notifications received AFTER user login time and within the 24-hour window
  const loadNotifications = useCallback((): AppNotificationItem[] => {
    const loginTime = getLoginTime();
    const cutoff = Math.max(loginTime, Date.now() - TWENTY_FOUR_HOURS_MS);

    try {
      const raw = localStorage.getItem(notificationsKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const valid = parsed.filter(
        (item): item is AppNotificationItem =>
          typeof item?.id === 'string' &&
          typeof item?.title === 'string' &&
          typeof item?.body === 'string' &&
          typeof item?.receivedAt === 'number' &&
          item.receivedAt >= cutoff,
      );

      // Save purged/filtered version back to storage
      localStorage.setItem(notificationsKey, JSON.stringify(valid));
      return valid.sort((a, b) => b.receivedAt - a.receivedAt);
    } catch {
      return [];
    }
  }, [getLoginTime, notificationsKey]);

  const [notifications, setNotifications] = useState<AppNotificationItem[]>(loadNotifications);

  const isExpiredStrictNotification = useCallback((rawNotif: any) => {
    const notification = rawNotif?.notification || rawNotif;
    const extra = notification?.extra || notification?.data || rawNotif?.extra || rawNotif?.data;

    if (extra?.source !== 'barakah-prayer-times') return false;

    const scheduledMinuteOfDay = Number(extra.scheduledMinuteOfDay);
    const strictWindowMs = Number(extra.strictWindowMs);
    if (!Number.isFinite(scheduledMinuteOfDay) || !Number.isFinite(strictWindowMs)) return false;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const scheduledTimes = [-1, 0, 1].map((dayOffset) => (
      todayStart.getTime() +
      dayOffset * TWENTY_FOUR_HOURS_MS +
      scheduledMinuteOfDay * 60 * 1000
    ));
    const nowMs = now.getTime();

    return !scheduledTimes.some((scheduledAt) => (
      nowMs >= scheduledAt - STRICT_EARLY_TOLERANCE_MS &&
      nowMs <= scheduledAt + strictWindowMs
    ));
  }, []);

  // Reload when user changes or session starts
  useEffect(() => {
    setNotifications(loadNotifications());
  }, [loadNotifications, userId]);

  // Add a newly received notification
  const addNotification = useCallback(
    (rawNotif: any) => {
      if (!rawNotif) return;
      if (isExpiredStrictNotification(rawNotif)) return;

      const notification = rawNotif.notification || rawNotif;
      const title = notification.title || rawNotif.title;
      const body = notification.body || rawNotif.body;

      if (!title && !body) return;

      const loginTime = getLoginTime();
      const now = Date.now();

      // Ignore notifications received before login
      if (now < loginTime) return;

      const id = String(
        notification.id || notification.tag || rawNotif.id || `${now}-${Math.random().toString(36).substring(2, 7)}`,
      );

      const newItem: AppNotificationItem = {
        id,
        title: String(title || 'Notification'),
        body: String(body || ''),
        receivedAt: now,
      };

      setNotifications((current) => {
        const cutoff = Math.max(loginTime, now - TWENTY_FOUR_HOURS_MS);
        const filtered = current.filter((item) => item.id !== newItem.id && item.receivedAt >= cutoff);
        const updated = [newItem, ...filtered].sort((a, b) => b.receivedAt - a.receivedAt);
        localStorage.setItem(notificationsKey, JSON.stringify(updated));
        return updated;
      });
    },
    [getLoginTime, isExpiredStrictNotification, notificationsKey],
  );

  // Listen to window & native notification events
  useEffect(() => {
    const handleEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) addNotification(detail);
    };

    window.addEventListener('pushNotificationReceived', handleEvent);
    window.addEventListener('pushNotificationAction', handleEvent);
    window.addEventListener('barakahNotificationReceived', handleEvent);

    let localReceivedHandle: { remove: () => Promise<void> } | undefined;
    let localActionHandle: { remove: () => Promise<void> } | undefined;

    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        addNotification(notification);
      }).then((h) => {
        localReceivedHandle = h;
      });

      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        addNotification(action.notification || action);
      }).then((h) => {
        localActionHandle = h;
      });
    }

    return () => {
      window.removeEventListener('pushNotificationReceived', handleEvent);
      window.removeEventListener('pushNotificationAction', handleEvent);
      window.removeEventListener('barakahNotificationReceived', handleEvent);
      localReceivedHandle?.remove();
      localActionHandle?.remove();
    };
  }, [addNotification]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(notificationsKey);
  }, [notificationsKey]);

  return {
    notifications,
    addNotification,
    clearNotifications,
  };
};
