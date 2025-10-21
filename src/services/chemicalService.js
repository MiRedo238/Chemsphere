import { supabase } from '../lib/supabase/supabaseClient';

export const getAllChemicals = async () => {
  try {
    const { data, error } = await supabase
      .from('chemicals')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
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
    return data;
  } catch (error) {
    console.error('Error fetching chemical:', error);
    throw error;
  }
};

export const createChemical = async (chemicalData) => {
  try {
    const { data, error } = await supabase
      .from('chemicals')
      .insert([chemicalData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating chemical:', error);
    throw error;
  }
};

export const updateChemical = async (id, chemicalData) => {
  try {
    const { data, error } = await supabase
      .from('chemicals')
      .update(chemicalData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
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
    return data;
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
    return data;
  } catch (error) {
    console.error('Error fetching low stock chemicals:', error);
    throw error;
  }
};
