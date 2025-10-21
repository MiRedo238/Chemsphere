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

export async function getAuditLogs() {
  try {
    const { data, error } = await supabase.from('audit_logs').select('*')
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}
