// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase/supabaseClient';

const AuthContext = createContext();

// Enhanced function to get user profile with better error handling
const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role, verified, active, username, email')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.warn('Error fetching user profile:', error);
      return { role: 'user', verified: false, active: false, username: '', email: '' };
    }
    
    return {
      role: data?.role || 'user',
      verified: data?.verified || false,
      active: data?.active || false,
      username: data?.username || '',
      email: data?.email || ''
    };
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return { role: 'user', verified: false, active: false, username: '', email: '' };
  }
};

// Enhanced function to ensure user exists in public.users table
const ensureUserInDatabase = async (user) => {
  try {
    console.log('🔄 Ensuring user exists in database:', user.email);
    
    // Check if user exists in public.users
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.warn('Error checking existing user:', fetchError);
    }

    // If user doesn't exist, create them
    if (!existingUser) {
      console.log('👤 Creating new user in public.users table...');
      
      // Generate username from available data
      const username = user.user_metadata?.username || 
                      user.user_metadata?.full_name || 
                      user.user_metadata?.name ||
                      user.email?.split('@')[0] || 
                      `user_${user.id.slice(0, 8)}`;

      const userData = {
        id: user.id,
        username: username,
        email: user.email,
        role: 'user',
        active: true,
        verified: false
      };

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') { // Unique violation
          console.log('✅ User already exists in database (likely from trigger)');
          // Fetch the existing user
          const { data: existing } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          return existing;
        }
        console.error('❌ Error creating user in public.users:', error);
        return null;
      }
      console.log('✅ New user created in public.users table');
      return data;
    }
    
    console.log('✅ User already exists in public.users table');
    return existingUser;
  } catch (error) {
    console.error('❌ Error ensuring user in database:', error);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState({
    role: 'user',
    verified: false,
    active: false,
    username: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Helper functions
  const isLockedOut = useCallback(() => {
    return user && (!userProfile.verified || !userProfile.active);
  }, [user, userProfile.verified, userProfile.active]);

  const canAccess = useCallback(() => {
    return user && userProfile.verified && userProfile.active;
  }, [user, userProfile.verified, userProfile.active]);

  const isAdmin = useCallback(() => {
    return user && userProfile.role === 'admin' && userProfile.verified && userProfile.active;
  }, [user, userProfile.role, userProfile.verified, userProfile.active]);

  // Enhanced session initialization
  const initializeAuth = useCallback(async () => {
    try {
      console.log('🔄 Initializing auth session...');
      setLoading(true);
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setError(sessionError.message);
        return;
      }

      console.log('📋 Session found:', session?.user?.email);

      if (session?.user) {
        console.log('👤 User authenticated, ensuring in database...');
        
        // Ensure user exists in public.users table
        const dbUser = await ensureUserInDatabase(session.user);
        
        // Get user profile including verification status
        const profile = await getUserProfile(session.user.id);
        console.log('🎭 User profile:', profile);
        
        setUser(session.user);
        setUserProfile(profile);
        setError(null);
      } else {
        console.log('❌ No session found');
        setUser(null);
        setUserProfile({
          role: 'user',
          verified: false,
          active: false,
          username: '',
          email: ''
        });
        setError(null);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setSessionChecked(true);
    }
  }, []);

  // Session persistence and auto-refresh
  useEffect(() => {
    let mounted = true;

    const setupAuthListener = () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔄 Auth state changed:', event, session?.user?.email);
          
          if (!mounted) return;

          try {
            if (session?.user) {
              console.log('👤 Auth change - user present, ensuring in database...');
              
              // Ensure user exists in public.users table
              await ensureUserInDatabase(session.user);
              
              // Get user profile including verification status
              const profile = await getUserProfile(session.user.id);
              console.log('🎭 User profile:', profile);
              
              if (mounted) {
                setUser(session.user);
                setUserProfile(profile);
                setError(null);
              }
            } else {
              console.log('👤 Auth change - no user');
              setUser(null);
              setUserProfile({
                role: 'user',
                verified: false,
                active: false,
                username: '',
                email: ''
              });
              setError(null);
            }
          } catch (error) {
            console.error('Auth state change error:', error);
            setError(error.message);
          }
        }
      );

      return subscription;
    };

    // Initialize auth and set up listener
    initializeAuth();
    const subscription = setupAuthListener();

    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Auth loading timeout - forcing loading to false');
        setLoading(false);
        setSessionChecked(true);
      }
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  // Auto-refresh session before it expires
  useEffect(() => {
    if (!user) return;

    const refreshSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session refresh error:', error);
          return;
        }
        
        if (session) {
          console.log('🔄 Session refreshed automatically');
        }
      } catch (error) {
        console.error('Auto-refresh error:', error);
      }
    };

    // Refresh session every 30 minutes
    const refreshInterval = setInterval(refreshSession, 30 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [user]);

  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setUserProfile({
        role: 'user',
        verified: false,
        active: false,
        username: '',
        email: ''
      });
      setError(null);
      console.log('✅ Logout successful');
    } catch (err) {
      console.error('❌ Logout failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      
      if (error) throw error;
      
      console.log('✅ Google OAuth initiated');
      return data;
    } catch (err) {
      console.error('❌ Google login failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    
    try {
      const profile = await getUserProfile(user.id);
      setUserProfile(profile);
      console.log('✅ User profile refreshed');
    } catch (error) {
      console.error('❌ Error refreshing user profile:', error);
    }
  };

  const clearError = () => setError(null);

  const value = {
    // State
    user,
    userRole: userProfile.role,
    userVerified: userProfile.verified,
    userActive: userProfile.active,
    userProfile,
    loading,
    error,
    sessionChecked,
    
    // Computed values
    isLockedOut: isLockedOut(),
    canAccess: canAccess(),
    isAdmin: isAdmin(),
    
    // Methods
    loginWithGoogle,
    logout,
    clearError,
    refreshUserProfile,
    initializeAuth
  };

  return (
    <AuthContext.Provider value={value}>
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