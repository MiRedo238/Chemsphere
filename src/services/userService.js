import { supabase } from '../lib/supabase/supabaseClient';

export const userService = {
  // ===== USER CRUD OPERATIONS =====
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('username');
    
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(userData) {
    try {
      // Use client-side auth signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            role: userData.role || 'user'
          }
        }
      });

      if (authError) throw authError;

      // Create user profile with verified: false by default
      const { data, error } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          username: userData.username,
          email: userData.email,
          role: userData.role || 'user',
          active: true,
          verified: false // New users are unverified by default
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
      
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // In userService.js - fix the update method
  async verifyUserDirect(id) {
    try {
      console.log('Direct verify user:', id);
      
      const { error } = await supabase
        .from('users')
        .update({ 
          verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Direct verify update error:', error);
        throw error;
      }

      console.log('Verification update successful');
      
      // Return success object
      return { 
        id: id, 
        verified: true,
        success: true 
      };
      
    } catch (error) {
      console.error('Error in direct verify:', error);
      throw error;
    }
  },

  // ===== USER STATUS MANAGEMENT =====
  async updateRole(id, role) {
    return this.update(id, { role });
  },

  async deactivate(id) {
    return this.update(id, { active: false });
  },

  async activate(id) {
    return this.update(id, { active: true });
  },

  async verifyUser(id) {
    return this.update(id, { verified: true });
  },

  async unverifyUser(id) {
    return this.update(id, { verified: false });
  },

  // ===== USER VERIFICATION SYSTEM =====
  async getPendingVerification() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('verified', false)
      .eq('active', true)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async getVerifiedUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('verified', true)
      .order('username');
    
    if (error) throw error;
    return data;
  },

  async isUserVerified(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('verified, active')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn('Error checking user verification:', error);
        return false;
      }
      
      return data?.verified && data?.active;
    } catch (error) {
      console.error('Error in isUserVerified:', error);
      return false;
    }
  },

  async update(id, updates) {
    try {
      // Debug: Check current user and their role
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('👤 Current user:', currentUser?.id);
      
      // Check if current user is admin
      const { data: currentUserData } = await supabase
        .from('users')
        .select('role, username')
        .eq('id', currentUser?.id)
        .single();
      
      console.log('🎭 Current user role:', currentUserData?.role);
      console.log('🎯 Target user ID:', id);
      console.log('📝 Updates:', updates);
      
      const { data, error, status } = await supabase
        .from('users')
        .update({ 
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      console.log('📊 Update response:', { status, error, data });

      if (error) {
        console.error('❌ Update failed:', error);
        throw error;
      }

      return data?.[0] || { id, ...updates, success: true };
      
    } catch (error) {
      console.error('❌ Update error:', error);
      throw error;
    }
  },

  // ===== USER DELETION MANAGEMENT =====
  async deleteUser(id) {
    try {
      // First deactivate the user
      await this.update(id, { active: false });
      
      // Then mark for deletion (soft delete)
      const { error } = await supabase
        .from('users')
        .update({ 
          marked_for_deletion: true,
          deletion_requested_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking user for deletion:', error);
      throw error;
    }
  },

  async permanentDeleteUser(id) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error permanently deleting user:', error);
      throw error;
    }
  },

  // UPDATED: Enhanced user deletion with better CORS error handling
  async deleteUserCompletely(id) {
    try {
      console.log('🗑️ Starting complete user deletion for:', id);
      
      const supabaseUrl = supabase.supabaseUrl;
      const supabaseAnonKey = supabase.supabaseKey;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL or Anon Key not configured');
      }

      // Call Edge Function for secure user deletion
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ userId: id })
      });

      // Enhanced error handling for CORS and network issues
      if (!response.ok) {
        // Check for CORS/network errors (status 0 or opaque response)
        if (response.status === 0 || response.type === 'opaque') {
          console.warn('🌐 CORS/Network error detected, using fallback deletion');
          throw new Error('CORS/Network error - using fallback deletion');
        }
        
        // Handle other HTTP errors
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || `Failed to delete user: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ User deleted via edge function:', result);
      return true;
      
    } catch (error) {
      console.error('❌ Complete user deletion failed:', error);
      
      // Enhanced fallback with better error handling
      console.log('🔄 Attempting database-only deletion as fallback...');
      
      // Determine user-friendly message based on error type
      let userFriendlyMessage;
      if (error.message.includes('CORS') || error.message.includes('Network')) {
        userFriendlyMessage = 'Temporary system issue - user will be removed from application database. Auth cleanup may be required manually in Supabase dashboard.';
      } else {
        userFriendlyMessage = `User deletion partially completed. ${error.message}`;
      }
      
      try {
        // Only delete from database as fallback
        await this.permanentDeleteUser(id);
        console.log('✅ User deleted from database (auth cleanup may be needed manually)');
        
        return {
          success: true,
          requiresManualCleanup: true,
          message: userFriendlyMessage
        };
      } catch (dbError) {
        console.error('❌ Database deletion also failed:', dbError);
        
        // Combine both errors for comprehensive reporting
        const combinedError = new Error(
          `User deletion failed: ${error.message}. Fallback also failed: ${dbError.message}`
        );
        combinedError.originalError = error;
        combinedError.fallbackError = dbError;
        throw combinedError;
      }
    }
  },

  async getUsersMarkedForDeletion() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('marked_for_deletion', true)
      .order('deletion_requested_at');
    
    if (error) throw error;
    return data;
  },

  // ===== LOGIN & ACTIVITY TRACKING =====
  async updateLastLogin(id) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  },

  async checkInactiveUsers() {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Get users who haven't logged in for 3+ months and are active/verified
      const { data: inactiveUsers, error } = await supabase
        .from('users')
        .select('*')
        .lt('last_login', threeMonthsAgo.toISOString())
        .eq('active', true)
        .eq('verified', true);

      if (error) throw error;

      // Deactivate users who haven't logged in for 6+ months
      const usersToDeactivate = inactiveUsers.filter(user => 
        new Date(user.last_login) < sixMonthsAgo
      );

      for (const user of usersToDeactivate) {
        await this.deactivate(user.id);
        
        // Log the automatic deactivation
        console.log(`Automatically deactivated user ${user.username} due to inactivity (last login: ${user.last_login})`);
      }

      return {
        checked: inactiveUsers.length,
        deactivated: usersToDeactivate.length,
        usersDeactivated: usersToDeactivate.map(u => u.username)
      };
    } catch (error) {
      console.error('Error checking inactive users:', error);
      throw error;
    }
  },

  async getUserActivityStats() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, last_login, active, verified');
      
      if (error) throw error;

      const now = new Date();
      const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
      const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));

      const stats = {
        total: data.length,
        active: data.filter(u => u.active).length,
        verified: data.filter(u => u.verified).length,
        pendingVerification: data.filter(u => !u.verified && u.active).length,
        inactive: data.filter(u => !u.active).length,
        neverLoggedIn: data.filter(u => !u.last_login).length,
        warningPeriod: data.filter(u => u.last_login && new Date(u.last_login) < threeMonthsAgo && new Date(u.last_login) >= sixMonthsAgo).length,
        autoDeactivatePeriod: data.filter(u => u.last_login && new Date(u.last_login) < sixMonthsAgo).length
      };

      return stats;
    } catch (error) {
      console.error('Error getting user activity stats:', error);
      throw error;
    }
  },

  // ===== SEARCH & UTILITY FUNCTIONS =====
  async searchByUsername(query) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', `%${query}%`)
      .order('username')
      .limit(10);
    
    if (error) throw error;
    return data;
  },

  async searchByEmail(query) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', `%${query}%`)
      .order('email')
      .limit(10);
    
    if (error) throw error;
    return data;
  },

  async getUsersByRole(role) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .eq('verified', true)
      .order('username');
    
    if (error) throw error;
    return data;
  },

  // ===== PASSWORD MANAGEMENT =====
  async changePassword(id, newPassword) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    return true;
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
    return true;
  }
};

// Helper function to ensure user exists in database (for OAuth users)
// Update the ensureUserInDatabase function in your AuthContext or userService
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
        verified: false, // New users are unverified by default
        last_login: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
      
      if (error) {
        // If there's a conflict, user was probably created by trigger
        if (error.code === '23505') {
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

// Helper function to check if user can access the system
export const canUserAccessSystem = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('verified, active')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.warn('Error checking user access:', error);
      return false;
    }
    
    return data?.verified && data?.active;
  } catch (error) {
    console.error('Error in canUserAccessSystem:', error);
    return false;
  }
};