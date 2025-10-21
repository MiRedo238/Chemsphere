import { supabase } from '../lib/supabase/supabaseClient';

export const getAllEquipment = async () => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
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
    return data;
  } catch (error) {
    console.error('Error fetching equipment:', error);
    throw error;
  }
};

export const createEquipment = async (equipmentData) => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .insert([equipmentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating equipment:', error);
    throw error;
  }
};

export const updateEquipment = async (id, equipmentData) => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .update(equipmentData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
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
    return data;
  } catch (error) {
    console.error('Error fetching maintenance required equipment:', error);
    throw error;
  }
};

export const updateMaintenanceStatus = async (id, maintenanceData) => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .update({
        lastMaintenanceDate: new Date().toISOString(),
        maintenanceRequired: false,
        ...maintenanceData
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating maintenance status:', error);
    throw error;
  }
};
