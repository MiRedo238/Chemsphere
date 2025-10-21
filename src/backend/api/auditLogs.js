// src/backend/api/auditLogs.js
import { supabaseAdmin } from './supabaseAdmin'

export async function insertAuditLogs(logs) {
  const { error } = await supabaseAdmin
    .from('audit_logs')
    .insert(logs)
  if (error) throw error
  return true
}
