import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import * as amplitude from '@amplitude/unified';
import * as Sentry from '@sentry/capacitor';
import App from './App.tsx'
import './index.css'
import { initializeCapacitorPlugins } from './integrations/capacitor-init'

const amplitudeApiKey = import.meta.env.VITE_AMPLITUDE_API_KEY;
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (!amplitudeApiKey) {
  console.warn('Amplitude API key missing - analytics disabled');
}

const getAmplitudePlatform = () => {
  const platform = Capacitor.getPlatform();

  if (platform === 'android') return 'Android';
  if (platform === 'ios') return 'iOS';
  return 'Web';
};

const initAmplitude = async () => {
  if (!amplitudeApiKey) return;

  const capacitorPlatform = Capacitor.getPlatform();
  const amplitudePlatform = getAmplitudePlatform();
  const isNativeApp = Capacitor.isNativePlatform();
  const appInfo = isNativeApp
    ? await CapacitorApp.getInfo().catch(() => null)
    : null;

  amplitude.add({
    name: 'barakah-capacitor-platform',
    type: 'enrichment',
    async execute(event) {
      event.platform = amplitudePlatform;
      event.os_name = amplitudePlatform;
      event.app_version = appInfo?.version;
      event.version_name = appInfo?.version;
      event.event_properties = {
        ...event.event_properties,
        app_platform: amplitudePlatform,
        capacitor_platform: capacitorPlatform,
        is_native_app: isNativeApp,
        app_build: appInfo?.build,
      };

      return event;
    },
  });

  await amplitude.initAll(amplitudeApiKey, {
    analytics: {
      autocapture: true,
      appVersion: appInfo?.version,
      trackingOptions: {
        platform: false,
      },
    },
    sessionReplay: { sampleRate: 1 },
  });

  const identify = new amplitude.Identify()
    .set('app_platform', amplitudePlatform)
    .set('capacitor_platform', capacitorPlatform)
    .set('is_native_app', isNativeApp);

  if (appInfo?.version) identify.set('app_version', appInfo.version);
  if (appInfo?.build) identify.set('app_build', appInfo.build);
  if (appInfo?.id) identify.set('app_id', appInfo.id);
  if (appInfo?.name) identify.set('app_name', appInfo.name);

  amplitude.identify(identify);
};

initAmplitude().catch(err => console.warn('Amplitude init error:', err));

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
    enableLogs: true,
  });
} else {
  console.warn('Sentry DSN missing - error monitoring disabled');
}

// Initialize Capacitor plugins (status bar, safe-area handling, etc.)
initializeCapacitorPlugins().catch(err => console.warn('Plugin init error:', err));

createRoot(document.getElementById("root")!).render(<App />);
