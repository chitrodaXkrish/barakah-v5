import { createContext, useContext, useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { useClerk } from '@clerk/clerk-react';

// Custom URL scheme used by the native OAuth deep-link callback.
// Must be added to Supabase Auth allowed redirect URLs.
const NATIVE_REDIRECT_URL = 'com.barakah.services://auth/callback';

const isNative = () => Capacitor.isNativePlatform();
const isNativeAuthCallback = (url?: string | null) =>
  Boolean(url?.startsWith('com.barakah.services://auth/'));

// Parse tokens from a Supabase OAuth callback URL (hash or query).
const parseAuthUrl = (url: string) => {
  const u = new URL(url);
  const params = new URLSearchParams(
    (u.hash?.startsWith('#') ? u.hash.slice(1) : u.search.slice(1)) || u.search.slice(1)
  );
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    error: params.get('error_description') || params.get('error'),
  };
};

type UserRole = 'normal_user' | 'seller' | 'travel_partner' | null;

// App-facing user type. `uid` is kept as an alias of Supabase's `id`
// so existing code that reads `user.uid` continues to work.
export interface AppUser extends SupabaseUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  userRole: UserRole;
  loading: boolean;
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<{ error: any; role?: UserRole; needsEmailVerification?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: any; role?: UserRole }>;
  signInWithGoogle: () => Promise<{ error: any; role?: UserRole }>;
  signInWithApple: () => Promise<{ error: any; role?: UserRole }>;
  completeAccountSetup: (role: Exclude<UserRole, null>, fullName: string) => Promise<{ error: any; role?: UserRole }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toAppUser = (u: SupabaseUser | null | undefined): AppUser | null =>
  u
    ? (Object.assign({}, u, {
      uid: u.id,
      displayName:
        (u.user_metadata?.full_name as string | undefined) ??
        (u.user_metadata?.name as string | undefined) ??
        null,
      photoURL:
        (u.user_metadata?.avatar_url as string | undefined) ??
        (u.user_metadata?.picture as string | undefined) ??
        null,
    }) as AppUser)
    : null;

const getUserRoleFromDatabase = async (userId: string): Promise<UserRole> => {
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (roleError) throw roleError;
  if (roleData?.role) return roleData.role as UserRole;

  const { data: sellerProfile, error: sellerProfileError } = await supabase
    .from('seller_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (sellerProfileError) throw sellerProfileError;
  return sellerProfile ? 'seller' : null;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { signOut: signOutClerk } = useClerk();
  const [user, setUser] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth listener FIRST, then check for existing session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const appUser = toAppUser(session?.user);
      setUser(appUser);
      if (appUser) {
        // Defer role fetch to avoid deadlocks inside the callback.
        setTimeout(() => { fetchUserRole(appUser.id); }, 0);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const appUser = toAppUser(session?.user);
      setUser(appUser);
      if (appUser) {
        fetchUserRole(appUser.id);
      }
      setLoading(false);
    });

    // Native deep-link listener: receive the OAuth callback URL and
    // establish the Supabase session from the returned tokens.
    let removeListener: (() => void) | undefined;
    if (isNative()) {
      const handleNativeAuthCallback = async (url?: string | null) => {
        try {
          console.log('NATIVE AUTH CALLBACK URL:', url)
          if (!isNativeAuthCallback(url)) return;
          const { access_token, refresh_token, error } = parseAuthUrl(url);
          console.log('NATIVE AUTH CALLBACK PARSED:', { access_token, refresh_token, error })
          if (error) {
            console.error('OAuth callback error:', error);
          } else if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        } catch (e) {
          console.error('appUrlOpen handler failed:', e);
        } finally {
          try { await Browser.close(); } catch { }
        }
      };

      CapacitorApp.addListener('appUrlOpen', ({ url }) => handleNativeAuthCallback(url))
        .then((handle) => { removeListener = () => handle.remove(); });
      CapacitorApp.getLaunchUrl()
        .then(({ url }) => handleNativeAuthCallback(url))
        .catch(() => undefined);
    }

    return () => {
      sub.subscription.unsubscribe();
      removeListener?.();
    };
  }, []);

  // Listen for native push token events and attach token to user metadata
  useEffect(() => {
    const handler = async (e: any) => {
      const token = e?.detail?.value || e?.detail || e;
      if (!token) return;
      try {
        const session = await supabase.auth.getSession();
        const user = session.data.session?.user;
        if (!user) return;
        // Update user metadata with push token; server should read this and send notifications
        await supabase.auth.updateUser({ data: { push_token: token } });
      } catch (err) {
        console.warn('Failed to save push token to user metadata', err);
      }
    };

    window.addEventListener('pushToken', handler as EventListener);
    return () => { window.removeEventListener('pushToken', handler as EventListener); };
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const role = await getUserRoleFromDatabase(userId);
      setUserRole(role);
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setUserRole(null);
    }
  };

  const signUp = async (email: string, password: string, role: UserRole, fullName: string) => {
    try {
      if (!role) return { error: { message: 'Please select a profile type' }, role: undefined };
      if (!fullName.trim()) return { error: { message: 'Please enter your full name' }, role: undefined };
      if (password.length < 6) return { error: { message: 'Password must be at least 6 characters' }, role: undefined };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            full_name: fullName.trim(),
          },
        },
      });

      if (error) return { error, role: undefined };

      if (!data.session) {
        return { error: null, role, needsEmailVerification: true };
      }

      setUserRole(role);
      return { error: null, role };
    } catch (error: any) {
      return { error: { message: error.message || 'Sign up failed' }, role: undefined };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error, role: undefined };
      const authedUser = data.user;
      if (!authedUser) return { error: { message: 'Sign in failed' }, role: undefined };

      const role = await getUserRoleFromDatabase(authedUser.id);
      setUserRole(role);
      return { error: null, role };
    } catch (error: any) {
      return { error: { message: error.message || 'Sign in failed' }, role: undefined };
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      if (isNative()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: NATIVE_REDIRECT_URL,
            skipBrowserRedirect: true,
          },
        });
        if (error) return { error, role: undefined };
        if (data?.url) {
          await Browser.open({ url: data.url, presentationStyle: 'popover' });
        }
        return { error: null, role: null };
      }
      const result: any = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: `${window.location.origin}/`,
      });
      if (result?.error) return { error: result.error, role: undefined };
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return { error: null, role: null };
      const role = await getUserRoleFromDatabase(authData.user.id);
      setUserRole(role);
      return { error: null, role };
    } catch (error: any) {
      return { error: { message: error.message || 'Google sign in failed' }, role: undefined };
    }
  };

  const handleAppleSignIn = async () => {
    try {
      if (isNative()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: NATIVE_REDIRECT_URL,
            skipBrowserRedirect: true,
          },
        });
        if (error) return { error, role: undefined };
        if (data?.url) {
          await Browser.open({ url: data.url, presentationStyle: 'popover' });
        }
        return { error: null, role: null };
      }
      const result: any = await lovable.auth.signInWithOAuth('apple', {
        redirect_uri: `${window.location.origin}/`,
      });
      if (result?.error) return { error: result.error, role: undefined };
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return { error: null, role: null };
      const role = await getUserRoleFromDatabase(authData.user.id);
      setUserRole(role);
      return { error: null, role };
    } catch (error: any) {
      return { error: { message: error.message || 'Apple sign in failed' }, role: undefined };
    }
  };

  const completeAccountSetup = async (role: Exclude<UserRole, null>, fullName: string) => {
    try {
      if (!user) return { error: { message: 'You must be signed in to complete setup.' }, role: undefined };
      if (!fullName.trim()) return { error: { message: 'Please enter your full name' }, role: undefined };

      const { data, error } = await supabase.rpc('complete_account_setup', {
        _role: role,
        _full_name: fullName.trim(),
      });

      if (error) return { error, role: undefined };

      const resolvedRole = (data as UserRole) || role;
      setUserRole(resolvedRole);
      return { error: null, role: resolvedRole };
    } catch (error: any) {
      return { error: { message: error.message || 'Account setup failed' }, role: undefined };
    }
  };

  const handleSignOut = async () => {
    await Promise.allSettled([
      supabase.auth.signOut(),
      signOutClerk(),
    ]);
    setUser(null);
    setUserRole(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      userRole,
      loading,
      signUp,
      signIn,
      signInWithGoogle: handleGoogleSignIn,
      signInWithApple: handleAppleSignIn,
      completeAccountSetup,
      signOut: handleSignOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
