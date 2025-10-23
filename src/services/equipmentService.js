import { supabase } from '../lib/supabase/supabaseClient';

// Helper function to convert snake_case to camelCase for database
const toCamelCase = (obj) => {
  if (!obj) return obj;
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    result[camelKey] = value;
  }
  return result;
};

// Helper function to convert camelCase to snake_case for frontend
const toSnakeCase = (obj) => {
  if (!obj) return obj;
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
};

export const getAllEquipment = async () => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('name');

    if (error) throw error;
    
    // Convert camelCase to snake_case for frontend
    return data.map(item => toSnakeCase(item));
  } catch (error) {
    console.error('Error fetching equipment:', error);
    throw error;
  }
};

export const getEquipmentById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Convert camelCase to snake_case for frontend
    return toSnakeCase(data);
  } catch (error) {
    console.error('Error fetching equipment:', error);
    throw error;
  }
};

export const createEquipment = async (equipmentData) => {
  try {
    // Convert snake_case to camelCase for database
    const dbData = toCamelCase(equipmentData);
    
    const { data, error } = await supabase
      .from('equipment')
      .insert([dbData])
      .select()
      .single();

    if (error) throw error;
    
    // Convert camelCase to snake_case for frontend
    return toSnakeCase(data);
  } catch (error) {
    console.error('Error creating equipment:', error);
    throw error;
  }
};

export const updateEquipment = async (id, equipmentData) => {
  try {
    // Convert snake_case to camelCase for database
    const dbData = toCamelCase(equipmentData);
    
    const { data, error } = await supabase
      .from('equipment')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Convert camelCase to snake_case for frontend
    return toSnakeCase(data);
  } catch (error) {
    console.error('Error updating equipment:', error);
    throw error;
  }
};

export const deleteEquipment = async (id) => {
  try {
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting equipment:', error);
    throw error;
  }
};

export const getMaintenanceRequiredEquipment = async () => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('maintenanceRequired', true)
      .order('lastMaintenanceDate');

    if (error) throw error;
    
    // Convert camelCase to snake_case for frontend
    return data.map(item => toSnakeCase(item));
  } catch (error) {
    console.error('Error fetching maintenance required equipment:', error);
    throw error;
  }
};

export const updateMaintenanceStatus = async (id, maintenanceData) => {
  try {
    // Convert snake_case to camelCase for database
    const dbData = toCamelCase(maintenanceData);
    
    const { data, error } = await supabase
      .from('equipment')
      .update({
        lastMaintenanceDate: new Date().toISOString(),
        maintenanceRequired: false,
        ...dbData
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Convert camelCase to snake_case for frontend
    return toSnakeCase(data);
  } catch (error) {
    console.error('Error updating maintenance status:', error);
    throw error;
  }
};