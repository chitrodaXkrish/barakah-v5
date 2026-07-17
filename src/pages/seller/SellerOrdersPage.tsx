import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, User as UserIcon, ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Tab = 'new' | 'processing' | 'shipped';

export const SellerOrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('new');
  const [query, setQuery] = useState('');

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .eq('seller_id', user.uid)
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };
  useEffect(() => { load(); }, [user]);

  const counts = {
    new: orders.filter((o) => o.status === 'new' || o.status === 'pending').length,
    processing: orders.filter((o) => o.status === 'processing').length,
    shipped: orders.filter((o) => o.status === 'shipped' || o.status === 'completed').length,
  };

  const visible = orders.filter((o) => {
    if (tab === 'new') return o.status === 'new' || o.status === 'pending';
    if (tab === 'processing') return o.status === 'processing';
    return o.status === 'shipped' || o.status === 'completed';
  }).filter((o) => o.id.toLowerCase().includes(query.toLowerCase()));

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from('orders').update(patch).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Order updated');
    load();
  };

  const shortId = (id: string) => `#ORD-${id.slice(0, 4).toUpperCase()}`;

  return (
    <div className="min-h-screen w-full max-w-md mx-auto" style={{ background: '#FFF1DD' }}>
      <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">View Orders</h1>
      </div>

      <div className="px-4 py-4 space-y-4 pb-20">
        <div className="flex gap-2 overflow-x-auto">
          {([
            ['new', 'New', counts.new],
            ['processing', 'Processing', counts.processing],
            ['shipped', 'Shipped', counts.shipped],
          ] as const).map(([id, label, n]) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id as Tab)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                style={{ background: active ? '#A35233' : '#FFE3BD', color: active ? '#fff' : '#1a1a1a' }}
              >
                {label}
                <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: active ? '#78351A' : '#fff' }}>{n}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-full flex items-center px-4 py-3 gap-3">
          <Search className="h-5 w-5" style={{ color: '#A35233' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search orders..." className="flex-1 outline-none bg-transparent text-sm" />
        </div>

        <div className="space-y-4">
          {visible.map((o) => {
            const item = o.order_items?.[0];
            const date = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return (
              <div key={o.id} className="bg-white rounded-2xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-bold">{shortId(o.id)}</span>
                  <span className="text-[#1a1a1a]/60">{date}</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded-xl flex items-center justify-center" style={{ background: '#EEE' }}>
                    {item?.products?.image_url ? <img src={item.products.image_url} className="w-full h-full object-cover rounded-xl" /> : <ImageIcon className="h-6 w-6 text-[#1a1a1a]/40" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{item?.products?.name || 'Product Name Placeholder'}</div>
                    <div className="text-sm text-[#1a1a1a]/60">Qty: {item?.quantity || 1}</div>
                    <div className="font-bold mt-1">${Number(o.total_amount).toFixed(2)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <UserIcon className="h-4 w-4 text-[#1a1a1a]/60" />
                  <div>
                    <div>{o.customer_name || 'Customer Name Placeholder'}</div>
                    <div className="text-[#1a1a1a]/60">{o.shipping_city || 'Location, City'}</div>
                  </div>
                </div>

                {(o.status === 'new' || o.status === 'pending') && (
                  <>
                    <span className="inline-block text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: '#FFF6C9', color: '#7A5A00' }}>NEW</span>
                    <div className="flex gap-3 pt-1">
                      <button onClick={() => update(o.id, { status: 'processing' })} className="flex-1 py-3 rounded-full text-white font-semibold" style={{ background: '#A35233' }}>Accept</button>
                      <button onClick={() => update(o.id, { status: 'declined' })} className="flex-1 py-3 rounded-full font-semibold border-2" style={{ borderColor: '#A35233', color: '#A35233' }}>Decline</button>
                    </div>
                  </>
                )}

                {o.status === 'processing' && (
                  <ProcessingActions order={o} onShip={(t) => update(o.id, { status: 'shipped', tracking_id: t })} />
                )}

                {o.status === 'shipped' && (
                  <>
                    <span className="inline-block text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: '#FFE3BD', color: '#B07A00' }}>SHIPPED</span>
                    <button onClick={() => navigate(`/seller/orders/${o.id}`)} className="text-sm font-semibold underline block" style={{ color: '#A35233' }}>View Tracking</button>
                  </>
                )}

                {o.status === 'completed' && (
                  <>
                    <span className="inline-block text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: '#E1F0DA', color: '#3D7B2E' }}>COMPLETED</span>
                    <button onClick={() => navigate(`/seller/orders/${o.id}`)} className="text-sm font-semibold underline block" style={{ color: '#A35233' }}>View Details</button>
                  </>
                )}
              </div>
            );
          })}
          {visible.length === 0 && <div className="text-center text-[#1a1a1a]/50 py-12">No orders</div>}
        </div>
      </div>
    </div>
  );
};

const ProcessingActions = ({ order, onShip }: { order: any; onShip: (t: string) => void }) => {
  const [tracking, setTracking] = useState(order.tracking_id || '');
  return (
    <>
      <span className="inline-block text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: '#DDE9FF', color: '#1E48B5' }}>PROCESSING</span>
      <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Enter tracking ID" className="w-full rounded-full border border-[#E8DCC0] px-4 py-2 text-sm outline-none" />
      <button onClick={() => onShip(tracking)} className="w-full py-3 rounded-full text-white font-semibold" style={{ background: '#A35233' }}>Mark Shipped</button>
    </>
  );
};