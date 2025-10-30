// lib/supabase/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Cookie storage implementation
const cookieStorage = {
  getItem: (key) => {
    if (typeof document === 'undefined') return null;
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${key}=`))
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
  },
  setItem: (key, value) => {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000).toUTCString(); // 7 days
    document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax; Secure`
  },
  removeItem: (key) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable cookie persistence
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Use cookies instead of localStorage
    storage: cookieStorage,
    // Cookie configuration
    cookieOptions: {
      name: 'sb-auth-token',
      lifetime: 60 * 60 * 24 * 7, // 7 days
      domain: '',
      path: '/',
      sameSite: 'lax',
      secure: true
    }
  }
})

// Enhanced session check with cookie support
export const checkAuthSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session check error:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Auth session check failed:', error);
    return null;
  }
};

// Helper functions for common queries
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export const getUserRole = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    if (error) throw error;
    return data?.role || 'user';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'user'; // Default fallback
  }
};

// Database functions
export const queries = {
  // Chemicals
  async getChemicals() {
    const { data, error } = await supabase
      .from('chemicals')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  async getChemical(id) {
    const { data, error } = await supabase
      .from('chemicals')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  // Equipment
  async getEquipment() {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  async getEquipmentItem(id) {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  // Usage Logs
  async getChemicalUsageLogs(chemicalId) {
    const { data, error } = await supabase
      .from('usage_logs')
      .select(`
        *,
        users (id, username)
      `)
      .eq('item_type', 'chemical')
      .eq('item_id', chemicalId)
      .order('timestamp', { ascending: false })
    if (error) throw error
    return data
  },

  async getEquipmentUsageLogs(equipmentId) {
    const { data, error } = await supabase
      .from('usage_logs')
      .select(`
        *,
        users (id, username)
      `)
      .eq('item_type', 'equipment')
      .eq('item_id', equipmentId)
      .order('timestamp', { ascending: false })
    if (error) throw error
    return data
  },

  // Audit Logs
  async getAuditLogs() {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        users (id, username)
      `)
      .order('timestamp', { ascending: false })
    if (error) throw error
    return data
  },

  // Users
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('username')
    if (error) throw error
    return data
  }
}

// Mutations
export const mutations = {
  // Chemicals
  async addChemical(chemical) {
    const { data, error } = await supabase
      .from('chemicals')
      .insert([chemical])
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateChemical(id, updates) {
    const { data, error } = await supabase
      .from('chemicals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteChemical(id) {
    const { error } = await supabase
      .from('chemicals')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // Equipment
  async addEquipment(equipment) {
    const { data, error } = await supabase
      .from('equipment')
      .insert([equipment])
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateEquipment(id, updates) {
    const { data, error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteEquipment(id) {
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // Usage Logs
  async logUsage(log) {
    const { data, error } = await supabase
      .from('usage_logs')
      .insert([log])
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateUsageLog(id, updates) {
    const { data, error } = await supabase
      .from('usage_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Audit Logs
  async addAuditLog(log) {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([log])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Users
  async updateUser(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}