import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Search, Loader2, Menu, Heart, Plus, Leaf, Bell } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES } from './ShopCategories';

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

const CREAM = '#FFF5E5';
const CREAM_SOFT = '#FFF5E5';
const BROWN = '#A35233';
const BROWN_DARK = '#5C2A14';
const ACCENT_BROWN = '#B54A22';

export const Shop = () => {
  const { addToCart, getTotalItems } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .gt('inventory_quantity', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url || '/placeholder.svg',
      seller_id: (product as any).seller_id
    });
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleCartClick = () => {
    navigate('/cart');
  };

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const topPicks = useMemo(() => products.slice(0, 3), [products]);

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen" style={{ backgroundColor: CREAM }}>
        {/* Top bar */}
        <div className="bg-white px-4 pt-4 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Menu" style={{ color: BROWN_DARK }}>
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold" style={{ color: BROWN_DARK }}>Marketplace</h1>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" aria-label="Search" style={{ color: BROWN_DARK }}>
              <Search className="h-5 w-5" />
            </button>
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
        </div>

        <div className="px-4 pt-5 pb-32 space-y-6">
          {/* Categories */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: BROWN_DARK }}>Categories</h2>
              <button type="button" onClick={() => navigate('/shop/categories')} className="text-sm" style={{ color: BROWN_DARK, opacity: 0.7 }}>See all</button>
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
              {CATEGORIES.map((c) => (
                <button key={c.key} type="button" onClick={() => navigate('/shop/categories')} className="flex flex-col items-center gap-2 shrink-0 w-16">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-neutral-100">
                    <img src={c.image} alt={c.label} loading="lazy" width={64} height={64} className="h-full w-full object-cover" />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight" style={{ color: BROWN_DARK }}>{c.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Hero banner */}
          <section>
            <div
              className="relative rounded-3xl overflow-hidden p-6 h-44 flex flex-col justify-center"
              style={{
                background: `linear-gradient(135deg, ${BROWN} 0%, ${BROWN_DARK} 100%)`,
              }}
            >
              <div className="relative z-10 max-w-[60%]">
                <h3 className="text-2xl font-bold text-white leading-tight">Artisanal Selection</h3>
                <p className="text-xs text-white/85 mt-2 leading-snug">
                  Curated handcrafted pieces from master artisans across the heritage belt.
                </p>
              </div>
              <div
                className="absolute right-0 top-0 bottom-0 w-1/2 opacity-30"
                style={{
                  background:
                    'radial-gradient(circle at 70% 50%, rgba(255,220,180,0.6), transparent 60%)',
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <span className="h-1.5 w-6 rounded-full" style={{ backgroundColor: ACCENT_BROWN }} />
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#D9C4A4' }} />
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#D9C4A4' }} />
            </div>
          </section>

          {/* Top Picks */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: BROWN }}>Top Picks</h2>
              <button type="button" className="text-sm" style={{ color: BROWN_DARK, opacity: 0.7 }}>See all</button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: BROWN }} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {topPicks.map((product, idx) => {
                  const isNew = idx === 0;
                  const isSustainable = idx === 1;
                  const badge = isNew ? { label: 'NEW ARRIVAL', color: BROWN } : isSustainable ? { label: 'SUSTAINABLE', color: ACCENT_BROWN } : { label: 'ARTISANAL SELECTION', color: BROWN };
                  const fav = favorites.has(product.id);
                  return (
                    <div
                      key={product.id}
                      onClick={() => navigate(`/shop/product/${product.id}`)}
                      className="rounded-2xl overflow-hidden bg-white flex flex-col cursor-pointer"
                      style={{ boxShadow: '0 2px 6px rgba(92,42,20,0.06)' }}
                    >
                      <div className="relative aspect-square bg-neutral-100">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ color: BROWN, opacity: 0.4 }}>
                            <Leaf className="h-10 w-10" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleFav(product.id); }}
                          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/30 backdrop-blur flex items-center justify-center"
                          aria-label="Favorite"
                        >
                          <Heart className="h-4 w-4 text-white" fill={fav ? 'white' : 'none'} />
                        </button>
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="text-[10px] font-bold tracking-wide" style={{ color: badge.color }}>{badge.label}</p>
                        <h3 className="text-sm font-bold leading-tight line-clamp-2" style={{ color: BROWN_DARK }}>
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-base font-bold" style={{ color: BROWN_DARK }}>${product.price.toFixed(2)}</p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                            className="h-7 w-7 rounded-full border flex items-center justify-center"
                            style={{ borderColor: BROWN, color: BROWN }}
                            aria-label="Add to cart"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Coming soon card */}
                <div className="rounded-2xl overflow-hidden flex flex-col" style={{ backgroundColor: CREAM_SOFT, boxShadow: '0 2px 6px rgba(92,42,20,0.06)' }}>
                  <div className="aspect-square flex flex-col items-center justify-center text-center px-4" style={{ color: BROWN }}>
                    <Leaf className="h-7 w-7 mb-2" />
                    <p className="text-sm font-semibold leading-tight" style={{ color: BROWN_DARK }}>
                      More coming<br />from the Atlas<br />Mountains
                    </p>
                  </div>
                  <div className="p-3 space-y-1 bg-white">
                    <p className="text-[10px] font-bold tracking-wide" style={{ color: BROWN_DARK, opacity: 0.7 }}>COMING SOON</p>
                    <h3 className="text-sm font-bold leading-tight" style={{ color: BROWN_DARK }}>Atlas Wool Collection</h3>
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-base font-bold" style={{ color: BROWN_DARK }}>---</p>
                      <button type="button" className="h-7 w-7 rounded-full flex items-center justify-center" style={{ color: BROWN_DARK, opacity: 0.5 }} aria-label="Notify">
                        <Bell className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
};
