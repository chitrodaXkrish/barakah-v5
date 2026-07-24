import { createContext, useContext, useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

// Custom URL scheme used by the native OAuth deep-link callback.
// Must be added to Supabase Auth allowed redirect URLs.
const NATIVE_REDIRECT_URL = 'com.barakah.services://auth/callback';

const isNative = () => Capacitor.isNativePlatform();

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
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<{ error: any; role?: UserRole }>;
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
      CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        try {
          if (!url || !url.startsWith('com.barakah.services://')) return;
          const { access_token, refresh_token, error } = parseAuthUrl(url);
          if (error) {
            console.error('OAuth callback error:', error);
          } else if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        } catch (e) {
          console.error('appUrlOpen handler failed:', e);
        } finally {
          try { await Browser.close(); } catch {}
        }
      }).then((handle) => { removeListener = () => handle.remove(); });
    }

    return () => {
      sub.subscription.unsubscribe();
      removeListener?.();
    };
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) return { error, role: undefined };
      const newUser = data.user;
      if (!newUser) return { error: { message: 'User creation failed' }, role: undefined };

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUser.id, role });
      if (roleError && roleError.code !== '23505') return { error: roleError, role: undefined };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ user_id: newUser.id, full_name: fullName }, { onConflict: 'user_id' });
      if (profileError) return { error: profileError, role: undefined };

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

      // Ensure role row exists
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role });

      // If role already exists, ignore the unique error
      if (roleError && roleError.code !== '23505') {
        return { error: roleError, role: undefined };
      }

      // Upsert profile (profiles.user_id is unique)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            full_name: fullName,
          },
          { onConflict: 'user_id' }
        );

      if (profileError) return { error: profileError, role: undefined };

      setUserRole(role);
      return { error: null, role };
    } catch (error: any) {
      return { error: { message: error.message || 'Account setup failed' }, role: undefined };
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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
