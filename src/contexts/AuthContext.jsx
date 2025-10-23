// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/supabaseClient';

const AuthContext = createContext();

// Simple function to get user role
const getUserRole = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.warn('Error fetching user role:', error);
      return 'user'; // Default fallback
    }
    
    return data?.role || 'user';
  } catch (error) {
    console.error('Error in getUserRole:', error);
    return 'user';
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let authInitialized = false;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        
        // Get current session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 5000, 'timeout'));
        
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (result === 'timeout') {
          console.warn('Auth initialization timeout');
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        const { data: { session }, error: sessionError } = result;
        
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
          console.log('👤 User authenticated, fetching role...');
          try {
            const role = await getUserRole(session.user.id);
            console.log('🎭 User role:', role);
            if (mounted) {
              setUser(session.user);
              setUserRole(role);
            }
          } catch (roleError) {
            console.error('Role fetch error, using default role:', roleError);
            if (mounted) {
              setUser(session.user);
              setUserRole('user');
            }
          }
        } else if (mounted) {
          console.log('❌ No session found');
          setUser(null);
          setUserRole('user');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted && !authInitialized) {
          authInitialized = true;
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
            console.log('👤 Auth change - user present, fetching role...');
            try {
              const role = await getUserRole(session.user.id);
              console.log('🎭 New user role:', role);
              if (mounted) {
                setUser(session.user);
                setUserRole(role);
                setError(null);
              }
            } catch (roleError) {
              console.error('Role fetch error in auth change:', roleError);
              if (mounted) {
                setUser(session.user);
                setUserRole('user');
              }
            }
          } else {
            console.log('👤 Auth change - no user');
            setUser(null);
            setUserRole('user');
            setError(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          setError(error.message);
        } finally {
          if (mounted && !authInitialized) {
            authInitialized = true;
            setLoading(false);
          }
        }
      }
    );

    // Safety timeout - always set loading to false after 10 seconds
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Auth loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Login with email/password
  const loginWithCredentials = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      setUser(data.user);
      const role = await getUserRole(data.user.id);
      setUserRole(role);
      
      console.log('✅ Login successful:', data.user.email);
      return { success: true, user: data.user };
    } catch (err) {
      console.error('❌ Login error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setUserRole('user');
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
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
      loading,
      error,
      loginWithCredentials,
      loginWithGoogle,
      logout,
      clearError
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

const loginWithGoogle = async () => {
  try {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback` // keep this — it will now point to your deployed domain
      }
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ Google login failed:', err);
    setError(err.message);
    throw err;
  } finally {
    setLoading(false);
  }
};
