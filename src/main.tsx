import { createRoot } from 'react-dom/client'
import * as amplitude from '@amplitude/unified';
import App from './App.tsx'
import './index.css'
import { initializeCapacitorPlugins } from './integrations/capacitor-init'

const amplitudeApiKey = import.meta.env.VITE_AMPLITUDE_API_KEY;

if (!amplitudeApiKey) {
  console.warn('Amplitude API key missing — analytics disabled');
}

if (amplitudeApiKey) {
  amplitude.initAll(amplitudeApiKey, {
    analytics: { autocapture: true },
    sessionReplay: { sampleRate: 1 },
  });
}

// Initialize Capacitor plugins (status bar, safe-area handling, etc.)
initializeCapacitorPlugins().catch(err => console.warn('Plugin init error:', err));

createRoot(document.getElementById("root")!).render(<App />);
