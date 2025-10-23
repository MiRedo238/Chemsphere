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

export const getAllChemicals = async () => {
  try {
    const { data, error } = await supabase
      .from('chemicals')
      .select('*')
      .order('name');

    if (error) throw error;
    
    // Convert camelCase to snake_case for frontend
    return data.map(item => toSnakeCase(item));
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
    
    // Convert camelCase to snake_case for frontend
    return toSnakeCase(data);
  } catch (error) {
    console.error('Error fetching chemical:', error);
    throw error;
  }
};

export const createChemical = async (chemicalData) => {
  try {
    // Convert snake_case to camelCase for database
    const dbData = toCamelCase(chemicalData);
    
    const { data, error } = await supabase
      .from('chemicals')
      .insert([dbData])
      .select()
      .single();

    if (error) throw error;
    
    // Convert camelCase to snake_case for frontend
    return toSnakeCase(data);
  } catch (error) {
    console.error('Error creating chemical:', error);
    throw error;
  }
};

export const updateChemical = async (id, chemicalData) => {
  try {
    // Convert snake_case to camelCase for database
    const dbData = toCamelCase(chemicalData);
    
    const { data, error } = await supabase
      .from('chemicals')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Convert camelCase to snake_case for frontend
    return toSnakeCase(data);
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
      .lt('expirationDate', new Date().toISOString())
      .order('expirationDate');

    if (error) throw error;
    
    // Convert camelCase to snake_case for frontend
    return data.map(item => toSnakeCase(item));
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
      .lte('quantity', threshold)
      .order('quantity');

    if (error) throw error;
    
    // Convert camelCase to snake_case for frontend
    return data.map(item => toSnakeCase(item));
  } catch (error) {
    console.error('Error fetching low stock chemicals:', error);
    throw error;
  }
};