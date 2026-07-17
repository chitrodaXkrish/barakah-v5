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
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium">
          {roleLabels[userRole]}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-primary">Account</h1>

        {/* User Info */}
        <Card className="p-4 rounded-2xl bg-card">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-secondary p-3 rounded-full">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{user?.email}</p>
              <p className="text-sm text-muted-foreground">Manage your account</p>
            </div>
          </div>
          {getRoleBadge()}
        </Card>

        {/* Account Options */}
        <div className="space-y-3">
          {accountOptions.map(({ icon: Icon, label, action }) => (
            <Card 
              key={label} 
              className="p-4 rounded-2xl cursor-pointer hover:shadow-lg transition-shadow bg-card"
              onClick={action}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">{label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          ))}

          {/* Logout Button */}
          <Card 
            className="p-4 rounded-2xl cursor-pointer hover:shadow-lg transition-shadow border-destructive/20 bg-card"
            onClick={signOut}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <LogOut className="h-5 w-5 text-destructive" />
                <span className="font-medium text-destructive">Logout</span>
              </div>
              <ChevronRight className="h-5 w-5 text-destructive/50" />
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
