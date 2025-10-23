// src/services/api.js
import { supabase } from '../lib/supabase/supabaseClient';
import { normalizeGhsSymbols } from '../utils/helpers';

// Helper function to convert snake_case to camelCase for frontend
const toCamelCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    result[camelKey] = value;
  }
  return result;
};

// Helper function to convert camelCase to snake_case for database
const toSnakeCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
};

// Chemicals API
export const getChemicals = async () => {
  const { data, error } = await supabase
    .from('chemicals')
    .select('*')
    .order('name');
    
  if (error) throw error;
  
  // Convert snake_case to camelCase for frontend
  return data.map(item => toCamelCase(item));
};

export const getChemical = async (id) => {
  const { data, error } = await supabase
    .from('chemicals')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  
  // Convert snake_case to camelCase for frontend
  return toCamelCase(data);
};

export const createChemical = async (data) => {
  // Convert camelCase to snake_case for database
  const dbData = toSnakeCase(data);
  
  const { data: newChemical, error } = await supabase
    .from('chemicals')
    .insert([dbData])
    .select()
    .single();
    
  if (error) throw error;
  
  // Convert snake_case to camelCase for frontend
  return toCamelCase(newChemical);
};

export const updateChemical = async (id, data) => {
  // Convert camelCase to snake_case for database
  const dbData = toSnakeCase(data);
  
  const { data: updatedChemical, error } = await supabase
    .from('chemicals')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating chemical:', error);
    throw error;
  }
  
  // Convert snake_case to camelCase for frontend
  return toCamelCase(updatedChemical);
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
  
  // Convert snake_case to camelCase for frontend
  return data.map(item => toCamelCase(item));
};

export const getEquipmentById = async (id) => {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  
  // Convert snake_case to camelCase for frontend
  return toCamelCase(data);
};

export const createEquipment = async (data) => {
  // Convert camelCase to snake_case for database
  const dbData = toSnakeCase(data);
  
  const { data: newEquipment, error } = await supabase
    .from('equipment')
    .insert([dbData])
    .select()
    .single();
    
  if (error) throw error;
  
  // Convert snake_case to camelCase for frontend
  return toCamelCase(newEquipment);
};

export const updateEquipment = async (id, data) => {
  // Convert camelCase to snake_case for database
  const dbData = toSnakeCase(data);
  
  console.log('🔧 Updating equipment:', { id, originalData: data, dbData });
  
  const { data: updatedEquipment, error } = await supabase
    .from('equipment')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('❌ Error updating equipment:', error);
    throw error;
  }
  
  console.log('✅ Equipment update successful:', updatedEquipment);
  
  // Convert snake_case to camelCase for frontend
  const result = toCamelCase(updatedEquipment);
  console.log('🔄 Converted result for frontend:', result);
  return result;
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
    .insert([data])
    .select(`
      *,
      chemical:chemicals(name, id)
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