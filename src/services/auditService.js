import { supabase } from '../lib/supabase/supabaseClient';

export const auditService = {
  async getAll() {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(log) {
    try {
      // Get current user session
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('users')
        .select('username, role')
        .eq('id', user?.id)
        .single();

      // Define valid audit actions based on your enum
      const validActions = [
        'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT',
        'VERIFY_USER', 'UPDATE_USER_ROLE', 'ACTIVATE_USER', 'DEACTIVATE_USER', 'DELETE_USER'
      ];

      // Validate and fallback action if needed
      const action = validActions.includes(log.action) ? log.action : 'UPDATE';

      // Map the log data to match your table structure
      const auditData = {
        type: 'user_management', // or determine type from action
        action: action,
        item_name: log.target || 'User',
        user_role: userProfile?.role || 'user',
        user_name: userProfile?.username || 'System',
        details: log.metadata || {},
        timestamp: new Date().toISOString()
      };

      console.log('Inserting audit log:', auditData);

      const { data, error } = await supabase
        .from('audit_logs')
        .insert([auditData])
        .select()
        .single();
      
      if (error) {
        console.error('Audit log insertion error:', error);
        // Log the error but don't break the application
        return null;
      }
      return data;
    } catch (error) {
      console.error('Audit service error:', error);
      // Don't throw error to prevent breaking user operations
      return null;
    }
  },

  async getByDateRange(startDate, endDate) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByUser(userName) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_name', userName)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByAction(action) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', action)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByType(type) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('type', type)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Export audit logs to CSV
  async exportToCSV() {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};