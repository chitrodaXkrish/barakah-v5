import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, Plus, ClipboardList, Wallet, MessageSquare } from 'lucide-react';

export const SellerDashboard = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ sales: 0, orders: 0, pendingPayout: 0, productsLive: 0, needShipping: 0 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (userRole && userRole !== 'seller') {
      toast.error('Access denied. Seller role required.');
      navigate('/');
      return;
    }
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('user_id', user.uid)
        .maybeSingle();
      if (!prof || !prof.onboarding_completed) {
        navigate('/seller-onboarding', { replace: true });
        return;
      }
      setProfile(prof);

      // Compute setup progress in real-time from onboarding fields submitted at signup
      const fields = [
        prof.business_name,
        prof.seller_display_name,
        prof.contact_person,
        prof.email,
        prof.phone_number,
        prof.country_of_operations,
        prof.halal_compliant,
        prof.no_prohibited_categories,
        prof.understands_review,
        prof.agreed_to_terms,
        prof.banner_url,
        prof.logo_url,
        prof.about_us,
        prof.bank_account_name,
        prof.bank_account_number,
      ];
      const filled = fields.filter((v) => (typeof v === 'string' ? v.trim().length > 0 : Boolean(v))).length;
      setProgress(Math.round((filled / fields.length) * 100));

      const { data: products } = await supabase
        .from('products')
        .select('id, status')
        .eq('seller_id', user.uid);
      const productsLive = (products || []).filter((p: any) => p.status === 'active').length;

      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, status, commission')
        .eq('seller_id', user.uid);
      const sales = (orders || []).reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
      const pendingPayout = (orders || [])
        .filter((o: any) => ['shipped', 'processing'].includes(o.status))
        .reduce((s: number, o: any) => s + (Number(o.total_amount) - Number(o.commission || 0)), 0);
      const needShipping = (orders || []).filter((o: any) => o.status === 'processing').length;

      setStats({ sales, orders: (orders || []).length, pendingPayout, productsLive, needShipping });
    })();
  }, [user, userRole, navigate]);

  if (userRole !== 'seller') return null;

  return (
    <div className="min-h-screen w-full max-w-md mx-auto" style={{ background: '#FFF1DD' }}>
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4">
        <button onClick={() => navigate('/marketplace')} className="flex items-center gap-2 text-[#1a1a1a] font-semibold">
          <ArrowLeft className="h-5 w-5" />
          Back to Marketplace
        </button>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Setup Progress */}
        {progress < 100 && (
          <div className="rounded-2xl p-5 border" style={{ background: '#FFE3BD', borderColor: '#E8D5C4' }}>
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="text-lg font-bold text-[#1a1a1a]">Setup Progress</h3>
                <p className="text-sm text-[#1a1a1a]/70">Complete your profile to start selling</p>
              </div>
              <div className="text-2xl font-bold" style={{ color: '#5B7A1F' }}>{progress}%</div>
            </div>
            <div className="h-2 rounded-full bg-[#E8DCC0] my-3 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: '#5B7A1F' }} />
            </div>
            <button
              onClick={() => navigate('/seller-onboarding')}
              className="w-full py-3 rounded-full text-white font-semibold"
              style={{ background: '#A35233' }}
            >
              Complete profile
            </button>
          </div>
        )}

        {/* Shipping alert */}
        {stats.needShipping > 0 && (
          <div className="rounded-2xl border-2 px-4 py-3 flex items-center justify-between" style={{ borderColor: '#D4A017' }}>
            <div className="flex items-center gap-2 text-[#1a1a1a]">
              <AlertTriangle className="h-5 w-5" style={{ color: '#D4A017' }} />
              <span className="text-sm font-medium">Orders needing shipping update</span>
            </div>
            <button onClick={() => navigate('/seller/orders')} className="text-sm font-semibold underline" style={{ color: '#A35233' }}>
              Update
            </button>
          </div>
        )}

        {/* Store row */}
        <div className="bg-white rounded-2xl px-3 py-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#F0E4CC] overflow-hidden flex-shrink-0">
            {profile?.logo_url && <img src={profile.logo_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 font-bold text-[#1a1a1a]">{profile?.seller_display_name || profile?.business_name || 'Store Name'}</div>
          <button onClick={() => navigate('/seller-onboarding')} className="text-sm font-semibold underline" style={{ color: '#A35233' }}>
            Edit Store
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="TOTAL SALES" value={`$${stats.sales.toFixed(0)}`} />
          <StatCard label="ORDERS" value={String(stats.orders)} />
          <StatCard label="PENDING PAYOUT" value={`$${stats.pendingPayout.toFixed(0)}`} />
          <StatCard label="PRODUCTS LIVE" value={String(stats.productsLive)} />
        </div>

        {/* Actions grid */}
        <div className="grid grid-cols-2 gap-3">
          <ActionCard icon={<Plus className="h-7 w-7" />} label="Add/View Products" onClick={() => navigate('/seller/products')} />
          <ActionCard icon={<ClipboardList className="h-7 w-7" />} label="View Orders" onClick={() => navigate('/seller/orders')} />
          <ActionCard icon={<Wallet className="h-7 w-7" />} label="Earnings" onClick={() => navigate('/seller/earnings')} />
          <ActionCard icon={<MessageSquare className="h-7 w-7" />} label="Barakah Seller Support" badge={3} onClick={() => navigate('/seller/support')} />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl px-4 py-5 text-center border" style={{ background: '#fff5e5', borderColor: '#E8D5C4' }}>
    <div className="text-[11px] tracking-wider text-[#1a1a1a]/60 mb-2">{label}</div>
    <div className="text-2xl font-bold" style={{ color: '#78351A' }}>{value}</div>
  </div>
);

const ActionCard = ({ icon, label, onClick, badge }: { icon: React.ReactNode; label: string; onClick: () => void; badge?: number }) => (
  <button onClick={onClick} className="relative bg-white rounded-2xl py-8 px-3 flex flex-col items-center gap-3 border" style={{ color: '#A35233', borderColor: '#E8D5C4' }}>
    {badge !== undefined && (
      <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
        {badge}
      </span>
    )}
    {icon}
    <span className="text-sm font-bold text-[#1a1a1a] text-center leading-tight">{label}</span>
  </button>
);
