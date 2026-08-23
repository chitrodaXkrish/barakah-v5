/**
 * Firebase Analytics — platform-aware implementation.
 *
 * Strategy:
 *  - Web / PWA:           Firebase JS SDK (getAnalytics) sends events directly.
 *  - Capacitor Android:   Events are forwarded via the native JavascriptInterface
 *                         (window.AnalyticsWebInterface) to the Android
 *                         FirebaseAnalytics SDK.  The JS SDK is NOT initialised on
 *                         Android to avoid duplicate events.
 *
 * Nothing here touches Supabase Auth, Google Sign-In, deep links, Amplitude, or Sentry.
 */

import { Capacitor } from '@capacitor/core';

// ─── Types ───────────────────────────────────────────────────────────────────

type EventParams = Record<string, string | number | boolean>;

/** Shape of the native JavascriptInterface registered by MainActivity. */
interface AnalyticsWebInterface {
  logEvent(name: string, jsonParams: string): void;
  setUserProperty(name: string, value: string): void;
}

declare global {
  interface Window {
    AnalyticsWebInterface?: AnalyticsWebInterface;
  }
}

// ─── Platform detection ───────────────────────────────────────────────────────

const isAndroidNative =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

// ─── Web SDK (web / PWA only) ─────────────────────────────────────────────────

let webLogEvent: ((name: string, params?: EventParams) => void) | null = null;
let webSetUserId: ((id: string | null) => void) | null = null;

if (!isAndroidNative) {
  // Lazily import Firebase SDK so it is never bundled on Android builds
  // that don't need it.  The dynamic import is resolved at runtime.
  (async () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;

    if (!apiKey || !measurementId) {
      console.warn('[Analytics] Firebase web config missing — web analytics disabled');
      return;
    }

    try {
      const { initializeApp, getApps } = await import('firebase/app');
      const { getAnalytics, logEvent, setUserId, isSupported } = await import('firebase/analytics');

      // Only initialise once (handles HMR / Strict Mode double-invocation)
      const existingApps = getApps();
      const app =
        existingApps.length > 0
          ? existingApps[0]
          : initializeApp({
              apiKey,
              authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
              projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
              storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
              messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
              appId: import.meta.env.VITE_FIREBASE_APP_ID,
              measurementId,
            });

      const supported = await isSupported();
      if (!supported) {
        console.warn('[Analytics] Firebase Analytics not supported in this environment');
        return;
      }

      const analytics = getAnalytics(app);

      webLogEvent = (name, params) => logEvent(analytics, name, params);
      webSetUserId = (id) => setUserId(analytics, id);

      console.log('[Analytics] Firebase web analytics initialised');
    } catch (err) {
      console.warn('[Analytics] Firebase init error:', err);
    }
  })();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Log a Firebase Analytics event.
 *
 * On Android (Capacitor WebView): delegates to the native AnalyticsWebInterface.
 * On Web / PWA:                   uses the Firebase JS SDK.
 */
export function logAnalyticsEvent(name: string, params: EventParams = {}): void {
  try {
    if (isAndroidNative) {
      if (window.AnalyticsWebInterface) {
        window.AnalyticsWebInterface.logEvent(name, JSON.stringify(params));
      }
      // If the bridge is not yet available (e.g. very early startup), silently skip.
      return;
    }

    // Web / PWA path — webLogEvent is set asynchronously after init
    webLogEvent?.(name, params);
  } catch (err) {
    // Never let analytics errors affect the app
    console.warn('[Analytics] logEvent error:', err);
  }
}

/**
 * Associate subsequent events with a user ID (Supabase user UUID).
 * Call this after a successful sign-in; pass null on sign-out.
 */
export function setAnalyticsUserId(userId: string | null): void {
  try {
    if (isAndroidNative) {
      if (window.AnalyticsWebInterface && userId) {
        // Forward user ID as a user property via the bridge
        window.AnalyticsWebInterface.setUserProperty('user_id', userId);
      }
      return;
    }

    webSetUserId?.(userId);
  } catch (err) {
    console.warn('[Analytics] setUserId error:', err);
  }
}
