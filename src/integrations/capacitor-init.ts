/**
 * Initialize Capacitor and configure native settings
 * This runs on app startup to ensure proper safe-area handling across iOS and Android
 *
 * The main configuration is done via CSS using env(safe-area-inset-*) variables,
 * which automatically respects the system status bar and notches.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Configure the app for proper safe-area handling
 * The CSS in index.css applies safe-area insets to the body element,
 * ensuring content never renders underneath the system status bar
 */
export const initializeCapacitorPlugins = async () => {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const platform = Capacitor.getPlatform();

    if (platform === 'ios' || platform === 'android') {
      // Status bar configuration is handled via:
      // 1. CSS safe-area insets (index.css) - prevents content overlap
      // 2. Capacitor config (capacitor.config.ts) - native settings
      // 3. viewport-fit=cover in index.html - enables notch support
      
      console.log(`Capacitor app initialized on ${platform}`);
      console.log('Safe-area insets are applied via CSS env() variables');
    }
  } catch (error) {
    console.warn('Capacitor initialization warning:', error);
    // Don't break the app if initialization fails
  }
};

