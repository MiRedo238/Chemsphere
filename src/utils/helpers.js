// src/utils/helpers.js
// Format date for display
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Calculate days until expiration
export const daysUntilExpiration = (expirationDate) => {
  if (!expirationDate) return Infinity;
  const expDate = new Date(expirationDate);
  const today = new Date();
  const diffTime = expDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Filter chemicals by search term (FIXED for backend compatibility)
export const filterChemicals = (chemicals, searchTerm, filterClass, sortBy = 'name', sortOrder = 'asc') => {
  let filtered = chemicals.filter(chem => {
    // Handle undefined or null values safely
    const name = chem.name || '';
    const batchNumber = chem.batch_number || '';
    
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterClass === 'all' || chem.safety_class === filterClass;
    return matchesSearch && matchesFilter;
  });

  // Apply sorting
  return sortItems(filtered, sortBy, sortOrder);
};

// Filter equipment by search term (FIXED for backend compatibility)
export const filterEquipment = (equipment, searchTerm, statusFilter, sortBy = 'name', sortOrder = 'asc') => {
  let filtered = equipment.filter(eq => {
    // Handle undefined or null values safely
    const name = eq.name || '';
    const serialId = eq.serial_id || '';
    
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         serialId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || eq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Apply sorting
  return sortItems(filtered, sortBy, sortOrder);
};

// Sort items by field (updated for backend field names)
export const sortItems = (items, field, direction = 'asc') => {
  return [...items].sort((a, b) => {
    let valueA = a[field];
    let valueB = b[field];
    
    // Handle date fields specially
    if (field === 'created_at' || field === 'date_of_arrival' || field === 'purchase_date' || 
        field === 'expiration_date' || field === 'last_maintenance' || field === 'next_maintenance') {
      valueA = valueA ? new Date(valueA).getTime() : 0;
      valueB = valueB ? new Date(valueB).getTime() : 0;
    } else {
      // Handle undefined or null values for non-date fields
      if (valueA === null || valueA === undefined) valueA = '';
      if (valueB === null || valueB === undefined) valueB = '';
      
      if (typeof valueA === 'string') valueA = valueA.toLowerCase();
      if (typeof valueB === 'string') valueB = valueB.toLowerCase();
    }
    
    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// Get available sort options for chemicals
export const getChemicalSortOptions = () => [
  { value: 'name', label: 'Name' },
  { value: 'batch_number', label: 'Batch Number' },
  { value: 'expiration_date', label: 'Expiration Date' },
  { value: 'date_of_arrival', label: 'Arrival Date' },
  { value: 'created_at', label: 'Date Added' },
  { value: 'safety_class', label: 'Safety Class' },
  { value: 'current_quantity', label: 'Current Quantity' }
];

// Get available sort options for equipment
export const getEquipmentSortOptions = () => [
  { value: 'name', label: 'Name' },
  { value: 'serial_id', label: 'Serial ID' },
  { value: 'model', label: 'Model' },
  { value: 'status', label: 'Status' },
  { value: 'purchase_date', label: 'Purchase Date' },
  { value: 'created_at', label: 'Date Added' },
  { value: 'next_maintenance', label: 'Next Maintenance' }
];

// Export data to CSV (updated for backend field names)
export const exportToCSV = (data, filename) => {
  if (data.length === 0) return;
  
  // Map backend field names to frontend expected names
  const mappedData = data.map(item => {
    if ('batch_number' in item) {
      // Chemical data
      return {
        name: item.name,
        batchNumber: item.batch_number,
        brand: item.brand,
        volume: item.volume,
        initialQuantity: item.initial_quantity,
        currentQuantity: item.current_quantity,
        expirationDate: item.expiration_date,
        dateOfArrival: item.date_of_arrival,
        safetyClass: item.safety_class,
        location: item.location,
        ghsSymbols: item.ghs_symbols ? item.ghs_symbols.join(',') : '',
        dateAdded: item.created_at // Add date added to export
      };
    } else {
      // Equipment data
      return {
        name: item.name,
        model: item.model,
        serialId: item.serial_id,
        status: item.status,
        location: item.location,
        purchaseDate: item.purchase_date,
        warrantyExpiration: item.warranty_expiration,
        condition: item.condition,
        lastMaintenance: item.last_maintenance,
        nextMaintenance: item.next_maintenance,
        dateAdded: item.created_at // Add date added to export
      };
    }
  });
  
  const headers = Object.keys(mappedData[0]).join(',');
  const rows = mappedData.map(obj => Object.values(obj).join(','));
  const csv = [headers, ...rows].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Import from CSV (for local file parsing - used when API import is not available)
export const importFromCSV = (file, callback) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    
    const data = lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index] ? values[index].trim() : '';
      });
      return obj;
    }).filter(obj => Object.values(obj).some(val => val !== ''));
    
    callback(data);
  };
  reader.readAsText(file);
};

export const normalizeGhsSymbols = (symbols) => {
  if (!symbols) return [];
  
  // If it's already an array, return it
  if (Array.isArray(symbols)) {
    return symbols;
  }
  
  // If it's a string that looks like JSON, try to parse it
  if (typeof symbols === 'string') {
    try {
      // Handle malformed JSON strings
      const cleanString = symbols.replace(/\\"/g, '"').replace(/^"+|"+$/g, '');
      const parsed = JSON.parse(cleanString);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error('Error parsing GHS symbols:', e, 'Raw symbols:', symbols);
      // If parsing fails, try to extract symbols from the string
      if (symbols.includes(',')) {
        return symbols.split(',').map(s => s.trim().replace(/^"+|"+$/g, ''));
      }
      return [symbols];
    }
  }
  
  // If it's a single symbol, wrap it in an array
  return [symbols];
};

// Add to src/utils/helpers.js
export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Convert from ISO format to YYYY-MM-DD
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Get relative time string (e.g., "2 days ago", "1 week ago")
export const getRelativeTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

// Check if item is newly added (within last 7 days)
export const isNewItem = (dateString) => {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= 7;
};