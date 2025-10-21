// src/backend/api/equipment.js
import { supabaseAdmin } from './supabaseAdmin'

export async function insertEquipment(equipment) {
  const { data, error } = await supabaseAdmin
    .from('equipment')
    .insert(equipment)
    .select()
  if (error) throw error
  return data
}
