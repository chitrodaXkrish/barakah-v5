import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Store,
  ShieldCheck,
  AlertTriangle,
  Plus,
  ClipboardList,
  Wallet,
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  ChevronRight,
  Percent,
  RefreshCw,
  ExternalLink,
  Settings,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SellerProfileData {
  business_name: string;
  seller_display_name: string;
  logo_url: string;
  banner_url: string;
  about_us: string;
  status: string;
  onboarding_completed: boolean;
}

interface SellerMetrics {
  totalSales: number;
  totalOrders: number;
  pendingOrdersCount: number;
  totalProductsCount: number;
  availableEarnings: number;
  pendingEarnings: number;
  totalPaidOut: number;
}

interface OrderRow {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  commission: number;
}

interface ProductRow {
  id: string;
  title: string;
  price: number;
  image_url?: string;
  sales_count?: number;
}

export const SellerDashboard: React.FC = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<SellerProfileData | null>(null);
  const [kycStatus, setKycStatus] = useState<string>('REGISTERED');
  const [metrics, setMetrics] = useState<SellerMetrics>({
    totalSales: 0,
    totalOrders: 0,
    pendingOrdersCount: 0,
    totalProductsCount: 0,
    availableEarnings: 0,
    pendingEarnings: 0,
    totalPaidOut: 0,
  });

  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [topProducts, setTopProducts] = useState<ProductRow[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadSellerDashboardData = async () => {
      if (userRole && userRole !== 'seller') {
        toast.error('Access denied. Seller role required.');
        navigate('/shop');
        return;
      }
      if (!user?.uid) return;

      try {
        // 1. Fetch seller_profiles
        const { data: prof, error: profErr } = await supabase
          .from('seller_profiles')
          .select('*')
          .eq('user_id', user.uid)
          .maybeSingle();

        if (profErr) console.warn('Error fetching seller profile:', profErr);

        if (!prof || !prof.onboarding_completed) {
          navigate('/seller-onboarding', { replace: true });
          return;
        }

        if (isMounted) {
          setProfile({
            business_name: prof.business_name || 'My Store',
            seller_display_name: prof.seller_display_name || prof.business_name || 'My Store',
            logo_url: prof.logo_url || '',
            banner_url: prof.banner_url || '',
            about_us: prof.about_us || '',
            status: prof.status || 'UNDER_REVIEW',
            onboarding_completed: prof.onboarding_completed || false,
          });
          setKycStatus(prof.status || 'UNDER_REVIEW');
        }

        // 2. Fetch products count
        const { data: productsData } = await supabase
          .from('products')
          .select('id, title, price, image_url')
          .eq('seller_id', user.uid);

        const productsList = productsData || [];
        const totalProductsCount = productsList.length;

        // 3. Fetch orders belonging to seller
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, total_amount, status, created_at, commission')
          .eq('seller_id', user.uid)
          .order('created_at', { ascending: false });

        const ordersList: OrderRow[] = (ordersData || []).map((o: any) => ({
          id: o.id,
          created_at: o.created_at || new Date().toISOString(),
          total_amount: Number(o.total_amount || 0),
          status: o.status || 'pending',
          commission: Number(o.commission || o.total_amount * 0.12),
        }));

        // Calculate metrics
        const totalSales = ordersList.reduce((acc, o) => acc + o.total_amount, 0);
        const totalOrders = ordersList.length;
        const pendingOrdersCount = ordersList.filter((o) => o.status === 'processing' || o.status === 'pending').length;

        // 12% Barakah Commission financial calculation
        // Available earnings: Completed / Delivered orders earnings
        const deliveredOrders = ordersList.filter((o) => o.status === 'delivered' || o.status === 'completed');
        const availableEarnings = deliveredOrders.reduce((acc, o) => {
          const comm = o.commission > 0 ? o.commission : o.total_amount * 0.12;
          return acc + (o.total_amount - comm);
        }, 0);

        // Pending earnings: Processing / Shipped orders earnings
        const pendingOrders = ordersList.filter((o) => ['processing', 'shipped'].includes(o.status));
        const pendingEarnings = pendingOrders.reduce((acc, o) => {
          const comm = o.commission > 0 ? o.commission : o.total_amount * 0.12;
          return acc + (o.total_amount - comm);
        }, 0);

        // Fetch payouts if seller_payouts table exists
        let totalPaidOut = 0;
        try {
          const { data: payoutsData } = await supabase
            .from('seller_payouts')
            .select('amount, status')
            .eq('seller_id', user.uid)
            .eq('status', 'COMPLETED');

          if (payoutsData) {
            totalPaidOut = payoutsData.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
          }
        } catch (e) {
          // Table may not have rows yet
        }

        if (isMounted) {
          setMetrics({
            totalSales,
            totalOrders,
            pendingOrdersCount,
            totalProductsCount,
            availableEarnings,
            pendingEarnings,
            totalPaidOut,
          });

          setRecentOrders(ordersList.slice(0, 5));
          setTopProducts(productsList.slice(0, 5) as ProductRow[]);
        }
      } catch (err) {
        console.error('Error loading seller dashboard:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSellerDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, userRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen max-w-md mx-auto bg-[#FFF1DD] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-7 w-7 text-[#A35233] animate-spin" />
          <p className="text-sm font-semibold text-[#1a1a1a]">Loading Seller Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-md mx-auto bg-[#FFF1DD] pb-20 flex flex-col">
      {/* Top Header */}
      <div className="bg-white px-4 pt-10 pb-3 flex items-center justify-between border-b border-[#E8D5C4] sticky top-0 z-20">
        <button
          onClick={() => navigate('/shop')}
          className="flex items-center gap-2 text-[#1a1a1a] font-bold text-sm hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="h-5 w-5" />
          Marketplace
        </button>
        <span className="text-sm font-extrabold text-[#A35233]">Seller Portal</span>
        <button
          onClick={() => navigate('/seller-onboarding')}
          className="text-xs font-semibold text-[#A35233] underline"
        >
          Settings
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Store Card Header */}
        <div className="bg-white rounded-2xl p-4 border border-[#E8D5C4] shadow-sm flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF1DD] border border-[#A35233] overflow-hidden flex-shrink-0 flex items-center justify-center">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Store className="h-7 w-7 text-[#A35233]" />
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-[#1a1a1a] truncate">
                {profile?.seller_display_name || profile?.business_name}
              </h1>
              {kycStatus === 'ACTIVE' || kycStatus === 'APPROVED' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : null}
            </div>
            <p className="text-xs text-gray-500 line-clamp-1">{profile?.about_us || 'Marketplace Seller'}</p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/seller-onboarding')}
            className="bg-[#FFF1DD] text-[#A35233] hover:bg-[#FFE5C4] border border-[#E8D5C4] font-bold text-xs rounded-xl h-9 px-3"
          >
            Edit
          </Button>
        </div>

        {/* Verification Status Card */}
        <div className="bg-white rounded-2xl p-4 border border-[#E8D5C4] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1a1a1a] flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#A35233]" /> Verification Status
            </span>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                kycStatus === 'ACTIVE' || kycStatus === 'APPROVED'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : kycStatus === 'UNDER_REVIEW'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {kycStatus === 'ACTIVE' || kycStatus === 'APPROVED'
                ? 'VERIFIED'
                : kycStatus === 'UNDER_REVIEW'
                ? 'UNDER REVIEW'
                : 'PENDING'}
            </span>
          </div>

          {kycStatus === 'UNDER_REVIEW' ? (
            <p className="text-xs text-gray-600">
              Your seller verification is currently under review by the Barakah compliance team.
            </p>
          ) : kycStatus === 'ACTIVE' || kycStatus === 'APPROVED' ? (
            <p className="text-xs text-green-700 font-medium">
              ✓ Verified Seller — Your store and products are fully active on Barakah.
            </p>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-600">Complete verification to list items.</p>
              <Button
                size="sm"
                onClick={() => navigate('/seller-onboarding')}
                className="bg-[#A35233] text-white hover:bg-[#8B4226] text-xs font-bold rounded-xl h-8"
              >
                Complete Verification
              </Button>
            </div>
          )}
        </div>

        {/* Financial Commission Transparency Notice */}
        <div className="bg-gradient-to-r from-[#FFF5E5] to-[#FFE8D6] rounded-2xl p-3.5 border border-[#E8D5C4] text-xs text-[#1a1a1a] space-y-1.5">
          <div className="flex items-center gap-2 text-[#A35233] font-bold">
            <Percent className="h-4 w-4" />
            Marketplace Commission: 12%
          </div>
          <p className="text-[11px] text-gray-600 leading-snug">
            Barakah charges a transparent 12% marketplace commission per completed sale.
          </p>
          <div className="bg-white/80 rounded-xl p-2 font-mono text-[10px] text-gray-700 space-y-0.5 border border-[#E8D5C4]">
            <div className="flex justify-between"><span>Gross Sale:</span><span>₹10,000</span></div>
            <div className="flex justify-between text-red-600"><span>Barakah Commission (12%):</span><span>-₹1,200</span></div>
            <div className="flex justify-between font-bold text-green-800 border-t border-gray-200 pt-0.5"><span>Net Seller Payout:</span><span>₹8,800</span></div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            title="Total Sales"
            value={`₹${metrics.totalSales.toLocaleString('en-IN')}`}
            icon={<TrendingUp className="h-5 w-5 text-[#A35233]" />}
          />
          <MetricCard
            title="Total Orders"
            value={metrics.totalOrders.toString()}
            icon={<ClipboardList className="h-5 w-5 text-[#A35233]" />}
          />
          <MetricCard
            title="Pending Orders"
            value={metrics.pendingOrdersCount.toString()}
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            badge={metrics.pendingOrdersCount > 0 ? 'Action Needed' : undefined}
          />
          <MetricCard
            title="Products Live"
            value={metrics.totalProductsCount.toString()}
            icon={<Package className="h-5 w-5 text-[#A35233]" />}
          />
        </div>

        {/* Earnings Summary Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 border border-[#E8D5C4] text-center space-y-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Available</p>
            <p className="text-sm font-extrabold text-green-700">₹{metrics.availableEarnings.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-[#E8D5C4] text-center space-y-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Pending</p>
            <p className="text-sm font-extrabold text-amber-700">₹{metrics.pendingEarnings.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-[#E8D5C4] text-center space-y-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Paid Out</p>
            <p className="text-sm font-extrabold text-[#A35233]">₹{metrics.totalPaidOut.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Quick Action Navigation Grid */}
        <div className="grid grid-cols-2 gap-3">
          <ActionBtn
            icon={<Plus className="h-6 w-6" />}
            label="Add / View Products"
            onClick={() => navigate('/seller/products')}
          />
          <ActionBtn
            icon={<ClipboardList className="h-6 w-6" />}
            label="View Orders"
            onClick={() => navigate('/seller/orders')}
          />
          <ActionBtn
            icon={<Wallet className="h-6 w-6" />}
            label="Earnings & Payouts"
            onClick={() => navigate('/seller/earnings')}
          />
          <ActionBtn
            icon={<Store className="h-6 w-6" />}
            label="Manage Store"
            onClick={() => navigate('/seller-onboarding')}
          />
        </div>

        {/* Recent Orders Section */}
        <div className="bg-white rounded-2xl p-4 border border-[#E8D5C4] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1a1a1a]">Recent Orders</h3>
            <button
              onClick={() => navigate('/seller/orders')}
              className="text-xs font-semibold text-[#A35233] underline flex items-center gap-1"
            >
              View All <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-[#E8D5C4] rounded-xl text-gray-500 space-y-1">
              <Package className="h-8 w-8 text-[#A35233]/40 mx-auto" />
              <p className="text-xs font-semibold text-[#1a1a1a]">No orders received yet</p>
              <p className="text-[11px] text-gray-400">Your customer orders will appear here once placed.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/seller/orders/${order.id}`)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#E8D5C4] bg-[#FFF1DD]/30 hover:bg-[#FFF1DD] transition-colors cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-bold text-[#1a1a1a]">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-[10px] text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#A35233]">₹{order.total_amount.toLocaleString('en-IN')}</p>
                    <span className="text-[10px] font-semibold text-amber-700 capitalize">{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products Section */}
        <div className="bg-white rounded-2xl p-4 border border-[#E8D5C4] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1a1a1a]">Top Products</h3>
            <button
              onClick={() => navigate('/seller/products')}
              className="text-xs font-semibold text-[#A35233] underline flex items-center gap-1"
            >
              Manage Products <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-[#E8D5C4] rounded-xl text-gray-500 space-y-1">
              <Store className="h-8 w-8 text-[#A35233]/40 mx-auto" />
              <p className="text-xs font-semibold text-[#1a1a1a]">No products listed</p>
              <p className="text-[11px] text-gray-400">
                Your best-selling products will appear here once you start receiving orders.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((prod) => (
                <div key={prod.id} className="flex items-center gap-3 p-2 rounded-xl border border-[#E8D5C4] bg-white">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 border border-[#E8D5C4] overflow-hidden flex-shrink-0">
                    {prod.image_url ? (
                      <img src={prod.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-gray-400 m-auto mt-2.5" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-[#1a1a1a] truncate">{prod.title}</p>
                    <p className="text-[11px] font-semibold text-[#A35233]">₹{prod.price}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  badge?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, badge }) => (
  <div className="bg-white rounded-2xl p-3.5 border border-[#E8D5C4] shadow-sm relative space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-gray-500 uppercase">{title}</span>
      {icon}
    </div>
    <div className="text-lg font-extrabold text-[#78351A]">{value}</div>
    {badge && (
      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
        {badge}
      </span>
    )}
  </div>
);

interface ActionBtnProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const ActionBtn: React.FC<ActionBtnProps> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white rounded-2xl p-4 border border-[#E8D5C4] shadow-sm flex flex-col items-center justify-center gap-2 text-center text-[#A35233] hover:bg-[#FFF1DD]/50 transition-colors"
  >
    {icon}
    <span className="text-xs font-bold text-[#1a1a1a]">{label}</span>
  </button>
);

export default SellerDashboard;
