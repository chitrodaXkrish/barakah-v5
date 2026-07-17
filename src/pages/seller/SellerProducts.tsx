import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, ImageIcon, MoreVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Filter = 'all' | 'active' | 'under_review';

export const SellerProducts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('products')
      .select('*')
      .eq('seller_id', user.uid)
      .order('created_at', { ascending: false })
      .then(({ data }) => setProducts(data || []));
  }, [user]);

  const counts = {
    all: products.length,
    active: products.filter((p) => p.status === 'active').length,
    under_review: products.filter((p) => p.status === 'under_review').length,
  };

  const visible = products
    .filter((p) => (filter === 'all' ? true : p.status === filter))
    .filter((p) => p.name?.toLowerCase().includes(query.toLowerCase()));

  const statusBadge = (p: any) => {
    if (p.inventory_quantity === 0) {
      return <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: '#FBE4E4', color: '#C0392B' }}>OUT OF STOCK</span>;
    }
    if (p.status === 'under_review') {
      return <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: '#FFF1C4', color: '#B07A00' }}>UNDER REVIEW</span>;
    }
    return <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: '#E1F0DA', color: '#3D7B2E' }}>ACTIVE</span>;
  };

  return (
    <div className="min-h-screen w-full max-w-md mx-auto" style={{ background: '#FFF1DD' }}>
      <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">View Products</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {([
            ['all', 'All', counts.all],
            ['active', 'Active', counts.active],
            ['under_review', 'Under Review', counts.under_review],
          ] as const).map(([id, label, n]) => {
            const active = filter === id;
            return (
              <button
                key={id}
                onClick={() => setFilter(id as Filter)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                style={{ background: active ? '#A35233' : '#FFE3BD', color: active ? '#fff' : '#1a1a1a' }}
              >
                {label}
                <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: active ? '#78351A' : '#fff', color: active ? '#fff' : '#1a1a1a' }}>{n}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="bg-white rounded-full flex items-center px-4 py-3 gap-3">
          <Search className="h-5 w-5" style={{ color: '#A35233' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Products..."
            className="flex-1 outline-none bg-transparent text-sm"
          />
        </div>

        <div className="text-sm text-[#1a1a1a]/70">Sort by: <span className="font-semibold text-[#1a1a1a]">Date Added ▾</span></div>

        {/* Product list */}
        <div className="space-y-3 pb-32">
          {visible.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-3 flex gap-3">
              <div className="w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFE3BD', border: '2px dashed #C9A87C' }}>
                {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover rounded-xl" /> : <ImageIcon className="h-7 w-7 text-[#1a1a1a]/40" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-[#1a1a1a] leading-tight">{p.name}</h3>
                  <button><MoreVertical className="h-5 w-5 text-[#1a1a1a]/60" /></button>
                </div>
                <div className="text-lg font-bold mt-1" style={{ color: '#A35233' }}>${Number(p.price).toFixed(2)}</div>
                <div className={`text-sm mt-1 ${p.inventory_quantity === 0 ? 'text-red-600 font-semibold' : 'text-[#1a1a1a]/60'}`}>
                  Stock: {p.inventory_quantity}
                </div>
                <div className="mt-2">{statusBadge(p)}</div>
                {p.status === 'under_review' && (
                  <div className="text-xs text-red-600 mt-1 flex items-center gap-1">ⓘ Flagged for compliance review</div>
                )}
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="text-center text-[#1a1a1a]/50 py-12">No products found</div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/seller/products/new')}
        className="fixed bottom-8 right-6 px-6 py-4 rounded-full text-white font-bold flex items-center gap-2 shadow-lg"
        style={{ background: '#3D7B2E' }}
      >
        <Plus className="h-5 w-5" /> Add Product
      </button>
    </div>
  );
};