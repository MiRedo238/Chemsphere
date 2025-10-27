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

    // Insert the usage log
    const { data, error } = await supabase
      .from('chemical_usage')
      .insert([{
        ...usageData,
        logged_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Update chemical quantity - subtract the used amount
    const { error: updateError } = await supabase
      .from('chemicals')
      .update({ 
        current_quantity: chemical.current_quantity - usageData.quantity
      })
      .eq('id', usageData.chemical_id);

    if (updateError) throw updateError;

    return data;
  } catch (error) {
    console.error('Error logging chemical usage:', error);
    throw error;
  }
};

export const getChemicalUsageHistory = async (chemicalId = null, startDate = null, endDate = null) => {
  try {
    let query = supabase
      .from('chemical_usage')
      .select(`
        *,
        chemicals (name),
        equipment (name),
        users (name)
      `)
      .order('loggedAt', { ascending: false });

    if (chemicalId) {
      query = query.eq('chemicalId', chemicalId);
    }

    if (startDate) {
      query = query.gte('loggedAt', startDate);
    }

    if (endDate) {
      query = query.lte('loggedAt', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching chemical usage history:', error);
    throw error;
  }
};

export const getChemicalUsageByEquipment = async (equipmentId) => {
  try {
    const { data, error } = await supabase
      .from('chemical_usage')
      .select(`
        *,
        chemicals (name),
        equipment (name)
      `)
      .eq('equipmentId', equipmentId)
      .order('loggedAt', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching chemical usage by equipment:', error);
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
        startDate = new Date(now.setMonth(now.getMonth() - 1)); // Default to month
    }

    const { data, error } = await supabase
      .from('chemical_usage')
      .select('quantityUsed, loggedAt')
      .eq('chemicalId', chemicalId)
      .gte('loggedAt', startDate.toISOString())
      .order('loggedAt');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching chemical usage stats:', error);
    throw error;
  }
};
