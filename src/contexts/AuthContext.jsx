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

    if (fetchError) {
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

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        setLoading(true);
        
        // Get current session - this is the key change
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          if (mounted) {
            setError(sessionError.message);
            setLoading(false);
          }
          return;
        }

        console.log('📋 Session found:', session?.user?.email);

        if (session?.user && mounted) {
          console.log('👤 User authenticated, ensuring in database...');
          
          // Ensure user exists in public.users table
          await ensureUserInDatabase(session.user);
          
          // Get user profile including verification status
          const profile = await getUserProfile(session.user.id);
          console.log('🎭 User profile:', profile);
          
          if (mounted) {
            setUser(session.user);
            setUserRole(profile.role);
            setUserVerified(profile.verified);
            setUserActive(profile.active);
            setError(null);
          }
        } else if (mounted) {
          console.log('❌ No session found');
          setUser(null);
          setUserRole('user');
          setUserVerified(false);
          setUserActive(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setError(error.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('✅ Auth initialization complete');
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
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
              setUserRole(profile.role);
              setUserVerified(profile.verified);
              setUserActive(profile.active);
              setError(null);
              setLoading(false);
            }
          } else {
            console.log('👤 Auth change - no user');
            setUser(null);
            setUserRole('user');
            setUserVerified(false);
            setUserActive(false);
            setError(null);
            setLoading(false);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          setError(error.message);
          setLoading(false);
        }
      }
    );

    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Auth loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setUserRole('user');
      setUserVerified(false);
      setUserActive(false);
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
          redirectTo: `${window.location.origin}/#/auth/callback`
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

  const clearError = () => setError(null);

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