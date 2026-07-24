import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Briefcase, Plane, ArrowLeft, Star, Chrome } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import loginFullBg from '@/assets/login-full-bg.png.asset.json';
import { assetUrl } from '@/lib/assetUrl';

type UserRole = 'normal_user' | 'seller' | 'travel_partner';

export const Register = () => {
  const [view, setView] = useState<'welcome' | 'profile' | 'details'>('welcome');
  const step = view;
  const setStep = setView;
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignIn, setIsSignIn] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { signUp, signIn, signInWithGoogle, signInWithApple, completeAccountSetup } = useAuth();
  const { t } = useLanguage();

  const resolveCurrentAccountRole = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) return null;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (roleData?.role) return roleData.role as UserRole;

    const { data: sellerProfile } = await supabase
      .from('seller_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    return sellerProfile ? 'seller' : null;
  };

  const routeByRole = async (role: UserRole | null | undefined) => {
    if (role === 'seller') {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (userId) {
        const { data: sellerProfile } = await supabase
          .from('seller_profiles')
          .select('onboarding_completed')
          .eq('user_id', userId)
          .maybeSingle();

        navigate(sellerProfile?.onboarding_completed ? '/seller-dashboard' : '/seller-onboarding');
        return;
      }

      navigate('/seller-onboarding');
    } else if (role === 'travel_partner') navigate('/business-account');
    else navigate('/');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error, role } = await signInWithGoogle();
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const resolvedRole = role ?? await resolveCurrentAccountRole();
    if (resolvedRole === null) {
      toast.message('Finish setup', { description: 'Please choose your account type to continue.' });
      setNeedsSetup(true);
      setIsSignIn(false);
      setView('profile');
      setSelectedRole(null);
      setFullName('');
      setLoading(false);
      return;
    }
    toast.success('Welcome back! You already have an account — signing you in.');
    await routeByRole(resolvedRole);
    setLoading(false);
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    const { error, role } = await signInWithApple();
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const resolvedRole = role ?? await resolveCurrentAccountRole();
    if (resolvedRole === null) {
      toast.message('Finish setup', { description: 'Please choose your account type to continue.' });
      setNeedsSetup(true);
      setIsSignIn(false);
      setView('profile');
      setSelectedRole(null);
      setFullName('');
      setLoading(false);
      return;
    }
    toast.success('Welcome back! You already have an account — signing you in.');
    await routeByRole(resolvedRole);
    setLoading(false);
  };

  const profileOptions = [
    { role: 'normal_user' as UserRole, icon: User, titleKey: 'login.normal_user', descKey: 'login.normal_user_desc' },
    { role: 'seller' as UserRole, icon: Briefcase, titleKey: 'login.seller', descKey: 'login.seller_desc' },
    { role: 'travel_partner' as UserRole, icon: Plane, titleKey: 'login.travel_partner', descKey: 'login.travel_partner_desc' },
  ];

  const handleContinueEmail = () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    // Email-first: go to details for sign in by default; sign-up path goes through profile
    setIsSignIn(true);
    setView('details');
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setView('details');
  };

  const handleSubmit = async () => {
    if (needsSetup) {
      if (!selectedRole) return toast.error('Please select a profile type');
      if (!fullName) return toast.error('Please enter your full name');
      setLoading(true);
      try {
        const { error, role } = await completeAccountSetup(selectedRole, fullName);
        if (error) return toast.error(error.message);
        toast.success('Account setup completed!');
        setNeedsSetup(false);
        await routeByRole(role);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) return toast.error('Please fill in all fields');
    if (!isSignIn && !selectedRole) return toast.error('Please select a profile type');

    setLoading(true);
    try {
      if (isSignIn) {
        const { error, role } = await signIn(email, password);
        if (error) {
          if (String(error.message).includes('auth/user-not-found')) {
            toast.error('No account found. Please create an account first.');
            setIsSignIn(false);
            setView('profile');
          } else {
            toast.error(error.message);
          }
        } else {
          const resolvedRole = role ?? await resolveCurrentAccountRole();
          if (resolvedRole === null) {
            toast.message('Finish setup', { description: 'Please choose your account type to continue.' });
            setNeedsSetup(true);
            setIsSignIn(false);
            setView('profile');
          } else {
            toast.success('Signed in successfully!');
            await routeByRole(resolvedRole);
          }
        }
      } else {
        if (!fullName) {
          toast.error('Please enter your full name');
          setLoading(false);
          return;
        }
        const { error, role } = await signUp(email, password, selectedRole, fullName);
        if (error) {
          const msg = String(error.message || '');
          if (msg.includes('auth/email-already-in-use')) {
            toast.error('An account with this email already exists. Please sign in.');
            setPassword('');
            setFullName('');
            setSelectedRole(null);
            setIsSignIn(true);
            setView('details');
          } else if (error.code === '23505' || msg.toLowerCase().includes('duplicate')) {
            // Role/profile row already exists — user is already registered
            toast.error('You already have an account. Please sign in.');
            setPassword('');
            setIsSignIn(true);
            setView('details');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Account created successfully!');
          let destination = '/';
          if (role === 'seller') destination = '/seller-onboarding';
          else if (role === 'travel_partner') destination = '/business-account';
          localStorage.setItem('barakah_onboarding_destination', destination);
          navigate('/onboarding');
        }
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (view === 'details') {
      setView(isSignIn ? 'welcome' : 'profile');
    } else if (view === 'profile') {
      setView('welcome');
    }
  };

  const getSelectedRoleTitle = () => {
    const option = profileOptions.find((p) => p.role === selectedRole);
    return option ? t(option.titleKey) : '';
  };

  return (
    <div
      className="min-h-screen max-w-md mx-auto relative overflow-hidden flex flex-col"
      style={{
        backgroundImage: `url(${assetUrl(loginFullBg)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#FFF5E5',
      }}
    >
      {/* Language selector */}
      <div className="absolute top-3 right-3 z-30">
        <LanguageSelector />
      </div>

      {/* Spacer to push card below the mosque graphic area */}
      <div className="h-[38vh] shrink-0" />

      {/* Bottom sheet card with login flows */}
      <div
        className="flex-1 overflow-y-auto px-6 pb-8 pt-8 relative z-10 rounded-t-[28px]"
        style={{ backgroundColor: '#FFF1DD' }}
      >
        {view === 'welcome' && (
          <div className="space-y-3">
            {/* Google */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              variant="outline"
              className="w-full h-14 rounded-full bg-white border border-[#E5D8C3] hover:bg-white text-[#1a1a1a] text-base font-medium"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>

            {/* OR */}
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-[#D9C9A8]" />
              <span className="text-xs text-[#7c6a4f] tracking-widest">OR</span>
              <div className="flex-1 h-px bg-[#D9C9A8]" />
            </div>

            {/* Email */}
            <div className="relative">
              <Star className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#A8A8A8]" />
              <Input
                type="email"
                placeholder="Continue with Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-full bg-[#FFF5E5] border border-[#EADFC9] pl-12 pr-4 text-[15px] text-[#1a1a1a] caret-[#A35334] placeholder:text-[#9a8a70] focus-visible:ring-0 focus-visible:ring-offset-0"
                dir="ltr"
              />
            </div>

            {/* Continue */}
            <Button
              onClick={handleContinueEmail}
              disabled={!email}
              className="w-full h-14 rounded-full text-base font-medium disabled:opacity-100"
              style={{
                backgroundColor: email ? '#A35334' : '#D7CFC0',
                color: email ? '#fff' : '#8a8170',
              }}
            >
              Continue
            </Button>

            {/* Divider */}
            <div className="h-px bg-[#D9C9A8] my-3" />

            {/* Business account link */}
            <button
              onClick={() => {
                setIsSignIn(false);
                setSelectedRole('seller');
                setView('details');
              }}
              className="w-full text-center text-[15px] font-semibold text-[#1a1a1a]"
            >
              Create a Business Account
            </button>

            {/* Terms */}
            <p className="text-[11px] text-[#7c6a4f] text-center px-6 leading-relaxed pt-6">
              By continuing, you agree to Barakah{' '}
              <Link
                to="/terms-of-service"
                className="underline font-semibold text-[#3a2a18] cursor-pointer"
              >
                Terms of Service
              </Link>
              <br />
              and{' '}
              <Link
                to="/privacy-policy"
                className="underline font-semibold text-[#3a2a18] cursor-pointer"
              >
                Privacy Policy.
              </Link>
            </p>
          </div>
        )}

        {view === 'profile' && (
          <div className="space-y-3">
            <button onClick={handleBack} className="flex items-center gap-1 text-[#5a3a20] text-sm mb-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="text-center mb-3">
              <h2 className="text-xl font-semibold" style={{ color: '#A35334', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {t('login.choose_profile')}
              </h2>
              <p className="text-sm text-[#7c6a4f]">{t('login.select_account_type')}</p>
            </div>
            {profileOptions.map(({ role, icon: Icon, titleKey, descKey }) => (
              <Card
                key={role}
                onClick={() => handleRoleSelect(role)}
                className="p-4 rounded-2xl cursor-pointer hover:shadow-md transition border bg-white/70 border-[#EADFC9]"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl" style={{ background: '#A35334' }}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#1a1a1a]">{t(titleKey)}</h3>
                    <p className="text-xs text-[#6b5a40]">{t(descKey)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {view === 'details' && (
          <div className="space-y-3">
            <button onClick={handleBack} className="flex items-center gap-1 text-[#5a3a20] text-sm mb-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="text-center mb-2">
              <h2 className="text-lg font-semibold" style={{ color: '#A35334', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {isSignIn ? t('login.welcome_back') : t('login.create_your_account')}
              </h2>
              <p className="text-sm text-[#7c6a4f]">
                {isSignIn ? t('login.enter_credentials') : `${t('login.sign_up_as')} ${getSelectedRoleTitle()}`}
              </p>
            </div>

            {!isSignIn && (
              <Input
                type="text"
                placeholder={t('login.full_name')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-14 rounded-full bg-[#FFF5E5] border border-[#EADFC9] px-5 text-[#1a1a1a] caret-[#A35334] placeholder:text-[#9a8a70] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            )}
            {!needsSetup && (
              <>
                <Input
                  type="email"
                  placeholder={t('login.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-full bg-[#FFF5E5] border border-[#EADFC9] px-5 text-[#1a1a1a] caret-[#A35334] placeholder:text-[#9a8a70] focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Input
                  type="password"
                  placeholder={t('login.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 rounded-full bg-[#FFF5E5] border border-[#EADFC9] px-5 text-[#1a1a1a] caret-[#A35334] placeholder:text-[#9a8a70] focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </>
            )}

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-14 rounded-full text-white text-base font-medium hover:opacity-90"
              style={{ backgroundColor: '#A35334' }}
            >
              {loading ? t('login.please_wait') : needsSetup ? 'Finish setup' : isSignIn ? t('login.sign_in') : t('login.create_account_btn')}
            </Button>

            {!needsSetup && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-[#D9C9A8]" />
                  <span className="text-xs text-[#7c6a4f] tracking-widest">OR</span>
                  <div className="flex-1 h-px bg-[#D9C9A8]" />
                </div>
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  variant="outline"
                  className="w-full h-14 rounded-full bg-white border border-[#E5D8C3] hover:bg-white text-[#1a1a1a] text-base font-medium"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {isSignIn ? 'Sign in with Google' : 'Sign up with Google'}
                </Button>
              </>
            )}

            {isSignIn && (
              <p className="text-sm text-center text-[#7c6a4f] pt-2">
                {t('login.dont_have_account')}{' '}
                <button
                  onClick={() => {
                    setIsSignIn(false);
                    setView('profile');
                  }}
                  className="text-[#A35334] font-semibold underline"
                >
                  {t('login.sign_up')}
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
