// src/components/DetailView.jsx
import React, { useState, useEffect, useContext } from 'react';
import { ChevronLeft, Edit, Trash2, User, MapPin, Clock, Microscope } from 'lucide-react';
import { safetyColors, statusColors, ghsSymbols } from '../utils/data';
import { formatDate, normalizeGhsSymbols } from '../utils/helpers';
import { 
  updateChemical as apiUpdateChemical, 
  deleteChemical as apiDeleteChemical, 
  updateEquipment as apiUpdateEquipment, 
  deleteEquipment as apiDeleteEquipment,
  getChemicalUsageLogs
} from '../services/api';
import { DatabaseContext } from '../contexts/DatabaseContext';
import { supabase } from '../lib/supabase/supabaseClient';

// Helper function to get user display name (same as in Sidebar and LogChemicalUsage)
const getUserDisplayName = (user) => {
  if (!user) return 'System';
  
  // Try to get name from user_metadata (Supabase Auth)
  const userName = user.user_metadata?.name || 
                  user.user_metadata?.full_name || 
                  user.user_metadata?.username;
  
  if (userName) return userName;
  
  // Fallback: use email username with nice formatting
  if (user.email) {
    const emailUsername = user.email.split('@')[0];
    const formattedUsername = emailUsername
      .split(/[._]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
    
    return formattedUsername;
  }
  
  return 'System';
};

// Helper function to safely normalize GHS symbols
const safeNormalizeGhsSymbols = (symbols) => {
  if (!symbols) return [];
  
  try {
    // If it's already an array, return it
    if (Array.isArray(symbols)) {
      return symbols;
    }
    
    // If it's a string, try to parse as JSON first, otherwise treat as single symbol
    if (typeof symbols === 'string') {
      // Try to parse as JSON array
      try {
        const parsed = JSON.parse(symbols);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        // If JSON parsing fails, treat the string as a single symbol
        console.log('GHS symbols is a string, not JSON. Using as single symbol:', symbols);
        return [symbols];
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error normalizing GHS symbols:', error);
    return [];
  }
};

const DetailView = ({ 
  selectedItem, 
  setCurrentView, 
  userRole, 
  chemicals, 
  equipment, 
  updateChemicals, 
  updateEquipment,
  refreshData
}) => {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usageLogs, setUsageLogs] = useState([]);
  const { user, addAuditLog } = useContext(DatabaseContext);
  
  const isAdmin = userRole === 'admin';
  const isChemical = selectedItem?.type === 'chemical';

  // Helper functions
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
  };

  const initializeEditForm = (item) => {
    if (!item) return null;
    
    const cleanItem = { ...item };
    const dateFields = ['expiration_date', 'date_of_arrival', 'purchase_date', 'warranty_expiration'];
    
    dateFields.forEach(field => {
      if (cleanItem[field]) {
        cleanItem[field] = formatDateForInput(cleanItem[field]);
      }
    });
    
    return cleanItem;
  };

  const cleanFormData = (data) => {
    const excludedFields = ['usage_log', 'type', 'maintenance_log', 'assigned_user_name', 'assignedUserId'];
    
    return Object.fromEntries(
      Object.entries(data)
        .filter(([key]) => !excludedFields.includes(key))
        .map(([key, value]) => [key, value === undefined || value === '' ? null : value])
    );
  };

  // Fetch usage logs for chemical
  const fetchChemicalUsageLogs = async (chemicalId) => {
    try {
      console.log('🔍 Fetching usage logs for chemical:', chemicalId);
      
      const { data, error } = await supabase
        .from('usage_logs')
        .select('*')
        .eq('chemical_id', chemicalId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching usage logs:', error);
        throw error;
      }

      console.log('✅ Usage logs fetched:', data);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch usage logs:', error);
      return [];
    }
  };

  // Effects
  useEffect(() => {
    if (selectedItem) {
      setEditForm(initializeEditForm(selectedItem));
      
      // Fetch usage logs when chemical is selected
      if (isChemical) {
        const loadUsageLogs = async () => {
          const logs = await fetchChemicalUsageLogs(selectedItem.id);
          setUsageLogs(logs);
        };
        loadUsageLogs();
      }
    }
  }, [selectedItem]);

  // Event handlers
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    let processedValue = value;
    if (type === 'number') {
      processedValue = value === '' ? null : Number(value);
    } else if (type === 'date') {
      processedValue = value || null;
    }
    
    setEditForm(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handlePhysicalStateChange = (state) => {
    setEditForm(prev => ({ 
      ...prev, 
      physical_state: state,
      unit: '' // Clear unit when state changes
    }));
  };

  const handleSave = async () => {
    if (!editForm) return;
    
    try {
      setLoading(true);
      setError('');
      
      const cleanData = cleanFormData(editForm);
      console.log('🔍 Sending update data:', cleanData);
      
      let updatedItem;
      let auditData;

      if (isChemical) {
        console.log('🧪 Updating chemical...');
        updatedItem = await apiUpdateChemical(selectedItem.id, cleanData);
        console.log('✅ Chemical update response:', updatedItem);
        
        if (!updatedItem?.id) {
          throw new Error('Failed to update chemical: Invalid response from server');
        }
        
        updateChemicals(chemicals.map(chem => 
          chem.id === selectedItem.id ? updatedItem : chem
        ));
        
        auditData = {
          type: 'chemical',
          action: 'update',
          itemName: updatedItem.name,
          user_role: userRole,  
          user_name: getUserDisplayName(user) || 'System',            
          details: { batchNumber: updatedItem.batch_number }
        };
      } else {
        console.log('🔧 Updating equipment...');
        updatedItem = await apiUpdateEquipment(selectedItem.id, cleanData);
        console.log('✅ Equipment update response:', updatedItem);
        
        if (!updatedItem) {
          throw new Error('Failed to update equipment: Empty response from server');
        }
        
        updateEquipment(equipment.map(eq => 
          eq.id === selectedItem.id ? { ...updatedItem, type: 'equipment' } : eq
        ));
        
        auditData = {
          type: 'equipment',
          action: 'update',
          itemName: updatedItem.name || selectedItem.name,
          user_role: userRole,  
          user_name: getUserDisplayName(user) || 'System',            
          details: { 
            model: updatedItem.model,
            serial_id: updatedItem.serial_id,
            status: updatedItem.status,
            condition: updatedItem.equipment_condition
          }        
        };
      }
      
      addAuditLog(auditData);
      setEditing(false);
      console.log('🎉 Update successful!');
    } catch (error) {
      console.error('❌ Failed to update:', error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete this ${selectedItem.type}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      let auditData;

      if (isChemical) {
        await apiDeleteChemical(selectedItem.id);
        updateChemicals(chemicals.filter(chem => chem.id !== selectedItem.id));
        auditData = {
          type: 'chemical',
          action: 'delete',
          item_name: selectedItem.name,
          user_role: userRole,         
          user_name: getUserDisplayName(user) || 'System', 
          details: { batchNumber: selectedItem.batch_number }
        };
      } else {
        await apiDeleteEquipment(selectedItem.id);
        updateEquipment(equipment.filter(eq => eq.id !== selectedItem.id));
        auditData = {
          type: 'equipment',
          action: 'delete',
          item_name: selectedItem.name,
          user_role: userRole,         
          user_name: getUserDisplayName(user) || 'System', 
          details: { serialId: selectedItem.serial_id }
        };
      }
      
      addAuditLog(auditData);
      setCurrentView(isChemical ? 'chemicals' : 'equipment');
    } catch (error) {
      console.error('Failed to delete:', error);
      setError('Failed to delete item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditForm(initializeEditForm(selectedItem));
    setEditing(false);
    setError('');
  };

  const handleError = (error) => {
    if (error.response) {
      setError(`Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
    } else if (error.request) {
      setError('Network error: Could not connect to server');
    } else {
      setError(error.message || 'Failed to update item. Please try again.');
    }
  };

  // Render components
  const renderHeader = () => (
    <div className="detail-header">
      <button 
        onClick={() => setCurrentView(isChemical ? 'chemicals' : 'equipment')}
        className="back-button"
        disabled={loading}
      >
        <ChevronLeft className="back-icon" />
      </button>
      <h1 className="detail-title">
        {isChemical ? 'Chemical' : 'Equipment'} Details
      </h1>
      {isAdmin && renderActionButtons()}
    </div>
  );

  const renderActionButtons = () => (
    <div className="ml-auto flex gap-2">
      {editing ? (
        <>
          <button onClick={handleCancel} className="form-button bg-gray-500" disabled={loading}>
            Cancel
          </button>
          <button onClick={handleSave} className="form-button" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </>
      ) : (
        <>
          <button onClick={() => setEditing(true)} className="view-button" disabled={loading}>
            <Edit className="view-icon" />
          </button>
          <button onClick={handleDelete} className="view-button text-red-500" disabled={loading}>
            <Trash2 className="view-icon" />
          </button>
        </>
      )}
    </div>
  );

  const renderError = () => (
    error && (
      <div className="error-message mb-4">
        {error}
      </div>
    )
  );

  const renderChemicalProperties = () => {
    const chemical = editing ? editForm : selectedItem;
    
    const properties = [
      { label: 'Batch Number', name: 'batch_number', type: 'text' },
      { label: 'Brand', name: 'brand', type: 'text' },
      { label: 'Initial Quantity', name: 'initial_quantity', type: 'number' },
      { label: 'Current Quantity', name: 'current_quantity', type: 'number' },
      { label: 'Expiration Date', name: 'expiration_date', type: 'date' },
      { label: 'Date of Arrival', name: 'date_of_arrival', type: 'date' },
      { label: 'Location', name: 'location', type: 'text' },
    ];

    return (
      <div className="detail-properties">
        {properties.map(({ label, name, type }) => (
          <div key={name} className="detail-property">
            <span className="property-label">{label}:</span>
            {editing ? (
              <input
                type={type}
                name={name}
                value={chemical[name] || ''}
                onChange={handleInputChange}
                className="form-input"
                disabled={loading}
              />
            ) : (
              <span className="property-value">{chemical[name] || 'N/A'}</span>
            )}
          </div>
        ))}
        
        {/* Physical State */}
        <div className="detail-property">
          <span className="property-label">Physical State:</span>
          {editing ? (
            <div className="flex space-x-4 mt-2">
              {['liquid', 'solid'].map(state => (
                <label key={state} className="flex items-center">
                  <input
                    type="radio"
                    name="physical_state"
                    value={state}
                    checked={chemical.physical_state === state}
                    onChange={(e) => handlePhysicalStateChange(e.target.value)}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="capitalize">{state}</span>
                </label>
              ))}
            </div>
          ) : (
            <span className="property-value capitalize">{chemical.physical_state}</span>
          )}
        </div>
        
        {/* Unit */}
        <div className="detail-property">
          <span className="property-label">
            {chemical.physical_state === 'liquid' ? 'Volume' : 'Weight'}:
          </span>
          {editing ? (
            <input
              type="text"
              name="unit"
              value={chemical.unit || ''}
              onChange={handleInputChange}
              className="form-input"
              placeholder={chemical.physical_state === 'liquid' ? 'e.g., 500mL, 1L' : 'e.g., 100g, 1kg'}
              disabled={loading}
            />
          ) : (
            <span className="property-value">{chemical.unit || 'N/A'}</span>
          )}
        </div>
        
        {/* Safety Class */}
        <div className="detail-property">
          <span className="property-label">Safety Class:</span>
          {editing ? (
            <select
              name="safety_class"
              value={chemical.safety_class || ''}
              onChange={handleInputChange}
              className="form-select"
              disabled={loading}
            >
              <option value="moderate-hazard">Moderate Hazard</option>
              <option value="toxic">Toxic</option>
              <option value="corrosive">Corrosive</option>
              <option value="reactive">Reactive</option>
              <option value="flammable">Flammable</option>
            </select>
          ) : (
            <span className={`status-badge ${safetyColors[chemical.safety_class]}`}>
              {chemical.safety_class}
            </span>
          )}
        </div>
        
        {/* GHS Symbols */}
        {!editing && chemical.ghs_symbols && (
          <div className="detail-property">
            <span className="property-label">GHS Symbols:</span>
            <div className="ghs-symbols">
              {safeNormalizeGhsSymbols(chemical.ghs_symbols).map(symbol => {
                const imgSrc = ghsSymbols[symbol];
                if (!imgSrc) {
                  return (
                    <span key={symbol} className="ghs-symbol-missing" title={symbol}>
                      {symbol}
                    </span>
                  );
                }
                
                return (
                  <img
                    key={symbol}
                    src={imgSrc}
                    alt={symbol}
                    title={symbol}
                    className="ghs-symbol-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      console.error(`Failed to load GHS symbol: ${symbol}`);
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEquipmentProperties = () => {
    const equipmentItem = editing ? editForm : selectedItem;
    
    const properties = [
      { label: 'Model Number', name: 'model', type: 'text' },
      { label: 'Serial ID', name: 'serial_id', type: 'text' },
      { label: 'Location', name: 'location', type: 'text' },
      { label: 'Purchase Date', name: 'purchase_date', type: 'date' },
      { label: 'Warranty Expiration', name: 'warranty_expiration', type: 'date' },
      { label: 'Last Maintenance', name: 'last_maintenance', type: 'text', readOnly: true },
      { label: 'Next Maintenance', name: 'next_maintenance', type: 'text', readOnly: true },
    ];

    return (
      <div className="detail-properties">
        {properties.map(({ label, name, type, readOnly }) => (
          <div key={name} className="detail-property">
            <span className="property-label">{label}:</span>
            {editing && !readOnly ? (
              <input
                type={type}
                name={name}
                value={equipmentItem[name] || ''}
                onChange={handleInputChange}
                className="form-input"
                disabled={loading}
              />
            ) : (
              <span className="property-value">
                {type === 'date' ? formatDate(equipmentItem[name]) : equipmentItem[name] || 'N/A'}
              </span>
            )}
          </div>
        ))}
        
        {/* Status */}
        <div className="detail-property">
          <span className="property-label">Status:</span>
          {editing ? (
            <select
              name="status"
              value={equipmentItem.status || ''}
              onChange={handleInputChange}
              className="form-select"
              disabled={loading}
            >
              <option value="Available">Available</option>
              <option value="Broken">Broken</option>
              <option value="Under Maintenance">Under Maintenance</option>
            </select>
          ) : (
            <span className={`status-badge ${statusColors[equipmentItem.status]}`}>
              {equipmentItem.status}
            </span>
          )}
        </div>
        
        {/* Condition */}
        <div className="detail-property">
          <span className="property-label">Condition:</span>
          {editing ? (
            <select
              name="equipment_condition"
              value={equipmentItem.equipment_condition || ''}
              onChange={handleInputChange}
              className="form-select"
              disabled={loading}
            >
              <option value="Good">Good</option>
              <option value="Needs Repair">Needs Repair</option>
              <option value="Broken">Broken</option>
            </select>
          ) : (
            <span className="property-value">{equipmentItem.equipment_condition}</span>
          )}
        </div>
      </div>
    );
  };

  const renderUsageLog = () => {
    const title = isChemical ? 'Usage Log' : 'Maintenance Log';
    const emptyMessage = isChemical ? 'No usage recorded' : 'No maintenance recorded';

    // Use fetched usage logs for chemicals, fallback to item data for equipment
    const logs = isChemical ? usageLogs : (selectedItem?.maintenance_log || []);

    return (
      <div>
        <h3 className="detail-section-title">{title}</h3>
        <div className="log-container">
          {logs?.map((log, index) => (
            <div key={index} className="log-item">
              <div className="log-header">
                <div>
                  <p className="log-user">
                    {isChemical ? log.user_name : log.action}
                  </p>
                  {isChemical && (
                    <p className="log-location">
                      <MapPin size={12} className="inline mr-1" />
                      {log.location || 'N/A'}
                    </p>
                  )}
                  {!isChemical && (
                    <p className="log-location">{log.user_name}</p>
                  )}
                </div>
                <div className="text-right">
                  {isChemical && (
                    <p className="log-quantity">{log.quantity} units</p>
                  )}
                  <p className="log-date">
                    <Clock size={12} className="inline mr-1" />
                    {formatDate(log.date)}
                  </p>
                </div>
              </div>
              {isChemical && log.opened && <span className="log-tag">Opened</span>}
              {isChemical && log.remaining_amount && (
                <span className="log-tag">{log.remaining_amount}mL remaining</span>
              )}
              {log.notes && (
                <p className="text-xs text-gray-500 mt-1">{log.notes}</p>
              )}
            </div>
          ))}
          {(!logs || logs.length === 0) && (
            <p className="no-data">{emptyMessage}</p>
          )}
        </div>
      </div>
    );
  };

  // Main render
  if (!selectedItem || !editForm) return null;

  return (
    <div>
      {renderHeader()}
      {renderError()}
      
      <div className="detail-container">
        <div className="detail-grid">
          <div>
            <h2 className="detail-section-title">{editForm.name}</h2>
            {isChemical ? renderChemicalProperties() : renderEquipmentProperties()}
          </div>
          
          <div>
            {renderUsageLog()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailView;