import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeCapacitorPlugins } from './integrations/capacitor-init'
import { initializeBackButtonHandling } from './integrations/back-button-handler'

// Initialize Capacitor plugins (status bar, safe-area handling, etc.)
initializeCapacitorPlugins().catch(err => console.warn('Plugin init error:', err));

// Initialize back button handling for Capacitor
initializeBackButtonHandling().catch(err => console.warn('Back button init error:', err));

createRoot(document.getElementById("root")!).render(<App />);
