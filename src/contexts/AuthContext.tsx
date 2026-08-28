import React, { createContext, useContext, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import MarketplaceService, { Organization } from '../services/marketplaceService';

// Types
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  // State
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  session: Session | null;
  loading: boolean;
  passwordRecovery: boolean;
  
  // Auth methods
  signUp: (email: string, password: string, fullName?: string, phone?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  cancelPasswordRecovery: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshAccount: () => Promise<void>;
  
  // Utility methods
  isAdmin: boolean;
  isStoreOwner: boolean;
  isCustomer: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  // Initialize auth state
  useEffect(() => {
    const handleAuthUrl = async (url: string | null) => {
      if (!url || !url.startsWith('ihearvoices://')) return;

      const parameterText = url.includes('#')
        ? url.slice(url.indexOf('#') + 1)
        : url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
      const parameters = new URLSearchParams(parameterText);
      const type = parameters.get('type');
      const code = parameters.get('code');
      const accessToken = parameters.get('access_token');
      const refreshToken = parameters.get('refresh_token');

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        if (type === 'recovery' || url.includes('reset-password')) {
          setPasswordRecovery(true);
        }
      } catch (error) {
        console.error('Could not open authentication link:', error);
      }
    };

    Linking.getInitialURL().then(handleAuthUrl);
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url));

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setOrganization(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          await createProfile(userId);
          return;
        }
      } else {
        setProfile(data);
        const ownedOrganization = await MarketplaceService.getOwnedOrganization(userId);
        setOrganization(ownedOrganization);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAccount = async () => {
    if (user?.id) await fetchProfile(user.id);
  };

  // Create user profile
  const createProfile = async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      
      if (!email) {
        throw new Error('No email found for user');
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            email: email,
            full_name: null,
            phone: null,
            avatar_url: null,
            role: 'user',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in createProfile:', error);
    }
  };

  // Sign up
  const signUp = async (email: string, password: string, fullName?: string, phone?: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      });
      
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      // Account switching only needs to revoke the session on this device.
      // A global revoke can fail when offline or when another session has
      // already expired, leaving the local app apparently signed in.
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      // Clear React state even if the network/auth endpoint is unavailable.
      // The local scope call also removes the persisted SecureStore session.
      setSession(null);
      setUser(null);
      setProfile(null);
      setOrganization(null);
      setPasswordRecovery(false);
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'ihearvoices://reset-password',
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) setPasswordRecovery(false);
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const cancelPasswordRecovery = async () => {
    setPasswordRecovery(false);
    await supabase.auth.signOut();
  };

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) {
        return { error: new Error('No user logged in') };
      }

      // Only update fields that exist in the database schema
      const validUpdates = {
        ...(updates.full_name !== undefined && { full_name: updates.full_name }),
        ...(updates.phone !== undefined && { phone: updates.phone }),
        ...(updates.avatar_url !== undefined && { avatar_url: updates.avatar_url }),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(validUpdates)
        .eq('id', user.id);

      if (error) {
        console.error('Database update failed:', error);
        return { error };
      }

      // Refresh profile
      await fetchProfile(user.id);
      return { error: null };
    } catch (error) {
      console.error('Profile update error:', error);
      return { error: error as Error };
    }
  };

  // Computed values
  const isAdmin = profile?.role === 'admin';
  const isStoreOwner = !isAdmin && !!organization;
  const isCustomer = !!profile && !isAdmin && !organization;
  const isAuthenticated = !!user && !!profile;

  const value: AuthContextType = {
    // State
    user,
    profile,
    organization,
    session,
    loading,
    passwordRecovery,
    
    // Methods
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    cancelPasswordRecovery,
    updateProfile,
    refreshAccount,
    
    // Computed
    isAdmin,
    isStoreOwner,
    isCustomer,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
