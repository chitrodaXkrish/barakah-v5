import { Capacitor, registerPlugin } from '@capacitor/core';

const PushNotifications = registerPlugin('PushNotifications') as any;

export async function registerForPush() {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Barakah Push] Not a native platform');
    return;
  }

  try {
    // Register listeners BEFORE requesting/registering with APNs.
    await PushNotifications.addListener('registration', (token: any) => {
      console.log('[Barakah Push] Registration success:', token);

      const tokenValue = token?.value || token;

      if (tokenValue) {
        window.dispatchEvent(
          new CustomEvent('pushToken', {
            detail: tokenValue,
          })
        );
      }
    });

    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[Barakah Push] Registration error:', error);

      window.dispatchEvent(
        new CustomEvent('pushRegistrationError', {
          detail: error,
        })
      );
    });

    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: any) => {
        console.log('[Barakah Push] Notification received:', notification);

        window.dispatchEvent(
          new CustomEvent('pushNotificationReceived', {
            detail: notification,
          })
        );
      }
    );

    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: any) => {
        console.log('[Barakah Push] Notification action performed:', action);

        window.dispatchEvent(
          new CustomEvent('pushNotificationAction', {
            detail: action,
          })
        );
      }
    );

    // Request notification permission.
    const permission = await PushNotifications.requestPermissions();

    console.log('[Barakah Push] Permission result:', permission);

    if (
      permission?.receive === 'granted' ||
      permission === 'granted'
    ) {
      console.log('[Barakah Push] Registering with APNs...');
      await PushNotifications.register();
    } else {
      console.warn(
        '[Barakah Push] Notification permission was not granted:',
        permission
      );
    }
  } catch (error) {
    console.error('[Barakah Push] Initialization failed:', error);
  }
}
