// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase/supabaseClient';

const AuthContext = createContext();

// Simple function to get user role and verification status
const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role, verified, active')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.warn('Error fetching user profile:', error);
      return { role: 'user', verified: false, active: false };
    }
    
    return {
      role: data?.role || 'user',
      verified: data?.verified || false,
      active: data?.active || false
    };
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return { role: 'user', verified: false, active: false };
  }
};

// Function to ensure user exists in public.users table
const ensureUserInDatabase = async (user) => {
  try {
    console.log('🔄 Ensuring user exists in database:', user.email);
    
    // Check if user exists in public.users
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
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
        if (error.code === '23505') {
          console.log('✅ User already exists in database (likely from trigger)');
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
  const [userRole, setUserRole] = useState('user');
  const [userVerified, setUserVerified] = useState(false);
  const [userActive, setUserActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  
  // Use refs to track if we're in the middle of operations
  const isUpdatingRef = useRef(false);
  const isLoggingOutRef = useRef(false);

  // Helper functions
  const isLockedOut = () => {
    return user && (!userVerified || !userActive);
  };

  const canAccess = () => {
    return user && userVerified && userActive;
  };

  const isAdmin = () => {
    return user && userRole === 'admin' && userVerified && userActive;
  };

  // Function to completely clear auth state
  const clearAuthState = () => {
    console.log('🧹 Clearing all auth state');
    setUser(null);
    setUserRole('user');
    setUserVerified(false);
    setUserActive(false);
    setError(null);
  };

  // Function to update user state
  const updateUserState = async (currentUser) => {
    // Prevent concurrent updates
    if (isUpdatingRef.current) {
      console.log('⏭️ Skipping concurrent update');
      return;
    }

    // Don't update if we're logging out
    if (isLoggingOutRef.current) {
      console.log('⏭️ Skipping update during logout');
      return;
    }

    isUpdatingRef.current = true;

    try {
      if (!currentUser) {
        clearAuthState();
        return;
      }

      console.log('👤 Updating user state for:', currentUser.email);
      
      // Ensure user exists in database
      await ensureUserInDatabase(currentUser);
      
      // Get user profile
      const profile = await getUserProfile(currentUser.id);
      console.log('🎭 User profile:', profile);
      
      setUser(currentUser);
      setUserRole(profile.role);
      setUserVerified(profile.verified);
      setUserActive(profile.active);
      setError(null);
    } catch (error) {
      console.error('Error updating user state:', error);
      setError(error.message);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;
    let authSubscription = null;

  const initializeAuth = async () => {
  try {
    console.log('🔄 Initializing auth...');
    
    // First, get the current session without setting up listeners
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error during init:', sessionError);
      throw sessionError;
    }

    console.log('📋 Initial session check:', session?.user?.email || 'No session');

    // Handle initial session state BEFORE setting up the listener
    if (mounted && session?.user) {
      console.log('👤 Processing initial user session...');
      try {
        await updateUserState(session.user);
        console.log('✅ Initial user state updated successfully');
      } catch (userError) {
        console.error('❌ Failed to update initial user state:', userError);
        // Don't throw here - we still want to set up the listener
        setError(`Failed to load user profile: ${userError.message}`);
      }
    } else if (mounted) {
      console.log('🧹 No initial session - clearing state');
      clearAuthState();
    }

    // Now set up the auth state change listener
    console.log('👂 Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        if (!mounted) {
          console.log('⚠️ Component unmounted, ignoring auth change');
          return;
        }

        // Skip updates during logout
        if (isLoggingOutRef.current && event === 'SIGNED_OUT') {
          console.log('✅ Logout complete');
          isLoggingOutRef.current = false;
          clearAuthState();
          if (loading) setLoading(false);
          return;
        }

        try {
          // Handle different auth events
          switch (event) {
            case 'INITIAL_SESSION':
              console.log('📋 Initial session detected (from listener)');
              // Skip - we already handled this above
              return;
            case 'SIGNED_IN':
              console.log('✅ User signed in (from listener)');
              if (session?.user) {
                await updateUserState(session.user);
              }
              break;
            case 'SIGNED_OUT':
              console.log('👋 User signed out (from listener)');
              clearAuthState();
              if (loading) setLoading(false);
              return;
            case 'TOKEN_REFRESHED':
              console.log('🔄 Token refreshed (from listener)');
              // Usually don't need to update full user state for token refresh
              if (session?.user && user?.id === session.user.id) {
                setUser(session.user);
              }
              break;
            case 'USER_UPDATED':
              console.log('📝 User updated (from listener)');
              if (session?.user) {
                await updateUserState(session.user);
              }
              break;
          }
          
        } catch (error) {
          console.error('❌ Auth state change error:', error);
          setError(error.message);
        } finally {
          if (loading) {
            setLoading(false);
          }
        }
      }
    );

    authSubscription = subscription;
    console.log('✅ Auth listener set up successfully');

    if (mounted && !initialized) {
      setInitialized(true);
    }

  } catch (error) {
    console.error('❌ Auth initialization error:', error);
    if (mounted) {
      setError(error.message);
      clearAuthState();
      setInitialized(true);
    }
  } finally {
    if (mounted) {
      setLoading(false);
      console.log('✅ Auth initialization complete');
    }
  }
};

    // Small delay to ensure Supabase client is ready
    const initTimeout = setTimeout(() => {
      initializeAuth();
    }, 100);

    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Auth loading timeout - forcing loading to false');
        setLoading(false);
        setInitialized(true);
      }
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      clearTimeout(safetyTimeout);
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []); // Only run once on mount

  const logout = async () => {
    try {
      console.log('🚪 Starting logout process...');
      isLoggingOutRef.current = true;
      setLoading(true);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        throw error;
      }
      
      // Clear local state
      clearAuthState();
      
      // Clear any stored session data manually as backup
      try {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      } catch (e) {
        console.warn('Could not clear storage:', e);
      }
      
      console.log('✅ Logout successful');
    } catch (err) {
      console.error('❌ Logout failed:', err);
      setError(err.message);
      // Force clear state even on error
      clearAuthState();
    } finally {
      isLoggingOutRef.current = false;
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear any existing session first
      console.log('🧹 Clearing existing session before Google login');
      await supabase.auth.signOut();
      
      // Small delay to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const redirectUrl = `${window.location.origin}/#/auth/callback`;
      console.log('🔄 Initiating Google OAuth with redirect:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) throw error;
      
      console.log('✅ Google OAuth initiated');
      return data;
    } catch (err) {
      console.error('❌ Google login failed:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const clearError = () => setError(null);

  // Don't render children until initialized
  if (!initialized) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Initializing authentication...</p>
      </div>
    );
  }

  const isAdminOrSuperAdmin = () => {
    return (
      user &&
      (userRole === 'admin' || userRole === 'super_admin') &&
      userVerified &&
      userActive
    );
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      userRole,
      userVerified,
      userActive,
      loading,
      error,
      isLockedOut: isLockedOut(),
      loginWithGoogle,
      logout,
      clearError,
      canAccess: canAccess(),
      isAdmin: isAdmin(),
      isAdminOrSuperAdmin: isAdminOrSuperAdmin()
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  updateUserState(session.user);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};