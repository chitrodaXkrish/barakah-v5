import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';
import { supabase } from './supabase/client';

// Use the official Capacitor Push plugin if available
const PushNotifications = registerPlugin('PushNotifications') as any;

export async function registerForPush() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Request permission and register
    const perm = await PushNotifications.requestPermissions();

    if (perm.receive === 'granted' || perm === 'granted') {
      await PushNotifications.register();
    } else {
      console.log('Push permission not granted', perm);
      return;
    }

    // Listen for registration
    PushNotifications.addListener('registration', (token: any) => {
      console.log('Push registration success, token:', token);
      // Emit global event so app can react
      window.dispatchEvent(new CustomEvent('pushToken', { detail: token.value || token }));

      // Optionally send token to your backend / supabase user metadata
      try {
        const user = supabase.auth.getUser ? (supabase.auth.getUser() as any) : null;
        // If using supabase-js v2, get user from auth.getUser()
        // We don't assume a particular API shape here; dispatch event is reliable.
      } catch (e) {
        // swallow
      }
    });

    PushNotifications.addListener('registrationError', (err: any) => {
      console.warn('Push registration error', err);
      window.dispatchEvent(new CustomEvent('pushRegistrationError', { detail: err }));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
      console.log('Push received', notification);
      window.dispatchEvent(new CustomEvent('pushNotificationReceived', { detail: notification }));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
      console.log('Push action performed', action);
      window.dispatchEvent(new CustomEvent('pushNotificationAction', { detail: action }));
    });
  } catch (e) {
    console.warn('Failed to register for push', e);
  }
}
