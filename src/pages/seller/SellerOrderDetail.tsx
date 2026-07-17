import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Mail, Phone, ImageIcon, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SellerOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .eq('id', id)
      .maybeSingle();
    setOrder(data);
    setTracking(data?.tracking_id || '');
  };
  useEffect(() => { load(); }, [id]);

  if (!order) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFF1DD' }}>Loading...</div>;

  const subtotal = order.subtotal || order.order_items.reduce((s: number, i: any) => s + Number(i.price) * i.quantity, 0);
  const shipping = Number(order.shipping_fee || 0);
  const tax = Number(order.tax || subtotal * 0.05);
  const commission = Number(order.commission || subtotal * 0.05);
  const earnings = subtotal + shipping + tax - commission;
  const currency = order.currency || 'USD';

  const markShipped = async () => {
    const { error } = await supabase.from('orders').update({ status: 'shipped', tracking_id: tracking }).eq('id', order.id);
    if (error) return toast.error(error.message);
    toast.success('Marked shipped');
    load();
  };

  const shortId = `#ORD-${order.id.slice(0, 4).toUpperCase()}`;
  const placed = new Date(order.created_at);

  return (
    <div className="min-h-screen w-full max-w-md mx-auto pb-16" style={{ background: '#FFF1DD' }}>
      <div className="bg-white px-4 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-lg font-bold">Order {shortId}</h1>
        <button><Printer className="h-5 w-5" /></button>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="text-center">
          <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: '#DDE9FF', color: '#1E48B5' }}>
            {order.status.toUpperCase()}
          </span>
          <p className="text-sm text-[#1a1a1a]/70 mt-2">
            Ordered on {placed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {placed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Customer */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <h3 className="font-bold" style={{ color: '#A35233' }}>Customer Details</h3>
          <div className="flex gap-3">
            <div className="w-14 h-14 rounded-full bg-[#EEE] flex items-center justify-center"><UserIcon className="h-6 w-6 text-[#1a1a1a]/50" /></div>
            <div>
              <div className="font-bold">{order.customer_name || 'Customer'}</div>
              <div className="text-sm text-[#1a1a1a]/70">{order.shipping_address || 'Address'}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 rounded-full border border-[#E8DCC0] px-3 py-2 text-sm flex items-center gap-2"><Mail className="h-4 w-4" /> Email - {(order.customer_email || '').slice(0, 6)}***……</div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 rounded-full border border-[#E8DCC0] px-3 py-2 text-sm flex items-center gap-2"><Phone className="h-4 w-4" /> Call - {order.customer_phone || '+…'} ………</div>
          </div>
        </div>

        {/* Items */}
        <h3 className="font-bold" style={{ color: '#A35233' }}>Line Items ({order.order_items.length})</h3>
        <div className="space-y-3">
          {order.order_items.map((i: any) => (
            <div key={i.id} className="bg-white rounded-2xl p-3 flex gap-3 items-center">
              <div className="w-16 h-16 rounded-xl bg-[#EEE] flex items-center justify-center">
                {i.products?.image_url ? <img src={i.products.image_url} className="w-full h-full object-cover rounded-xl" /> : <ImageIcon className="h-5 w-5 text-[#1a1a1a]/40" />}
              </div>
              <div className="flex-1">
                <div className="font-bold">{i.products?.name}</div>
                <div className="text-xs text-[#1a1a1a]/60">SKU: {i.products?.sku || '—'}</div>
                <div className="text-xs text-[#1a1a1a]/60">{currency} {Number(i.price).toFixed(2)} x{i.quantity}</div>
              </div>
              <div className="font-bold" style={{ color: '#A35233' }}>${Number(i.price * i.quantity).toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Fulfillment */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: '#FFE3BD' }}>
          <h3 className="font-bold" style={{ color: '#A35233' }}>Fulfillment Status</h3>
          <div className="flex gap-2">
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Enter tracking ID" className="flex-1 rounded-full bg-white border border-[#E8DCC0] px-4 py-2 text-sm outline-none" />
            <button onClick={markShipped} className="px-4 rounded-full text-white font-semibold" style={{ background: '#A35233' }}>Mark Shipped</button>
          </div>
          <Timeline order={order} />
        </div>

        {/* Totals */}
        <div className="rounded-2xl p-4 space-y-2 text-sm" style={{ background: '#FFE3BD' }}>
          <Row label="Subtotal" value={`${currency} ${subtotal.toFixed(3)}`} />
          <Row label="Shipping Fee" value={`${currency} ${shipping.toFixed(3)}`} />
          <Row label="Tax (5%)" value={`${currency} ${tax.toFixed(3)}`} />
          <Row label="Barakah Commission (5%)" value={`- ${currency} ${commission.toFixed(3)}`} italic style={{ color: '#7A5A00' }} />
          <hr className="border-[#1a1a1a]/10" />
          <div className="flex justify-between font-bold text-base"><span>Your Earnings</span><span>{currency} {earnings.toFixed(3)}</span></div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value, italic, style }: any) => (
  <div className={`flex justify-between ${italic ? 'italic' : ''}`} style={style}><span>{label}</span><span>{value}</span></div>
);

const Timeline = ({ order }: { order: any }) => {
  const placed = new Date(order.created_at);
  const steps = [
    { label: 'Order Placed', time: placed, done: true },
    { label: 'Payment Confirmed', time: placed, done: order.status !== 'pending' },
    { label: 'Package Shipped', time: null, done: ['shipped', 'completed'].includes(order.status) },
  ];
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full" style={{ background: s.done ? '#7A8B2E' : '#fff', border: '2px solid #7A8B2E' }} />
            {i < steps.length - 1 && <div className="w-px flex-1 bg-[#7A8B2E]" />}
          </div>
          <div>
            <div className={`font-bold ${s.done ? '' : 'text-[#1a1a1a]/50'}`}>{s.label}</div>
            <div className="text-xs text-[#1a1a1a]/60">{s.time ? `${s.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${s.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'Pending update'}</div>
          </div>
        </div>
      ))}
    </div>
  );
};