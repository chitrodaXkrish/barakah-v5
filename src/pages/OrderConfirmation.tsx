import { Layout } from '@/components/Layout';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { ArrowRight, Check } from 'lucide-react';

const CREAM = '#FFF5E5';
const BROWN = '#A35233';
const BROWN_DARK = '#5C2A14';
const OLIVE = '#A35233';

export const OrderConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { items, getTotalPrice } = useCart();
  const navigate = useNavigate();

  const total = getTotalPrice();
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  // Build a summary of ordered items from cart (cart is cleared after navigation, so
  // if we need persistence we could pass state. For now we show a generic summary.)
  const primaryItem = items[0];

  return (
    <Layout showHeader={false} showNavigation={false}>
      <div className="min-h-screen flex flex-col items-center max-w-md mx-auto" style={{ backgroundColor: CREAM }}>
        {/* Top spacer for status bar safe area */}
        <div className="pt-[calc(env(safe-area-inset-top)+2.5rem)]" />

        {/* Brown check circle */}
        <div
          className="h-24 w-24 rounded-full flex items-center justify-center shadow-lg shrink-0"
          style={{ backgroundColor: OLIVE }}
        >
          <Check className="h-12 w-12 text-white stroke-[3]" />
        </div>

        {/* Title */}
        <h1
          className="mt-8 text-4xl italic font-serif text-center"
          style={{ color: BROWN_DARK, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Order placed!
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-center px-8 text-base leading-relaxed" style={{ color: BROWN_DARK, opacity: 0.85 }}>
          Order #{orderId ?? '1042'} confirmed. You'll receive a confirmation shortly.
        </p>

        {/* Product card */}
        <div className="mt-8 px-6 w-full">
          <div className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-sm">
            <div className="h-16 w-16 rounded-full overflow-hidden flex-shrink-0 bg-neutral-200">
              {primaryItem?.image && primaryItem.image !== '/placeholder.svg' ? (
                <img src={primaryItem.image} alt={primaryItem.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#F5E6D0' }}>
                  <span className="text-xs" style={{ color: BROWN, opacity: 0.6 }}>IMG</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base leading-tight truncate" style={{ color: BROWN_DARK }}>
                {primaryItem?.name ?? 'Hajj Essentials Bundle'}
              </p>
              <p className="text-sm mt-0.5" style={{ color: BROWN_DARK, opacity: 0.7 }}>
                × {itemCount} Unit{itemCount !== 1 ? 's' : ''}
              </p>
            </div>
            <p className="font-bold text-base whitespace-nowrap" style={{ color: BROWN }}>
              ${total.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-[2rem]" />

        {/* Bottom actions */}
        <div className="w-full px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] space-y-4">
          <button
            onClick={() => navigate('/orders')}
            className="w-full h-14 rounded-full text-white text-lg font-bold shadow-lg flex items-center justify-center gap-3"
            style={{ backgroundColor: BROWN }}
          >
            <span>Track my order</span>
            <ArrowRight className="h-5 w-5" />
          </button>

          <button
            onClick={() => navigate('/shop')}
            className="w-full h-12 text-sm font-bold tracking-widest uppercase"
            style={{ color: BROWN }}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </Layout>
  );
};
