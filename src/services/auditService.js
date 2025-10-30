// src/services/auditService.js
import { supabase } from '../lib/supabase/supabaseClient';

export const auditService = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  },

  async create(log) {
    try {
      // Get current user session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No user session found for audit log');
        return null;
      }

      // Get user profile
      const { data: userProfile } = await supabase
        .from('users')
        .select('username, role')
        .eq('id', user.id)
        .single();

      // Define valid audit actions
      const validActions = [
        'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT',
        'VERIFY_USER', 'UPDATE_USER_ROLE', 'ACTIVATE_USER', 'DEACTIVATE_USER', 'DELETE_USER'
      ];

      // Validate action
      const action = validActions.includes(log.action) ? log.action : 'UPDATE';

      // Prepare audit data
      const auditData = {
        type: log.type || 'system',
        action: action,
        item_name: log.target || 'Unknown',
        user_role: userProfile?.role || 'user',
        user_name: userProfile?.username || user.email || 'Unknown',
        details: log.metadata || {},
        timestamp: new Date().toISOString(),
        user_id: user.id // Store user ID for better tracking
      };

      console.log('Inserting audit log:', auditData);

      const { data, error } = await supabase
        .from('audit_logs')
        .insert([auditData])
        .select()
        .single();
      
      if (error) {
        console.error('Audit log insertion error:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Audit service error:', error);
      return null;
    }
  },

  // Enhanced filtering methods
  async getByDateRange(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs by date range:', error);
      return [];
    }
  },

  async getByUser(userName) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_name', userName)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs by user:', error);
      return [];
    }
  },

  async getByAction(action) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', action)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs by action:', error);
      return [];
    }
  },

  async getByType(type) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('type', type)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs by type:', error);
      return [];
    }
  },

  // Session-related audit methods
  async logLogin(userId) {
    return this.create({
      action: 'LOGIN',
      target: 'System',
      type: 'authentication',
      metadata: { userId, timestamp: new Date().toISOString() }
    });
  },

  async logLogout(userId) {
    return this.create({
      action: 'LOGOUT',
      target: 'System',
      type: 'authentication',
      metadata: { userId, timestamp: new Date().toISOString() }
    });
  },

  // Export functionality
  async exportToCSV() {
    try {
      const data = await this.getAll();
      return data;
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      return [];
    }
  }
};