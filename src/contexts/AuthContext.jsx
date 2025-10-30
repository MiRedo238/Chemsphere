// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Function to update user state
  const updateUserState = async (currentUser) => {
    if (!currentUser) {
      setUser(null);
      setUserRole('user');
      setUserVerified(false);
      setUserActive(false);
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
  };

  useEffect(() => {
    let mounted = true;
    let authSubscription = null;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        
        // First, set up the auth listener BEFORE getting session
        // This ensures we catch any auth state changes during initialization
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔄 Auth state changed:', event, session?.user?.email);
            
            if (!mounted) return;

            try {
              if (event === 'INITIAL_SESSION') {
                // Initial session load
                console.log('📋 Initial session detected');
              }
              
              if (session?.user) {
                await updateUserState(session.user);
              } else {
                await updateUserState(null);
              }
              
              if (!initialized) {
                setInitialized(true);
              }
            } catch (error) {
              console.error('Auth state change error:', error);
              setError(error.message);
            } finally {
              if (loading) {
                setLoading(false);
              }
            }
          }
        );

        authSubscription = subscription;

        // Now get the current session
        // The onAuthStateChange will fire with INITIAL_SESSION event
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        console.log('📋 Current session:', session?.user?.email || 'No session');

        // If we have a session, update state
        // (The auth state change listener will also fire, but this ensures immediate update)
        if (mounted && session?.user) {
          await updateUserState(session.user);
        } else if (mounted) {
          await updateUserState(null);
        }

        if (mounted && !initialized) {
          setInitialized(true);
        }

      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setError(error.message);
          setUser(null);
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

    // Safety timeout - increased to 10 seconds
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
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      await updateUserState(null);
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
      isAdmin: isAdmin()
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