import { createRoot } from 'react-dom/client'
import * as amplitude from '@amplitude/unified';
import * as Sentry from '@sentry/capacitor';
import App from './App.tsx'
import './index.css'
import { initializeCapacitorPlugins } from './integrations/capacitor-init'

const amplitudeApiKey = import.meta.env.VITE_AMPLITUDE_API_KEY;
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (!amplitudeApiKey) {
  console.warn('Amplitude API key missing — analytics disabled');
}

if (amplitudeApiKey) {
  amplitude.initAll(amplitudeApiKey, {
    analytics: { autocapture: true },
    sessionReplay: { sampleRate: 1 },
  });
}

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
    enableLogs: true,
  });
} else {
  console.warn('Sentry DSN missing — error monitoring disabled');
}

// Initialize Capacitor plugins (status bar, safe-area handling, etc.)
initializeCapacitorPlugins().catch(err => console.warn('Plugin init error:', err));

createRoot(document.getElementById("root")!).render(<App />);
