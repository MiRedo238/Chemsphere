import { supabase } from '../lib/supabase/supabaseClient';

// Helper function to convert snake_case to camelCase for frontend
const toCamelCase = (obj) => {
  if (!obj) return obj;
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    result[camelKey] = value;
  }
  return result;
};

// Helper function to convert camelCase to snake_case for database
const toSnakeCase = (obj) => {
  if (!obj) return obj;
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
};

export const getAllChemicals = async () => {
  try {
    const { data, error } = await supabase
      .from('chemicals')
      .select('*')
      .order('name');

    if (error) throw error;
    
    // Convert snake_case to camelCase for frontend
    return data.map(item => toCamelCase(item));
  } catch (error) {
    console.error('Error fetching chemicals:', error);
    throw error;
  }
};

export const getChemicalById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('chemicals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Convert snake_case to camelCase for frontend
    return toCamelCase(data);
  } catch (error) {
    console.error('Error fetching chemical:', error);
    throw error;
  }
};

export const createChemical = async (chemicalData) => {
  try {
    // Convert camelCase to snake_case for database
    const dbData = toSnakeCase(chemicalData);
    console.log('Creating chemical with data:', dbData); // Debug log
    
    const { data, error } = await supabase
      .from('chemicals')
      .insert([dbData])
      .select()
      .single();

    if (error) throw error;
    
    // Convert snake_case to camelCase for frontend
    return toCamelCase(data);
  } catch (error) {
    console.error('Error creating chemical:', error);
    throw error;
  }
};

export const updateChemical = async (id, chemicalData) => {
  try {
    // Convert camelCase to snake_case for database
    const dbData = toSnakeCase(chemicalData);
    
    const { data, error } = await supabase
      .from('chemicals')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Convert snake_case to camelCase for frontend
    return toCamelCase(data);
  } catch (error) {
    console.error('Error updating chemical:', error);
    throw error;
  }
};

export const deleteChemical = async (id) => {
  try {
    const { error } = await supabase
      .from('chemicals')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting chemical:', error);
    throw error;
  }
};

export const getExpiredChemicals = async () => {
  try {
    const { data, error } = await supabase
      .from('chemicals')
      .select('*')
      .lt('expiration_date', new Date().toISOString())
      .order('expiration_date');

    if (error) throw error;
    
    // Convert snake_case to camelCase for frontend
    return data.map(item => toCamelCase(item));
  } catch (error) {
    console.error('Error fetching expired chemicals:', error);
    throw error;
  }
};

export const getLowStockChemicals = async (threshold = 10) => {
  try {
    const { data, error } = await supabase
      .from('chemicals')
      .select('*')
      .lte('current_quantity', threshold)
      .order('current_quantity');

    if (error) throw error;
    
    // Convert snake_case to camelCase for frontend
    return data.map(item => toCamelCase(item));
  } catch (error) {
    console.error('Error fetching low stock chemicals:', error);
    throw error;
  }
};

// New function to get opened chemicals
export const getOpenedChemicals = async () => {
  try {
    const { data, error } = await supabase
      .from('chemicals')
      .select('*')
      .eq('opened', true)
      .gt('remaining_amount', 0)
      .order('name');

    if (error) throw error;
    
    // Convert snake_case to camelCase for frontend
    return data.map(item => toCamelCase(item));
  } catch (error) {
    console.error('Error fetching opened chemicals:', error);
    throw error;
  }
};

// New function to update chemical quantity after usage
export const updateChemicalQuantity = async (id, quantityUsed) => {
  try {
    // First get the current chemical
    const { data: chemical, error: fetchError } = await supabase
      .from('chemicals')
      .select('current_quantity')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const newQuantity = Math.max(0, chemical.current_quantity - quantityUsed);
    
    const { data, error } = await supabase
      .from('chemicals')
      .update({ 
        current_quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return toCamelCase(data);
  } catch (error) {
    console.error('Error updating chemical quantity:', error);
    throw error;
  }
};