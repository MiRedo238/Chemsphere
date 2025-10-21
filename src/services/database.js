import { supabase } from '../lib/supabase/supabaseClient'

export async function getChemicals() {
  try {
    const { data, error } = await supabase.from('chemicals').select('*')
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function addChemical(chemical) {
  try {
    const { data, error } = await supabase.from('chemicals').insert([chemical]).select()
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function getEquipment() {
  try {
    const { data, error } = await supabase.from('equipment').select('*')
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function addUsageLog(log) {
  try {
    const { data, error } = await supabase.from('usage_logs').insert([log]).select()
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function getUsageLogs() {
  try {
    const { data, error } = await supabase.from('usage_logs').select('*')
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export const getAuditLogs = async () => {
  return await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });
};

export const addAuditLog = async (logData) => {
  return await supabase
    .from('audit_logs')
    .insert([{
      type: logData.type,
      action: logData.action,
      item_name: logData.item_name || logData.itemName,
      user_role: logData.user_role || logData.userRole,
      user_name: logData.user_name || logData.userName,
      details: logData.details
    }])
    .select();
};