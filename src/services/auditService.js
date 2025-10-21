import { supabase } from '../lib/supabase/supabaseClient';

export const auditService = {
  async getAll() {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        users (id, username)
      `)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(log) {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([log])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getByDateRange(startDate, endDate) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        users (id, username)
      `)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByUser(userId) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        users (id, username)
      `)
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByAction(action) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        users (id, username)
      `)
      .eq('action', action)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Export audit logs to CSV
  async exportToCSV() {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        user_id,
        users (username),
        action,
        target,
        timestamp,
        metadata
      `)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};