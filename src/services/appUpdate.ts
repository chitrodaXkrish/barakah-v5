/**
 * appUpdate.ts
 *
 * Google Play In-App Update service for Barakah.
 *
 * Uses @capawesome/capacitor-app-update to trigger Google Play's native
 * In-App Update UI. No custom modal or version-comparison logic is used here;
 * Google Play determines whether an update is available.
 *
 * RELEASE VERSIONING REMINDER:
 *   Every Google Play release MUST have a strictly higher versionCode in
 *   android/app/build.gradle, e.g.:
 *     versionCode 36  → versionName "1.0.36"  (current)
 *     versionCode 37  → versionName "1.0.37"  (next)
 *   Without an increased versionCode, Google Play will not report an update.
 *
 * Update flows:
 *   - Flexible  (default): User can keep using the app while the update
 *     downloads in the background. We complete it once download finishes.
 *   - Immediate (optional, for critical releases): Blocks the UI until the
 *     update is installed. Call startImmediateUpdate() when needed.
 */

import { Capacitor } from '@capacitor/core';
import { AppUpdate, AppUpdateAvailability, FlexibleUpdateInstallStatus } from '@capawesome/capacitor-app-update';

/** Guards: only run on Android where Google Play is present. */
const isAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/**
 * Starts the Flexible In-App Update flow.
 *
 * Behavior:
 *  1. Ask Google Play whether an update is available.
 *  2. If not available, do nothing.
 *  3. If available, start the flexible update (user sees Google Play's bottom
 *     sheet but can continue using the app while it downloads).
 *  4. Listen for download completion and call completeFlexibleUpdate() so
 *     Google Play installs the new version.
 *
 * All errors are caught and logged — the app will never crash because of this.
 */
export async function checkAndStartFlexibleUpdate(): Promise<void> {
  if (!isAndroid()) {
    // Non-Android platform or web — do nothing silently.
    return;
  }

  try {
    const info = await AppUpdate.getAppUpdateInfo();

    if (info.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) {
      // No update available, or Google Play info is not ready — continue normally.
      console.log('[AppUpdate] No update available.');
      return;
    }

    console.log('[AppUpdate] Update available. Starting flexible update flow.');

    // Start the native Google Play flexible update UI.
    await AppUpdate.startFlexibleUpdate();

    // Listen for the download to complete so we can trigger installation.
    await AppUpdate.addListener('onFlexibleUpdateStateChange', (state) => {
      if (state.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
        console.log('[AppUpdate] Flexible update downloaded. Completing installation.');
        // Complete the update — Google Play will restart the app with the new version.
        AppUpdate.completeFlexibleUpdate().catch((err) => {
          console.warn('[AppUpdate] completeFlexibleUpdate failed:', err);
        });
      }
    });
  } catch (err) {
    // Google Play unavailable, app sideloaded, or any other error —
    // log and continue. Never block the user.
    console.warn('[AppUpdate] Flexible update check failed (non-fatal):', err);
  }
}

/**
 * Starts the Immediate In-App Update flow.
 *
 * Use ONLY for critical releases that require the user to update before
 * continuing. The app UI is fully blocked by Google Play's update screen
 * until installation completes.
 *
 * This function is intentionally NOT called automatically. Invoke it
 * manually when a critical release is published.
 */
export async function startImmediateUpdate(): Promise<void> {
  if (!isAndroid()) {
    return;
  }

  try {
    const info = await AppUpdate.getAppUpdateInfo();

    if (info.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) {
      console.log('[AppUpdate] Immediate update requested but no update is available.');
      return;
    }

    console.log('[AppUpdate] Starting immediate update flow.');
    await AppUpdate.performImmediateUpdate();
  } catch (err) {
    console.warn('[AppUpdate] Immediate update failed (non-fatal):', err);
  }
}
