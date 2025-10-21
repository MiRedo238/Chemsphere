// src/backend/api/usageLogs.js
import { supabaseAdmin } from './supabaseAdmin'

export async function insertUsageLogs(logs) {
  const { data, error } = await supabaseAdmin
    .from('usage_logs')
    .insert(logs)
    .select()
  if (error) throw error
  return data
}
