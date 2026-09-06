import { Layout } from '@/components/Layout';
import { ShoppingCart, Menu, Store, Bell, CheckCircle2, Sparkles, ShoppingBag, Truck } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { SideMenu } from '@/components/SideMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CREAM = '#FFF5E5';
const BROWN = '#A35233';
const BROWN_DARK = '#5C2A14';
const ACCENT_BROWN = '#B54A22';
const CARD = '#FFF8F0';
const BORDER = '#E8D3AE';

export const Shop = () => {
  const { getTotalItems } = useCart();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleCartClick = () => {
    navigate('/cart');
  };

  const handleNotifyMe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t('shop.coming_soon_invalid_email'));
      return;
    }

    setSubmitting(true);
    try {
      const { error: dbError } = await (supabase as any)
        .from('marketplace_waitlist')
        .insert({ email: trimmed, user_id: user?.id ?? null });

      if (dbError) {
        // Unique constraint violation — user already signed up
        if (dbError.code === '23505') {
          setSubmitted(true);
          return;
        }
        throw dbError;
      }
      setSubmitted(true);
    } catch {
      setError(t('shop.coming_soon_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    { icon: ShoppingBag, labelKey: 'shop.coming_soon_feature_1' },
    { icon: Store, labelKey: 'shop.coming_soon_feature_2' },
    { icon: Truck, labelKey: 'shop.coming_soon_feature_3' },
  ];

  return (
    <Layout showHeader={false} pageBackgroundColor={CREAM}>
      <div className="min-h-screen" style={{ backgroundColor: CREAM }}>
        {/* Top bar */}
        <div className="bg-white px-4 pt-4 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setIsMenuOpen(true)}
              style={{ color: BROWN_DARK }}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold" style={{ color: BROWN_DARK }}>{t('shop.title')}</h1>
          </div>
          <button type="button" onClick={handleCartClick} className="relative" style={{ color: BROWN_DARK }}>
            <ShoppingCart className="h-6 w-6" />
            {getTotalItems() > 0 && (
              <span
                className="absolute -top-1.5 -right-2 text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center text-white"
                style={{ backgroundColor: BROWN }}
              >
                {getTotalItems()}
              </span>
            )}
          </button>
        </div>

        <div className="px-4 pt-8 pb-32">
          {/* Coming Soon Card */}
          <div
            className="w-full rounded-3xl p-6 border"
            style={{ backgroundColor: CARD, borderColor: BORDER, color: BROWN_DARK }}
          >
            {/* Icon + Badge */}
            <div className="flex items-start justify-between gap-4">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: '#F1E0BC', color: BROWN }}
              >
                <Store className="h-7 w-7" />
              </div>
              <span
                className="text-base font-bold"
                style={{ color: ACCENT_BROWN }}
              >
                {t('shop.coming_soon_badge')}
              </span>
            </div>

            {/* Title & Description */}
            <h2 className="text-2xl font-bold leading-tight mt-6">
              {t('shop.coming_soon_title')}
            </h2>
            <p className="text-sm mt-3 leading-relaxed" style={{ color: BROWN_DARK, opacity: 0.75 }}>
              {t('shop.coming_soon_desc')}
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 mt-5">
              {features.map(({ icon: Icon, labelKey }) => (
                <span
                  key={labelKey}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{ backgroundColor: '#F1E0BC', color: BROWN_DARK }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: BROWN }} />
                  {t(labelKey)}
                </span>
              ))}
            </div>

            {/* Divider */}
            <div className="my-6" style={{ borderTop: `1px solid ${BORDER}` }} />

            {/* Email Form / Success */}
            {submitted ? (
              <div
                className="flex items-center gap-3 rounded-2xl p-4"
                style={{ backgroundColor: '#E8F5E9' }}
              >
                <CheckCircle2 className="h-6 w-6 shrink-0" style={{ color: '#2E7D32' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1B5E20' }}>
                    {t('shop.coming_soon_success_title')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#2E7D32' }}>
                    {t('shop.coming_soon_success_desc')}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold mb-3" style={{ color: BROWN_DARK }}>
                  {t('shop.coming_soon_notify_label')}
                </p>
                <form onSubmit={handleNotifyMe} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('shop.coming_soon_email_placeholder')}
                    className="min-w-0 flex-1 rounded-xl px-4 py-3 text-sm border outline-none transition-colors"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: error ? '#E53935' : BORDER,
                      color: BROWN_DARK,
                    }}
                    disabled={submitting}
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full justify-center rounded-xl px-4 py-3 text-sm font-bold text-white flex items-center gap-2 shrink-0 transition-opacity disabled:opacity-60 sm:w-auto"
                    style={{ backgroundColor: ACCENT_BROWN }}
                  >
                    <Bell className="h-4 w-4" />
                    {t('shop.coming_soon_notify_btn')}
                  </button>
                </form>
                {error && (
                  <p className="text-xs mt-2" style={{ color: '#E53935' }}>{error}</p>
                )}
              </>
            )}
          </div>
        </div>
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      </div>
    </Layout>
  );
};
