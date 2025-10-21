// src/services/api.js
import { supabase } from '../lib/supabase/supabaseClient';
import { normalizeGhsSymbols } from '../utils/helpers';

// Chemicals API
export const getChemicals = async () => {
  const { data, error } = await supabase
    .from('chemicals')
    .select('*')
    .order('name');
    
  if (error) throw error;
  return data;
};

export const getChemical = async (id) => {
  const { data, error } = await supabase
    .from('chemicals')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
};

export const createChemical = async (data) => {
  const { data: newChemical, error } = await supabase
    .from('chemicals')
    .insert([data])
    .select()
    .single();
    
  if (error) throw error;
  return newChemical;
};

export const updateChemical = async (id, data) => {
  const { data: updatedChemical, error } = await supabase
    .from('chemicals')
    .update(data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return updatedChemical;
};

export const deleteChemical = async (id) => {
  const { error } = await supabase
    .from('chemicals')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return true;
};

// Equipment API
export const getEquipment = async () => {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .order('name');
    
  if (error) throw error;
  return data;
};

export const getEquipmentById = async (id) => {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
};

export const createEquipment = async (data) => {
  const { data: newEquipment, error } = await supabase
    .from('equipment')
    .insert([data])
    .select()
    .single();
    
  if (error) throw error;
  return newEquipment;
};

export const updateEquipment = async (id, data) => {
  const { data: updatedEquipment, error } = await supabase
    .from('equipment')
    .update(data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return updatedEquipment;
};

export const deleteEquipment = async (id) => {
  const { error } = await supabase
    .from('equipment')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return true;
};

// Audit Logs API
export const getAuditLogs = async () => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      user:users(username)
    `)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
};

// Usage Logs API
export const logChemicalUsage = async (data) => {
  const { data: newLog, error } = await supabase
    .from('usage_logs')
    .insert([{
      ...data,
      item_type: 'chemical'
    }])
    .select(`
      *,
      chemical:chemicals(name)
    `)
    .single();
    
  if (error) throw error;
  return newLog;
};

export const getChemicalUsageLogs = async (userId) => {
  const { data, error } = await supabase
    .from('usage_logs')
    .select(`
      *,
      chemical:chemicals(name, id)
    `)
    .eq('user_id', userId)
    .eq('item_type', 'chemical')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data.map(log => ({
    ...log,
    chemical_name: log.chemical?.name,
    chemical_id: log.chemical?.id
  }));
};

export const updateChemicalUsageLog = async (id, data) => {
  const { data: updatedLog, error } = await supabase
    .from('usage_logs')
    .update(data)
    .eq('id', id)
    .select(`
      *,
      chemical:chemicals(name)
    `)
    .single();
    
  if (error) throw error;
  return updatedLog;
};

export const deleteChemicalUsageLog = async (id) => {
  const { error } = await supabase
    .from('usage_logs')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return true;
};

// Import/Export functions
export const importEquipment = async (data) => {
  // Normalize the data
  const normalizedData = data.map(equipment => ({
    ...equipment,
    purchase_date: equipment.purchase_date || null,
    warranty_expiration: equipment.warranty_expiration || null,
    last_maintenance: equipment.last_maintenance || null,
    next_maintenance: equipment.next_maintenance || null,
    status: equipment.status || 'Available'
  }));

  // Insert the equipment
  const { data: newEquipment, error } = await supabase
    .from('equipment')
    .insert(normalizedData)
    .select();

  if (error) throw error;
  return newEquipment;
};

export const importChemicals = async (data) => {
  // Normalize the data
  const normalizedData = data.map(chemical => ({
    ...chemical,
    ghs_symbols: normalizeGhsSymbols(chemical.ghs_symbols),
    initial_quantity: Number(chemical.initial_quantity),
    current_quantity: Number(chemical.current_quantity),
    volume_per_unit: Number(chemical.volume_per_unit)
  }));

  // Insert the chemicals
  const { data: newChemicals, error } = await supabase
    .from('chemicals')
    .insert(normalizedData)
    .select();

  if (error) throw error;
  return newChemicals;
};