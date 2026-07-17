import { Layout } from '@/components/Layout';
import { useCart } from '@/contexts/CartContext';
import { ArrowLeft, HelpCircle, ShieldCheck, ShoppingBag, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { getSelectedAddress, ShippingAddress } from '@/lib/addresses';

const CREAM = '#FFF5E5';
const BROWN = '#A35233';
const BROWN_DARK = '#5C2A14';

type Card = {
  id: string;
  brand: string;
  last4: string;
};

const DEFAULT_CARDS: Card[] = [
  { id: 'c1', brand: 'Mastercard', last4: '3947' },
  { id: 'c2', brand: 'Mastercard', last4: '3947' },
  { id: 'c3', brand: 'Mastercard', last4: '3947' },
];

export const Checkout = () => {
  const { items, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string>(DEFAULT_CARDS[0].id);
  const [changingCard, setChangingCard] = useState(false);
  const [address, setAddress] = useState<ShippingAddress | null>(null);

  useEffect(() => {
    setAddress(getSelectedAddress());
  }, []);

  const subtotal = getTotalPrice();
  const shipping = subtotal > 0 ? 15 : 0;
  const total = subtotal + shipping;

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error('Please login to checkout');
      navigate('/login');
      return;
    }
    setProcessing(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({ user_id: user.uid, total_amount: total, status: 'pending' })
        .select()
        .single();
      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/order-confirmation/${orderData.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout showHeader={false} showNavigation={false}>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: CREAM }}>
        {/* Header */}
        <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between">
          <button onClick={() => navigate('/cart')} className="flex items-center gap-2" style={{ color: BROWN_DARK }}>
            <span className="h-9 w-9 rounded-full border flex items-center justify-center" style={{ borderColor: BROWN_DARK }}>
              <ArrowLeft className="h-4 w-4" />
            </span>
            <span className="text-base font-bold">Checkout</span>
          </button>
          <button className="h-9 w-9 rounded-full border flex items-center justify-center" style={{ borderColor: BROWN_DARK, color: BROWN_DARK }}>
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 px-4 pt-5 pb-32 space-y-6 overflow-y-auto">
          {/* Expected Delivery */}
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="font-semibold" style={{ color: BROWN_DARK }}>Expected Delivery</span>
              <span className="italic text-sm" style={{ color: BROWN_DARK, opacity: 0.7 }}>4–5 Business Days…</span>
            </div>
            <div className="h-[2px] w-full" style={{ backgroundColor: BROWN_DARK }} />
          </div>

          {/* Shipping address */}
          <div>
            <h3 className="text-base font-bold mb-3" style={{ color: BROWN_DARK }}>Shipping address</h3>
            {address ? (
              <div className="bg-white rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold" style={{ color: BROWN_DARK }}>{address.fullName}</p>
                  <button onClick={() => navigate('/shipping-address')} className="font-semibold text-sm" style={{ color: BROWN }}>
                    Change
                  </button>
                </div>
                <p className="text-sm mt-1" style={{ color: BROWN_DARK, opacity: 0.85 }}>{address.address}</p>
                <p className="text-sm" style={{ color: BROWN_DARK, opacity: 0.85 }}>
                  {address.city}, {address.state} {address.zip}, {address.country}
                </p>
              </div>
            ) : (
              <button
                onClick={() => navigate('/shipping-address/new')}
                className="w-full bg-white rounded-2xl p-4 text-left"
                style={{ color: BROWN }}
              >
                <p className="font-bold">+ Add shipping address</p>
                <p className="text-xs mt-1" style={{ color: BROWN_DARK, opacity: 0.7 }}>
                  You haven't added an address yet.
                </p>
              </button>
            )}
          </div>

          {/* Payment */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold" style={{ color: BROWN_DARK }}>Payment</h3>
              <button onClick={() => setChangingCard(v => !v)} className="font-semibold text-sm" style={{ color: BROWN }}>
                Change
              </button>
            </div>
            <div className="space-y-3">
              {DEFAULT_CARDS.map((card) => {
                const selected = selectedCard === card.id;
                const disabled = !changingCard && !selected;
                return (
                  <button
                    key={card.id}
                    onClick={() => { setSelectedCard(card.id); setChangingCard(false); }}
                    disabled={disabled}
                    className="w-full flex items-center gap-3"
                  >
                    <div className="h-12 w-16 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <div className="flex items-center">
                        <span className="h-5 w-5 rounded-full bg-red-500" />
                        <span className="h-5 w-5 rounded-full bg-yellow-500 -ml-2" />
                      </div>
                    </div>
                    <span className="flex-1 text-left tracking-widest text-sm" style={{ color: BROWN_DARK }}>
                      **** **** **** {card.last4}
                    </span>
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: selected ? BROWN : '#D9D9D9' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-3xl overflow-hidden">
            <div className="p-5 space-y-4">
              <h3 className="text-lg font-bold" style={{ color: BROWN_DARK }}>Summary</h3>

              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full overflow-hidden flex-shrink-0 bg-neutral-200">
                    {item.image && item.image !== '/placeholder.svg' ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#F5E6D0' }}>
                        <ShoppingBag className="h-5 w-5" style={{ color: BROWN, opacity: 0.5 }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold leading-tight" style={{ color: BROWN_DARK }}>{item.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: BROWN_DARK, opacity: 0.7 }}>Standard Kit × {item.quantity}</p>
                  </div>
                  <p className="font-bold whitespace-nowrap" style={{ color: BROWN }}>${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}

              <div className="border-t pt-3 space-y-2" style={{ borderColor: `${BROWN_DARK}15` }}>
                <div className="flex justify-between text-sm" style={{ color: BROWN_DARK, opacity: 0.85 }}>
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: BROWN_DARK, opacity: 0.85 }}>
                  <span>Shipping (Premium Express)</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-bold text-lg" style={{ color: BROWN_DARK }}>Total</span>
                  <span className="font-bold text-lg" style={{ color: BROWN }}>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 flex items-center justify-center gap-2" style={{ backgroundColor: '#FFF3C4' }}>
              <ShieldCheck className="h-4 w-4" style={{ color: BROWN }} />
              <span className="text-xs font-bold tracking-wider" style={{ color: BROWN }}>
                SECURED BY BARAKAH-SHIELD ENCRYPTION
              </span>
            </div>
          </div>
        </div>

        {/* Place Order */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 pt-3 bg-gradient-to-t from-[#FFF5E5] via-[#FFF5E5]/95 to-transparent">
          <button
            onClick={handlePlaceOrder}
            disabled={processing}
            className="w-full h-14 rounded-full text-white text-lg font-bold shadow-lg flex items-center justify-center gap-3 disabled:opacity-70"
            style={{ backgroundColor: BROWN }}
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <span>Place Order</span>
                <span className="opacity-70">•</span>
                <span>${total.toFixed(2)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Layout>
  );
};
