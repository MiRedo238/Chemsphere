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

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        // Set loading false by default to show login page
        setLoading(false);
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          return;
        }

        console.log('📋 Session found:', session?.user?.email);

        if (session?.user && mounted) {
          try {
            const role = await getUserRole(session.user.id);
            console.log('🎭 User role:', role);
            if (mounted) {
              setUser(session.user);
              setUserRole(role);
            }
          } catch (roleError) {
            console.error('Role fetch error:', roleError);
            if (mounted) {
              setUser(session.user);
              setUserRole('user');
            }
          }
        } else if (mounted) {
          setUser(null);
          setUserRole('user');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
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
            try {
              const role = await getUserRole(session.user.id);
              console.log('🎭 New user role:', role);
              if (mounted) {
                setUser(session.user);
                setUserRole(role);
              }
            } catch (roleError) {
              console.error('Role fetch error:', roleError);
              if (mounted) {
                setUser(session.user);
                setUserRole('user');
              }
            }
          } else {
            setUser(null);
            setUserRole('user');
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          setError(error.message);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
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

      // Set user and role immediately after successful login
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