import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Range = 'week' | 'month' | 'year' | 'all';

export const SellerEarnings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [range, setRange] = useState<Range>('week');
  const [tab, setTab] = useState<'overview' | 'payouts' | 'statements'>('overview');
  const [orders, setOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('orders').select('*, order_items(quantity, price, products(name))').eq('seller_id', user.uid)
      .then(({ data }) => {
        setOrders(data || []);
        const map = new Map<string, { name: string; units: number; total: number }>();
        (data || []).forEach((o) => o.order_items?.forEach((i: any) => {
          const name = i.products?.name || 'Product';
          const cur = map.get(name) || { name, units: 0, total: 0 };
          cur.units += i.quantity;
          cur.total += Number(i.price) * i.quantity;
          map.set(name, cur);
        }));
        setTopProducts(Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5));
      });
  }, [user]);

  const now = Date.now();
  const cutoff = range === 'week' ? now - 7 * 864e5 : range === 'month' ? now - 30 * 864e5 : range === 'year' ? now - 365 * 864e5 : 0;
  const ranged = orders.filter((o) => new Date(o.created_at).getTime() >= cutoff);
  const totalSales = ranged.reduce((s, o) => s + Number(o.total_amount), 0);
  const commPaid = ranged.reduce((s, o) => s + Number(o.commission || 0), 0);
  const pending = ranged.filter((o) => ['processing', 'shipped'].includes(o.status)).reduce((s, o) => s + Number(o.total_amount), 0);
  const completed = ranged.filter((o) => o.status === 'completed').reduce((s, o) => s + Number(o.total_amount), 0);

  // Build bar chart values per day (last 7)
  const bars = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now - (6 - i) * 864e5);
    const total = orders
      .filter((o) => new Date(o.created_at).toDateString() === day.toDateString())
      .reduce((s, o) => s + Number(o.total_amount), 0);
    return total;
  });
  const maxBar = Math.max(1, ...bars);

  return (
    <div className="min-h-screen w-full max-w-md mx-auto" style={{ background: '#FFF1DD' }}>
      <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">Earnings</h1>
      </div>

      <div className="px-4 py-4 space-y-4 pb-20">
        <div className="flex gap-2 overflow-x-auto">
          {(['week', 'month', 'year', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap"
              style={{ background: range === r ? '#A35233' : '#FFE3BD', color: range === r ? '#fff' : '#1a1a1a' }}
            >
              {r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : r === 'year' ? 'This Year' : 'All Time'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 text-center">
          <div className="text-sm text-[#1a1a1a]/60">Total Sales</div>
          <div className="text-4xl font-bold my-2" style={{ color: '#A35233' }}>${totalSales.toFixed(2)}</div>
          <hr className="my-3 border-[#E8DCC0]" />
          <div className="grid grid-cols-3 text-sm">
            <div><div className="text-[#1a1a1a]/60">Comm. Paid</div><div className="font-bold">${commPaid.toFixed(0)}</div></div>
            <div><div className="text-[#1a1a1a]/60">Pending</div><div className="font-bold">${pending.toFixed(0)}</div></div>
            <div><div className="text-[#1a1a1a]/60">Completed</div><div className="font-bold">${completed.toFixed(0)}</div></div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">Next payout: <span className="font-bold">{new Date(now + 7 * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
          <button className="px-5 py-2 rounded-full text-white font-bold text-sm" style={{ background: '#3D7B2E' }}>REQUEST PAYOUT</button>
        </div>

        <div className="flex gap-6 border-b border-[#E8DCC0]">
          {(['overview', 'payouts', 'statements'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 text-sm font-semibold capitalize ${tab === t ? 'border-b-2' : ''}`}
              style={{ color: tab === t ? '#A35233' : '#1a1a1a', borderColor: '#A35233' }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div className="bg-[#EEE] rounded-2xl h-48 p-4 flex items-end gap-3">
              {bars.map((v, i) => (
                <div key={i} className="flex-1 rounded-t" style={{ background: '#D6D6D6', height: `${(v / maxBar) * 100 || 5}%` }} />
              ))}
            </div>
            <h3 className="font-bold pt-2">Top Products</h3>
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-[#EEE] flex items-center justify-center"><ImageIcon className="h-5 w-5 text-[#1a1a1a]/40" /></div>
                  <div className="flex-1">
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs text-[#1a1a1a]/60">{p.units} units sold</div>
                  </div>
                  <div className="font-bold">${p.total.toFixed(0)}</div>
                </div>
              ))}
              {topProducts.length === 0 && <div className="text-center text-[#1a1a1a]/50 py-4">No sales yet</div>}
            </div>
          </>
        )}

        {tab === 'payouts' && <div className="text-center text-[#1a1a1a]/60 py-8">No payouts yet</div>}
        {tab === 'statements' && <div className="text-center text-[#1a1a1a]/60 py-8">No statements yet</div>}
      </div>
    </div>
  );
};