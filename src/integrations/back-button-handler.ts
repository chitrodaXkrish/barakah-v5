/**
 * Back button and Capacitor navigation handling
 * Ensures proper back navigation on iOS/Android without interference from native system
 */

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

let backButtonHandler: (() => boolean) | null = null;

/**
 * Register a back button handler
 * Returns a cleanup function to unregister
 * Handler should return true if it handled the back button, false to use default behavior
 */
export const registerBackButtonHandler = (handler: () => boolean) => {
  backButtonHandler = handler;
  return () => {
    backButtonHandler = null;
  };
};

/**
 * Initialize Capacitor back button handling
 * Integrates with React Router's navigation system
 */
export const initializeBackButtonHandling = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Listen for hardware back button on Android / iOS
    await CapacitorApp.addListener('backButton', async (e) => {
      // If a custom handler is registered (e.g., from React Router), use it
      if (backButtonHandler) {
        const handled = backButtonHandler();
        if (handled) {
          return; // Handler took care of it
        }
      }

      // Default behavior: let the browser/app handle it
      // This allows React Router and browser history to work naturally
      // On Android: minimizes the app (default Android behavior)
      // On iOS: this shouldn't trigger the actual hardware button, but we're ready
    });

    console.log('Capacitor back button handling initialized');
  } catch (error) {
    console.warn('Failed to initialize back button handling:', error);
  }
};
