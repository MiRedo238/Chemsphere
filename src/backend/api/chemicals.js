// src/backend/api/chemicals.js
import { supabaseAdmin } from './supabaseAdmin'

export async function insertChemicals(chemicals) {
  const { data, error } = await supabaseAdmin
    .from('chemicals')
    .insert(chemicals)
    .select()
  if (error) throw error
  return data
}
