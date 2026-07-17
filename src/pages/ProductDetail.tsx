import { Layout } from '@/components/Layout';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ShoppingCart, Star, ShieldCheck, ChevronDown, Loader2 } from 'lucide-react';

const CREAM = '#FFF5E5';
const BROWN = '#A35233';
const BROWN_DARK = '#5C2A14';
const CERT_BG = '#F2E58A';
const CERT_FG = '#5A5418';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  inventory_quantity: number;
  seller_id: string;
}

export const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, getTotalItems, items } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
      if (!error && data) setProduct(data as Product);
      setLoading(false);
    };
    load();
  }, [id]);

  const inCart = !!product && items.some((i) => i.id === product.id);

  const handleAdd = () => {
    if (!product) return;
    if (inCart) {
      navigate('/cart');
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url || '/placeholder.svg',
      seller_id: product.seller_id,
    });
    toast({ title: 'Added to cart', description: `${product.name} has been added to your cart.` });
  };

  if (loading) {
    return (
      <Layout showHeader={false} showNavigation={false}>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: BROWN }} />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout showHeader={false} showNavigation={false}>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: CREAM, color: BROWN_DARK }}>
          <p>Product not found.</p>
          <button onClick={() => navigate('/shop')} className="underline">Back to Marketplace</button>
        </div>
      </Layout>
    );
  }

  const description = product.description || 'No description available for this product.';
  const shortDesc = description.length > 160 ? description.slice(0, 160).trimEnd() + '…' : description;

  return (
    <Layout showHeader={false} showNavigation={false}>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: CREAM }}>
        {/* Top bar */}
        <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2" style={{ color: BROWN_DARK }}>
            <span className="h-9 w-9 rounded-full border flex items-center justify-center" style={{ borderColor: BROWN_DARK }}>
              <ArrowLeft className="h-4 w-4" />
            </span>
            <span className="text-base font-bold">Back to Home</span>
          </button>
          <button onClick={() => navigate('/cart')} className="relative" style={{ color: BROWN_DARK }} aria-label="Cart">
            <ShoppingCart className="h-6 w-6" />
            {getTotalItems() > 0 && (
              <span className="absolute -top-1.5 -right-2 text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center text-white" style={{ backgroundColor: BROWN }}>
                {getTotalItems()}
              </span>
            )}
          </button>
        </div>

        {/* Image */}
        <div className="relative w-full aspect-square bg-neutral-200">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" />
          )}
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center">
            <div className="flex items-center gap-1.5 bg-black/35 backdrop-blur px-3 py-1.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-5 pt-5 pb-32 space-y-5">
          <div className="flex items-center gap-2 text-sm" style={{ color: BROWN_DARK }}>
            <Star className="h-4 w-4" fill={BROWN} stroke={BROWN} />
            <span className="font-bold">4.9</span>
            <span style={{ opacity: 0.7 }}>(128 reviews)</span>
          </div>

          <h1 className="text-3xl font-bold leading-tight" style={{ color: BROWN_DARK }}>
            {product.name}
          </h1>

          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold" style={{ color: BROWN }}>${product.price.toFixed(2)}</p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide" style={{ backgroundColor: CERT_BG, color: CERT_FG }}>
              <ShieldCheck className="h-3.5 w-3.5" />
              BARKAH CERTIFIED
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="flex items-center justify-between bg-white rounded-xl px-4 py-3 text-sm font-medium" style={{ color: BROWN_DARK }}>
              Size <ChevronDown className="h-4 w-4 opacity-60" />
            </button>
            <button type="button" className="flex items-center justify-between bg-white rounded-xl px-4 py-3 text-sm font-medium" style={{ color: BROWN_DARK }}>
              Black <ChevronDown className="h-4 w-4 opacity-60" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold tracking-widest" style={{ color: BROWN_DARK }}>DESCRIPTION</p>
            <p className="text-base leading-relaxed" style={{ color: BROWN_DARK, opacity: 0.85 }}>
              {expanded ? description : shortDesc}
            </p>
            {description.length > 160 && (
              <button onClick={() => setExpanded((v) => !v)} className="text-sm font-bold" style={{ color: BROWN }}>
                {expanded ? 'Read Less' : 'Read More'}
              </button>
            )}
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-6 pt-3 bg-gradient-to-t from-[#FFF5E5] via-[#FFF5E5]/95 to-transparent">
          <button
            onClick={handleAdd}
            className="w-full h-14 rounded-full text-white text-lg font-bold shadow-lg"
            style={{ backgroundColor: BROWN }}
          >
            {inCart ? 'Go to Cart' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetail;