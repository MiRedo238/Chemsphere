import { supabase } from '../lib/supabase/supabaseClient';

export const logChemicalUsage = async (usageData) => {
  try {
    const { equipment_ids = [], chemical_usages = [], ...logData } = usageData;
    
    // Validate chemical quantities if we're using chemicals
    if (chemical_usages && chemical_usages.length > 0) {
      for (const usage of chemical_usages) {
        const { data: chemical, error: chemError } = await supabase
          .from('chemicals')
          .select('current_quantity')
          .eq('id', usage.chemical_id)
          .single();

        if (chemError) throw chemError;

        if (chemical.current_quantity < usage.quantity) {
          throw new Error(`Insufficient quantity for chemical ${usage.chemical_id}. Available: ${chemical.current_quantity}`);
        }
      }
    }

    // Insert the main usage log
    const { data: usageLog, error } = await supabase
      .from('usage_logs')
      .insert([{
        user_id: logData.user_id,
        user_name: logData.user_name,
        date: logData.date,
        notes: logData.notes,
        location: logData.location,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Link equipment through junction table
    if (equipment_ids && equipment_ids.length > 0) {
      const equipmentLinks = equipment_ids.map(equipment_id => ({
        usage_log_id: usageLog.id,
        equipment_id: equipment_id
      }));

      const { error: equipmentError } = await supabase
        .from('usage_log_equipment')
        .insert(equipmentLinks);

      if (equipmentError) throw equipmentError;
    }

    // Handle chemical usages through chemical_usage table
    if (chemical_usages && chemical_usages.length > 0) {
      const chemicalUsageEntries = chemical_usages.map(usage => ({
        usage_log_id: usageLog.id,
        chemical_id: usage.chemical_id,
        quantity: usage.quantity,
        unit: usage.unit,
        opened: usage.opened || false,
        remaining_amount: usage.remaining_amount
      }));

      const { error: chemicalUsageError } = await supabase
        .from('chemical_usage')
        .insert(chemicalUsageEntries);

      if (chemicalUsageError) throw chemicalUsageError;

      // Update chemical quantities for each chemical used
      for (const usage of chemical_usages) {
        const { data: chemical } = await supabase
          .from('chemicals')
          .select('current_quantity')
          .eq('id', usage.chemical_id)
          .single();

        const { error: updateError } = await supabase
          .from('chemicals')
          .update({ 
            current_quantity: chemical.current_quantity - usage.quantity
          })
          .eq('id', usage.chemical_id);

        if (updateError) throw updateError;
      }
    }

    console.log('✅ Usage log created with equipment and chemicals');
    return usageLog;
  } catch (error) {
    console.error('Error logging usage:', error);
    throw error;
  }
};

export const getChemicalUsageLogs = async (userId = null) => {
  try {
    // First get the main usage logs
    let query = supabase
      .from('usage_logs')
      .select('*')
      .order('date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: logs, error } = await query;
    if (error) throw error;

    // Manual joins for chemicals and equipment
    const logsWithDetails = await Promise.all(
      logs.map(async (log) => {
        // Get chemical usage details
        const { data: chemicalUsages } = await supabase
          .from('chemical_usage')
          .select('*')
          .eq('usage_log_id', log.id);

        // Get chemical details for each usage
        const chemicalsWithDetails = await Promise.all(
          (chemicalUsages || []).map(async (usage) => {
            const { data: chemical } = await supabase
              .from('chemicals')
              .select('id, name, batch_number, brand, location, unit, current_quantity')
              .eq('id', usage.chemical_id)
              .single();

            return {
              ...usage,
              chemical: chemical || null
            };
          })
        );

        // Get equipment details
        const { data: equipmentLinks } = await supabase
          .from('usage_log_equipment')
          .select('equipment_id')
          .eq('usage_log_id', log.id);

        const equipmentWithDetails = await Promise.all(
          (equipmentLinks || []).map(async (link) => {
            const { data: equipment } = await supabase
              .from('equipment')
              .select('id, name, model, serial_id, status, location')
              .eq('id', link.equipment_id)
              .single();

            return equipment;
          })
        );

        // Filter out any null equipment (in case equipment was deleted)
        const validEquipment = equipmentWithDetails.filter(eq => eq !== null);

        return {
          ...log,
          chemicals: chemicalsWithDetails.map(usage => ({
            id: usage.chemical_id,
            chemical_id: usage.chemical_id,
            chemical_name: usage.chemical?.name,
            quantity: usage.quantity,
            unit: usage.unit,
            opened: usage.opened,
            remaining_amount: usage.remaining_amount,
            // Include chemical details for display
            name: usage.chemical?.name,
            batch_number: usage.chemical?.batch_number,
            brand: usage.chemical?.brand,
            location: usage.chemical?.location,
            current_quantity: usage.chemical?.current_quantity
          })),
          equipment: validEquipment
        };
      })
    );

    return logsWithDetails;
  } catch (error) {
    console.error('Error fetching chemical usage logs:', error);
    throw error;
  }
};

// Update other functions to use manual joins
export const getChemicalUsageHistory = async (chemicalId = null, startDate = null, endDate = null) => {
  try {
    let query = supabase
      .from('chemical_usage')
      .select('*')
      .order('created_at', { ascending: false });

    if (chemicalId) {
      query = query.eq('chemical_id', chemicalId);
    }

    const { data: chemicalUsages, error } = await query;
    if (error) throw error;

    // Get usage log details for each chemical usage
    const usageWithDetails = await Promise.all(
      (chemicalUsages || []).map(async (usage) => {
        const { data: usageLog } = await supabase
          .from('usage_logs')
          .select('*')
          .eq('id', usage.usage_log_id)
          .single();

        const { data: chemical } = await supabase
          .from('chemicals')
          .select('name, batch_number, brand')
          .eq('id', usage.chemical_id)
          .single();

        return {
          ...usage,
          usage_log: usageLog,
          chemical: chemical
        };
      })
    );

    // Apply date filters
    let filteredData = usageWithDetails;
    if (startDate) {
      filteredData = filteredData.filter(item => 
        item.usage_log && new Date(item.usage_log.date) >= new Date(startDate)
      );
    }
    if (endDate) {
      filteredData = filteredData.filter(item => 
        item.usage_log && new Date(item.usage_log.date) <= new Date(endDate)
      );
    }

    return filteredData;
  } catch (error) {
    console.error('Error fetching chemical usage history:', error);
    throw error;
  }
};

// Keep other functions as they are, but they might need similar manual join updates
export const getChemicalUsageByUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

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

    const { data: chemicalUsages, error } = await supabase
      .from('chemical_usage')
      .select('quantity, created_at, usage_log_id')
      .eq('chemical_id', chemicalId)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Get dates from usage logs
    const statsWithDates = await Promise.all(
      (chemicalUsages || []).map(async (usage) => {
        const { data: usageLog } = await supabase
          .from('usage_logs')
          .select('date')
          .eq('id', usage.usage_log_id)
          .single();

        return {
          quantity: usage.quantity,
          date: usageLog?.date || usage.created_at
        };
      })
    );

    return statsWithDates.sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (error) {
    console.error('Error fetching chemical usage stats:', error);
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
    // First get the chemical usage records to restore quantities
    const { data: chemicalUsages, error: fetchUsagesError } = await supabase
      .from('chemical_usage')
      .select('chemical_id, quantity')
      .eq('usage_log_id', logId);

    if (fetchUsagesError) throw fetchUsagesError;

    // Delete related equipment links
    const { error: equipmentError } = await supabase
      .from('usage_log_equipment')
      .delete()
      .eq('usage_log_id', logId);

    if (equipmentError) throw equipmentError;

    // Delete chemical usage records
    const { error: usageError } = await supabase
      .from('chemical_usage')
      .delete()
      .eq('usage_log_id', logId);

    if (usageError) throw usageError;

    // Delete the main usage log
    const { error } = await supabase
      .from('usage_logs')
      .delete()
      .eq('id', logId);

    if (error) throw error;

    // Restore chemical quantities
    if (chemicalUsages && chemicalUsages.length > 0) {
      for (const usage of chemicalUsages) {
        const { data: chemical } = await supabase
          .from('chemicals')
          .select('current_quantity')
          .eq('id', usage.chemical_id)
          .single();

        const { error: updateError } = await supabase
          .from('chemicals')
          .update({ 
            current_quantity: chemical.current_quantity + usage.quantity
          })
          .eq('id', usage.chemical_id);

        if (updateError) throw updateError;
      }
    }

    return true;
  } catch (error) {
    console.error('Error deleting chemical usage log:', error);
    throw error;
  }
};

export const getOpenedChemicals = async () => {
  try {
    const { data, error } = await supabase
      .from('chemical_usage')
      .select('*')
      .eq('opened', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching opened chemicals:', error);
    throw error;
  }
};