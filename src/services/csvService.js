
import { supabase } from '../lib/supabase/supabaseClient';

export const csvService = {
  parseCSV(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error)
      });
    });
  },

  generateCSV(data, filename) {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) {
      // For IE and Edge
      navigator.msSaveBlob(blob, filename);
    } else {
      // For other browsers
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  // Upload CSV to Supabase Storage
  async uploadCSV(file, bucket, path) {
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .upload(path, file, {
        contentType: 'text/csv'
      });

    if (error) throw error;
    return data;
  },

  // Download CSV from Supabase Storage
  async downloadCSV(bucket, path) {
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .download(path);

    if (error) throw error;
    return data;
  },

  // Helper function to validate chemical CSV data
  validateChemicalCSV(data) {
    const requiredFields = [
      'name',
      'initial_quantity',
      'current_quantity',
      'safety_class',
      'location'
    ];

    const errors = [];

    data.forEach((row, index) => {
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`Row ${index + 1}: Missing required field '${field}'`);
        }
      });

      if (row.safety_class && !['moderate', 'toxic', 'corrosive', 'reactive', 'flammable'].includes(row.safety_class)) {
        errors.push(`Row ${index + 1}: Invalid safety class '${row.safety_class}'`);
      }

      if (row.initial_quantity && isNaN(parseFloat(row.initial_quantity))) {
        errors.push(`Row ${index + 1}: Initial quantity must be a number`);
      }

      if (row.current_quantity && isNaN(parseFloat(row.current_quantity))) {
        errors.push(`Row ${index + 1}: Current quantity must be a number`);
      }
    });

    return errors;
  },

  // Helper function to validate equipment CSV data
  validateEquipmentCSV(data) {
    const requiredFields = [
      'name',
      'serial_id',
      'status',
      'location'
    ];

    const errors = [];

    data.forEach((row, index) => {
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`Row ${index + 1}: Missing required field '${field}'`);
        }
      });

      if (row.status && !['Available', 'Broken', 'Under Maintenance'].includes(row.status)) {
        errors.push(`Row ${index + 1}: Invalid status '${row.status}'`);
      }
    });

    return errors;
  }
};