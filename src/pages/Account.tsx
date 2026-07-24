import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { 
  Lock, 
  TrendingUp, 
  ShoppingBag, 
  MapPin, 
  LogOut,
  ChevronRight,
  User,
  Store
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CREAM = '#FFF1DD';
const CARD = '#FFF8F3';
const BORDER = '#E8D5C4';
const BROWN = '#A35233';
const BROWN_DARK = '#3A1E12';
const MUTED = '#7C6A4F';
const SOFT_ACCENT = '#F5E6D0';
const DANGER = '#D63A1F';

export const Account = () => {
  const { signOut, user, userRole } = useAuth();
  const navigate = useNavigate();

  const getAccountOptions = () => {
    const baseOptions = [
      { icon: Lock, label: 'Change Password', action: () => navigate('/change-password') },
      { icon: TrendingUp, label: 'My Progress', action: () => navigate('/progress') },
      { icon: ShoppingBag, label: 'My Orders', action: () => navigate('/orders') },
      { icon: MapPin, label: 'Location', action: () => navigate('/location') },
    ];

    if (userRole === 'seller') {
      baseOptions.unshift({
        icon: Store,
        label: 'Seller Dashboard',
        action: () => navigate('/seller-dashboard')
      });
    }

    return baseOptions;
  };

  const accountOptions = getAccountOptions();

  const getRoleBadge = () => {
    if (!userRole) return null;
    
    const roleLabels = {
      normal_user: 'Normal User',
      seller: 'Seller',
      travel_partner: 'Travel Partner'
    };

    return (
      <div className="flex items-center justify-center mb-4">
        <div className="px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: BROWN }}>
          {roleLabels[userRole]}
        </div>
      </div>
    );
  };

  return (
    <Layout pageBackgroundColor={CREAM}>
      <div className="min-h-screen px-4 py-6 space-y-6" style={{ backgroundColor: CREAM }}>
        <h1 className="text-2xl font-bold" style={{ color: BROWN_DARK }}>Account</h1>

        {/* User Info */}
        <Card className="p-4 rounded-2xl shadow-sm" style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-3 rounded-full" style={{ backgroundColor: SOFT_ACCENT }}>
              <User className="h-6 w-6" style={{ color: BROWN }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: BROWN_DARK }}>{user?.email}</p>
              <p className="text-sm" style={{ color: MUTED }}>Manage your account</p>
            </div>
          </div>
          {getRoleBadge()}
        </Card>

        {/* Account Options */}
        <div className="space-y-3">
          {accountOptions.map(({ icon: Icon, label, action }) => (
            <Card 
              key={label} 
              className="p-4 rounded-2xl cursor-pointer shadow-sm transition-shadow hover:shadow-md"
              style={{ backgroundColor: CARD, borderColor: BORDER }}
              onClick={action}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5" style={{ color: BROWN }} />
                  <span className="font-semibold" style={{ color: BROWN_DARK }}>{label}</span>
                </div>
                <ChevronRight className="h-5 w-5" style={{ color: MUTED }} />
              </div>
            </Card>
          ))}

          {/* Logout Button */}
          <Card 
            className="p-4 rounded-2xl cursor-pointer shadow-sm transition-shadow hover:shadow-md"
            style={{ backgroundColor: CARD, borderColor: '#F0C8BD' }}
            onClick={signOut}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <LogOut className="h-5 w-5" style={{ color: DANGER }} />
                <span className="font-semibold" style={{ color: DANGER }}>Logout</span>
              </div>
              <ChevronRight className="h-5 w-5" style={{ color: DANGER, opacity: 0.5 }} />
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
