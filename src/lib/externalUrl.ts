import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

/**
 * iOS WKWebView does not consistently honor `window.open` / `_blank` links.
 * Route iOS native links through SFSafariViewController; preserve the existing
 * Android and browser behavior everywhere else.
 */
export const isIOSNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export const openExternalUrl = async (url: string) => {
  if (isIOSNative()) {
    await Browser.open({ url });
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
};
