import { supabase } from '../lib/supabase/supabaseClient';

export const logChemicalUsage = async (usageData) => {
  try {
    // First, get the current chemical to check quantity
    const { data: chemical, error: chemError } = await supabase
      .from('chemicals')
      .select('current_quantity')
      .eq('id', usageData.chemical_id)
      .single();

    if (chemError) throw chemError;

    // Check if there's enough quantity
    if (chemical.current_quantity < usageData.quantity) {
      throw new Error(`Insufficient quantity. Available: ${chemical.current_quantity}`);
    }

    // Insert the usage log - using 'usage_logs' table
    const { data, error } = await supabase
      .from('usage_logs') // Changed from 'chemical_usage' to 'usage_logs'
      .insert([{
        ...usageData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // The trigger should automatically update the chemical quantity
    // But let's verify it worked and update manually as backup
    const { error: updateError } = await supabase
      .from('chemicals')
      .update({ 
        current_quantity: chemical.current_quantity - usageData.quantity
      })
      .eq('id', usageData.chemical_id);

    if (updateError) throw updateError;

    console.log('✅ Chemical usage logged and quantity updated');
    return data;
  } catch (error) {
    console.error('Error logging chemical usage:', error);
    throw error;
  }
};

export const getChemicalUsageHistory = async (chemicalId = null, startDate = null, endDate = null) => {
  try {
    let query = supabase
      .from('usage_logs') // Changed from 'chemical_usage' to 'usage_logs'
      .select(`
        *,
        chemicals (name, batch_number, brand)
      `)
      .order('date', { ascending: false }); // Changed from 'loggedAt' to 'date'

    if (chemicalId) {
      query = query.eq('chemical_id', chemicalId); // Changed from 'chemicalId' to 'chemical_id'
    }

    if (startDate) {
      query = query.gte('date', startDate); // Changed from 'loggedAt' to 'date'
    }

    if (endDate) {
      query = query.lte('date', endDate); // Changed from 'loggedAt' to 'date'
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching chemical usage history:', error);
    throw error;
  }
};

export const getChemicalUsageByUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('usage_logs') // Changed from 'chemical_usage' to 'usage_logs'
      .select(`
        *,
        chemicals (name, batch_number, brand)
      `)
      .eq('user_id', userId) // Changed from 'userId' to 'user_id'
      .order('date', { ascending: false }); // Changed from 'loggedAt' to 'date'

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching chemical usage by user:', error);
    throw error;
  }
};

export const getChemicalUsageStats = async (chemicalId, timeframe = 'month') => {
  try {
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    const { data, error } = await supabase
      .from('usage_logs') // Changed from 'chemical_usage' to 'usage_logs'
      .select('quantity, date') // Changed from 'quantityUsed, loggedAt' to 'quantity, date'
      .eq('chemical_id', chemicalId) // Changed from 'chemicalId' to 'chemical_id'
      .gte('date', startDate.toISOString().split('T')[0]) // Use date format for date column
      .order('date');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching chemical usage stats:', error);
    throw error;
  }
};

// New functions for the LogChemicalUsage component
export const getChemicalUsageLogs = async (userId = null) => {
  try {
    let query = supabase
      .from('usage_logs')
      .select(`
        *,
        chemicals (name, batch_number, brand)
      `)
      .order('date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching chemical usage logs:', error);
    throw error;
  }
};

export const updateChemicalUsageLog = async (logId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('usage_logs')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', logId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating chemical usage log:', error);
    throw error;
  }
};

export const deleteChemicalUsageLog = async (logId) => {
  try {
    // First get the log to know what quantity to restore
    const { data: log, error: fetchError } = await supabase
      .from('usage_logs')
      .select('chemical_id, quantity')
      .eq('id', logId)
      .single();

    if (fetchError) throw fetchError;

    // Delete the usage log
    const { error } = await supabase
      .from('usage_logs')
      .delete()
      .eq('id', logId);

    if (error) throw error;

    // Restore the chemical quantity (since trigger might not handle this automatically)
    const { data: chemical, error: chemError } = await supabase
      .from('chemicals')
      .select('current_quantity')
      .eq('id', log.chemical_id)
      .single();

    if (chemError) throw chemError;

    const { error: updateError } = await supabase
      .from('chemicals')
      .update({ 
        current_quantity: chemical.current_quantity + log.quantity
      })
      .eq('id', log.chemical_id);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error deleting chemical usage log:', error);
    throw error;
  }
};