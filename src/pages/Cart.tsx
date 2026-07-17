import { Layout } from '@/components/Layout';
import { useCart } from '@/contexts/CartContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Loader2, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

const CREAM = '#FFF5E5';
const BROWN = '#A35233';
const BROWN_DARK = '#5C2A14';
const STEP_BG = '#F5E6D0';

export const Cart = () => {
  const { items, updateQuantity, removeFromCart, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState('');

  const handleProceedToPay = () => {
    if (!user) {
      toast.error('Please login to checkout');
      navigate('/login');
      return;
    }
    if (items.length === 0) return;
    navigate('/checkout');
  };

  const subtotal = getTotalPrice();
  const tax = subtotal * 0.1;
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + tax + shipping;

  if (items.length === 0) {
    return (
      <Layout showHeader={false} showNavigation={false}>
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: CREAM }}>
          {/* Header */}
          <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between">
            <button onClick={() => navigate('/shop')} className="flex items-center gap-2" style={{ color: BROWN_DARK }}>
              <span className="h-9 w-9 rounded-full border flex items-center justify-center" style={{ borderColor: BROWN_DARK }}>
                <ArrowLeft className="h-4 w-4" />
              </span>
              <span className="text-base font-bold">Cart</span>
            </button>
            <button className="h-9 w-9 rounded-full border flex items-center justify-center" style={{ borderColor: BROWN_DARK, color: BROWN_DARK }}>
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <ShoppingBag className="h-16 w-16 mb-4" style={{ color: BROWN, opacity: 0.4 }} />
            <h2 className="text-xl font-semibold mb-2" style={{ color: BROWN_DARK }}>Your cart is empty</h2>
            <p className="mb-6" style={{ color: BROWN_DARK, opacity: 0.7 }}>Add some items to your cart to get started</p>
            <button 
              onClick={() => navigate('/shop')}
              className="h-12 px-8 rounded-full text-white text-base font-bold"
              style={{ backgroundColor: BROWN }}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showHeader={false} showNavigation={false}>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: CREAM }}>
        {/* Header */}
        <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between">
          <button onClick={() => navigate('/shop')} className="flex items-center gap-2" style={{ color: BROWN_DARK }}>
            <span className="h-9 w-9 rounded-full border flex items-center justify-center" style={{ borderColor: BROWN_DARK }}>
              <ArrowLeft className="h-4 w-4" />
            </span>
            <span className="text-base font-bold">Cart</span>
          </button>
          <button className="h-9 w-9 rounded-full border flex items-center justify-center" style={{ borderColor: BROWN_DARK, color: BROWN_DARK }}>
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 px-4 pt-4 pb-4 space-y-4 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-3xl p-4">
              <div className="flex items-start gap-4">
                {/* Circular image */}
                <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-neutral-200">
                  {item.image && item.image !== '/placeholder.svg' ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: STEP_BG }}>
                      <ShoppingBag className="h-6 w-6" style={{ color: BROWN, opacity: 0.4 }} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base leading-tight" style={{ color: BROWN_DARK }}>{item.name}</h3>
                    <p className="font-bold text-base whitespace-nowrap" style={{ color: BROWN }}>${item.price.toFixed(2)}</p>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: BROWN_DARK, opacity: 0.6 }}>Qty: {item.quantity}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 mt-4">
                {/* Quantity stepper */}
                <div className="flex items-center rounded-full px-1 py-1" style={{ backgroundColor: STEP_BG }}>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="h-8 w-8 flex items-center justify-center rounded-full"
                    style={{ color: BROWN_DARK }}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-semibold text-sm" style={{ color: BROWN_DARK }}>{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="h-8 w-8 flex items-center justify-center rounded-full"
                    style={{ color: BROWN_DARK }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: BROWN_DARK, opacity: 0.7 }}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Promotional Offer */}
          <div className="pt-2">
            <h3 className="text-base font-bold mb-3" style={{ color: BROWN_DARK }}>Promotional Offer</h3>
            <div className="bg-white rounded-2xl flex items-center px-4 py-3 gap-3">
              <input
                type="text"
                placeholder="Enter code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-400"
                style={{ color: BROWN_DARK }}
              />
              <button
                className="px-6 py-2 rounded-full text-sm font-bold tracking-wider border"
                style={{ borderColor: BROWN, color: BROWN }}
              >
                APPLY
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-3xl p-5 space-y-3">
            <h3 className="text-base font-bold" style={{ color: BROWN_DARK }}>Summary</h3>
            <div className="flex justify-between text-sm" style={{ color: BROWN_DARK, opacity: 0.8 }}>
              <span>Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: BROWN_DARK, opacity: 0.8 }}>
              <span>Tax</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: BROWN_DARK, opacity: 0.8 }}>Shipping</span>
              <span className="font-bold tracking-wider" style={{ color: shipping === 0 ? '#6a8b74' : BROWN }}>
                {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
              </span>
            </div>
            <div className="border-t pt-3 mt-1" style={{ borderColor: `${BROWN_DARK}20` }}>
              <div className="flex justify-between">
                <span className="font-bold text-base" style={{ color: BROWN_DARK }}>Total Amount</span>
                <span className="font-bold text-base" style={{ color: BROWN_DARK }}>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="px-4 pb-6 pt-3 bg-gradient-to-t from-[#FFF5E5] via-[#FFF5E5]/95 to-transparent">
          <button
            onClick={handleProceedToPay}
            disabled={processing}
            className="w-full h-14 rounded-full text-white text-lg font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ backgroundColor: BROWN }}
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Proceed to Checkout
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </>
            )}
          </button>
        </div>
      </div>
    </Layout>
  );
};
