import { Layout } from '@/components/Layout';
import { ShoppingCart, Menu, Store, ArrowRight, PackagePlus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { SideMenu } from '@/components/SideMenu';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleCartClick = () => {
    navigate('/cart');
  };

  const openSellerStart = () => {
    navigate('/seller-onboarding');
  };

  return (
    <Layout showHeader={false} pageBackgroundColor={CREAM}>
      <div className="min-h-screen" style={{ backgroundColor: CREAM }}>
        {/* Top bar */}
        <div className="bg-white px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 flex items-center justify-between">
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

        <div className="px-4 pt-10 pb-32">
          <button
            type="button"
            onClick={openSellerStart}
            className="w-full rounded-3xl p-6 text-left border transition-transform active:scale-[0.99]"
            style={{ backgroundColor: CARD, borderColor: BORDER, color: BROWN_DARK }}
          >
            <div className="flex items-start justify-between gap-4">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: '#F1E0BC', color: BROWN }}
              >
                <Store className="h-7 w-7" />
              </div>
              <span
                className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: ACCENT_BROWN, color: '#FFFFFF' }}
              >
                <ArrowRight className="h-5 w-5" />
              </span>
            </div>

            <h2 className="text-3xl font-bold leading-tight mt-6">
              {t('shop.start_selling_title')}
            </h2>
            <p className="text-sm mt-3 leading-relaxed" style={{ color: BROWN_DARK, opacity: 0.75 }}>
              {t('shop.start_selling_desc')}
            </p>

            <div
              className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white"
              style={{ backgroundColor: ACCENT_BROWN }}
            >
              <PackagePlus className="h-4 w-4" />
              {t('shop.start_selling_btn')}
            </div>
          </button>
        </div>
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      </div>
    </Layout>
  );
};
