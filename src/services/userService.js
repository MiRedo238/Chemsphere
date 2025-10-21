import { supabase } from '../lib/supabase/supabaseClient';

export const userService = {
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('username');
    
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(user) {
    // First create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true
    });

    if (authError) throw authError;

    // Then create the user profile
    const { data, error } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user'
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateRole(id, role) {
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deactivate(id) {
    // First disable auth user
    const { error: authError } = await supabase.auth.admin.updateUser(
      id,
      { banned: true }
    );

    if (authError) throw authError;

    // Then update user profile
    const { data, error } = await supabase
      .from('users')
      .update({ active: false })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async activate(id) {
    // First enable auth user
    const { error: authError } = await supabase.auth.admin.updateUser(
      id,
      { banned: false }
    );

    if (authError) throw authError;

    // Then update user profile
    const { data, error } = await supabase
      .from('users')
      .update({ active: true })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async changePassword(id, newPassword) {
    const { error } = await supabase.auth.admin.updateUserById(
      id,
      { password: newPassword }
    );
    
    if (error) throw error;
  },

  async searchByUsername(query) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', `%${query}%`)
      .order('username')
      .limit(10);
    
    if (error) throw error;
    return data;
  }
};