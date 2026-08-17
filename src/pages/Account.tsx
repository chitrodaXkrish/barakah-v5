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
  Store,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
  const fallbackName = useMemo(
    () => user?.displayName || user?.email?.split('@')[0] || '',
    [user?.displayName, user?.email],
  );
  const [fullName, setFullName] = useState(fallbackName);
  const [profileName, setProfileName] = useState(fallbackName);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    let active = true;
    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.uid)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setProfileName(fallbackName);
        setFullName(fallbackName);
        return;
      }

      const nextName = data?.full_name || fallbackName;
      setProfileName(nextName);
      setFullName(nextName);
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [fallbackName, user?.uid]);

  const getAccountOptions = () => {
    const baseOptions = [
      { icon: Lock, label: t('account.change_password'), action: () => navigate('/change-password') },
      { icon: TrendingUp, label: t('account.profile'), action: () => navigate('/progress') },
      { icon: ShoppingBag, label: t('account.orders'), action: () => navigate('/orders') },
      { icon: MapPin, label: t('menu.location'), action: () => navigate('/location') },
    ];

    if (userRole === 'seller') {
      baseOptions.unshift({
        icon: Store,
        label: t('menu.seller_dashboard'),
        action: () => navigate('/seller-dashboard')
      });
    }

    return baseOptions;
  };

  const accountOptions = getAccountOptions();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(t('account.log_out_error') || 'Failed to sign out');
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast.error('Please enter your name');
      return;
    }

    setSavingProfile(true);

    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: trimmedName },
    });

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        { user_id: user.uid, full_name: trimmedName },
        { onConflict: 'user_id' },
      );

    setSavingProfile(false);

    const error = authError || profileError;
    if (error) {
      toast.error(error.message || 'Could not update profile');
      return;
    }

    setProfileName(trimmedName);
    setFullName(trimmedName);
    setIsEditingProfile(false);
    toast.success('Profile updated');
  };

  const handleCancelEdit = () => {
    setFullName(profileName);
    setIsEditingProfile(false);
  };

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
        <h1 className="text-2xl font-bold" style={{ color: BROWN_DARK }}>{t('account.title')}</h1>

        {/* User Info */}
        <Card className="p-4 rounded-2xl shadow-sm" style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <div className="flex items-start space-x-3 mb-3">
            <div className="p-3 rounded-full" style={{ backgroundColor: SOFT_ACCENT }}>
              <User className="h-6 w-6" style={{ color: BROWN }} />
            </div>
            <div className="flex-1 min-w-0">
              {isEditingProfile ? (
                <div className="space-y-2">
                  <label className="text-sm font-semibold" style={{ color: BROWN_DARK }} htmlFor="profile-name">
                    {t('account.edit_profile')}
                  </label>
                  <Input
                    id="profile-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    style={{ backgroundColor: '#FFFFFF', borderColor: BORDER }}
                  />
                </div>
              ) : (
                <>
                  <p className="font-semibold truncate" style={{ color: BROWN_DARK }}>
                    {profileName || user?.email}
                  </p>
                  <p className="text-sm truncate" style={{ color: MUTED }}>
                    {user?.email}
                  </p>
                </>
              )}
            </div>
            {!isEditingProfile && (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: SOFT_ACCENT, color: BROWN }}
                aria-label="Edit profile"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}
          </div>
          {isEditingProfile && (
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex-1 rounded-full gap-2"
                style={{ backgroundColor: BROWN }}
              >
                <Save className="h-4 w-4" />
                {savingProfile ? t('cart.processing') : t('account.edit_profile')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={savingProfile}
                className="rounded-full gap-2"
                style={{ borderColor: BORDER, color: BROWN_DARK }}
              >
                <X className="h-4 w-4" />
                {t('login.back')}
              </Button>
            </div>
          )}
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
            onClick={handleLogout}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <LogOut className="h-5 w-5" style={{ color: DANGER }} />
                <span className="font-semibold" style={{ color: DANGER }}>{t('account.log_out')}</span>
              </div>
              <ChevronRight className="h-5 w-5" style={{ color: DANGER, opacity: 0.5 }} />
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
