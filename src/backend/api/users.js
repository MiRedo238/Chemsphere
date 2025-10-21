// src/backend/api/users.js
import { supabaseAdmin } from './supabaseAdmin'

export async function createUser({ email, password, role }) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role }
  })
  if (error) throw error
  return data
}

export async function insertUserProfile({ id, username, email, role, active }) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([{ id, username, email, role, active }])
    .select()
  if (error) throw error
  return data
}
