/**
 * usePageAnalytics
 *
 * Fires a Firebase Analytics `screen_view` event on every React Router
 * location change.  Works for both web (Firebase JS SDK) and Capacitor
 * Android (native bridge via AnalyticsWebInterface).
 *
 * Mount this hook inside a component that lives within <BrowserRouter>.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { logAnalyticsEvent } from '../lib/firebase';

/** Maps route path prefixes to human-readable screen names. */
function screenNameFromPath(pathname: string): string {
  if (pathname === '/') return 'Home';
  if (pathname.startsWith('/quran')) return 'Quran';
  if (pathname.startsWith('/hadith')) return 'Hadith';
  if (pathname.startsWith('/prayer-times')) return 'Prayer Times';
  if (pathname.startsWith('/qibla')) return 'Qibla';
  if (pathname.startsWith('/shop/product')) return 'Product Detail';
  if (pathname.startsWith('/shop/categories')) return 'Shop Categories';
  if (pathname.startsWith('/shop')) return 'Shop';
  if (pathname.startsWith('/cart')) return 'Cart';
  if (pathname.startsWith('/checkout')) return 'Checkout';
  if (pathname.startsWith('/order-confirmation')) return 'Order Confirmation';
  if (pathname.startsWith('/seller/orders')) return 'Seller Orders';
  if (pathname.startsWith('/seller/products/new')) return 'Add Product';
  if (pathname.startsWith('/seller/products')) return 'Seller Products';
  if (pathname.startsWith('/seller/earnings')) return 'Seller Earnings';
  if (pathname.startsWith('/seller')) return 'Seller Dashboard';
  if (pathname.startsWith('/places')) return 'Places';
  if (pathname.startsWith('/news')) return 'News';
  if (pathname.startsWith('/forum')) return 'Forum';
  if (pathname.startsWith('/progress')) return 'Progress';
  if (pathname.startsWith('/monthly-streak')) return 'Monthly Streak';
  if (pathname.startsWith('/zakat')) return 'Zakat';
  if (pathname.startsWith('/hajj')) return 'Hajj';
  if (pathname.startsWith('/mood')) return 'Mood';
  if (pathname.startsWith('/halal-scanner')) return 'Halal Scanner';
  if (pathname.startsWith('/makkah-live')) return 'Makkah Live';
  if (pathname.startsWith('/account')) return 'Account';
  if (pathname.startsWith('/login')) return 'Login';
  if (pathname.startsWith('/onboarding')) return 'Onboarding';
  if (pathname.startsWith('/faq')) return 'FAQ';
  if (pathname.startsWith('/about-us')) return 'About Us';
  if (pathname.startsWith('/privacy-policy')) return 'Privacy Policy';
  if (pathname.startsWith('/terms-of-service')) return 'Terms of Service';
  // Fallback: capitalise and clean up the raw path
  return pathname.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';
}

export function usePageAnalytics(): void {
  const location = useLocation();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const { pathname } = location;

    // Skip if the path hasn't actually changed (StrictMode double-fire guard)
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;

    const screenName = screenNameFromPath(pathname);

    logAnalyticsEvent('screen_view', {
      firebase_screen: screenName,
      firebase_screen_class: screenName,
    });
  }, [location]);
}
