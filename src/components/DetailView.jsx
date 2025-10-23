// src/components/DetailView.jsx
import React, { useState, useEffect, useContext } from 'react';
import { ChevronLeft, Edit, Trash2, User, MapPin, Clock, Microscope } from 'lucide-react';
import { safetyColors, statusColors, ghsSymbols } from '../utils/data';
import { formatDate, normalizeGhsSymbols } from '../utils/helpers';
import { 
  updateChemical as apiUpdateChemical, 
  deleteChemical as apiDeleteChemical, 
  updateEquipment as apiUpdateEquipment, 
  deleteEquipment as apiDeleteEquipment 
} from '../services/api';
import { DatabaseContext } from '../contexts/DatabaseContext';

const DetailView = ({ 
  selectedItem, 
  setCurrentView, 
  userRole, 
  chemicals, 
  equipment, 
  updateChemicals, 
  updateEquipment, // This is the prop function to update equipment list
  refreshData
}) => {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, addAuditLog } = useContext(DatabaseContext);
  
  const isAdmin = userRole === 'admin';

  // Helper function to format dates for input fields
  const formatDateForInput = (dateString) => {
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
  
  // Initialize editForm when selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      // Create a clean copy with properly formatted dates
      const cleanItem = { ...selectedItem };
      
      // Format dates for input fields (convert from ISO to YYYY-MM-DD)
      if (cleanItem.expiration_date) {
        cleanItem.expiration_date = formatDateForInput(cleanItem.expiration_date);
      }
      if (cleanItem.date_of_arrival) {
        cleanItem.date_of_arrival = formatDateForInput(cleanItem.date_of_arrival);
      }
      if (cleanItem.purchase_date) {
        cleanItem.purchase_date = formatDateForInput(cleanItem.purchase_date);
      }
      if (cleanItem.warranty_expiration) {
        cleanItem.warranty_expiration = formatDateForInput(cleanItem.warranty_expiration);
      }
      
      setEditForm(cleanItem);
    }
  }, [selectedItem]);

  if (!selectedItem || !editForm) return null;

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Create a clean copy for API request - exclude unused fields and assignedUserId
      const cleanData = Object.fromEntries(
        Object.entries(editForm)
          .filter(([key]) => ![
            'usage_log', 
            'type', 
            'maintenance_log', 
            'assigned_user_name',
            'assignedUserId' // Add this to the exclusion list
          ].includes(key))
          .map(([key, value]) => {
            if (value === undefined || value === '') {
              return [key, null];
            }
            return [key, value];
          })
      );
      
      console.log('🔍 Sending update data:', cleanData);
      
      if (selectedItem.type === 'chemical') {
        console.log('🧪 Updating chemical...');
        const updatedChemical = await apiUpdateChemical(selectedItem.id, cleanData);
        console.log('✅ Chemical update response:', updatedChemical);
        
        if (!updatedChemical || !updatedChemical.id) {
          throw new Error('Failed to update chemical: Invalid response from server');
        }
        
        updateChemicals(chemicals.map(chem => 
          chem.id === selectedItem.id ? updatedChemical : chem
        ));
        
        addAuditLog({
          type: 'chemical',
          action: 'update',
          itemName: updatedChemical.name,
          user_role: userRole,  
          user_name: user?.name || user?.username || 'System',            
          details: { batchNumber: updatedChemical.batch_number }
        });
      } else {
        console.log('🔧 Updating equipment...');
        const updatedEquipment = await apiUpdateEquipment(selectedItem.id, cleanData);
        console.log('✅ Equipment update response:', updatedEquipment);
        
        if (!updatedEquipment) {
          throw new Error('Failed to update equipment: Empty response from server');
        }
        
        // Use the prop function to update equipment list
        updateEquipment(equipment.map(eq => 
          eq.id === selectedItem.id ? { ...updatedEquipment, type: 'equipment' } : eq
        ));
        
        addAuditLog({
          type: 'equipment',
          action: 'update',
          itemName: updatedEquipment.name || selectedItem.name,
          user_role: userRole,  
          user_name: user?.name || user?.username || 'System',            
          details: { 
              model: updatedEquipment.model,
              serial_id: updatedEquipment.serial_id,
              status: updatedEquipment.status,
              condition: updatedEquipment.equipment_condition
              }        
          });
      }
      
      setEditing(false);
      console.log('🎉 Update successful!');
    } catch (error) {
      console.error('❌ Failed to update:', error);
      
      // More detailed error message
      if (error.response) {
        // Axios error response
        setError(`Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        // Network error
        setError('Network error: Could not connect to server');
      } else {
        // Other errors
        setError(error.message || 'Failed to update item. Please try again.');
      }
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
      
      if (selectedItem.type === 'chemical') {
        await apiDeleteChemical(selectedItem.id);
        updateChemicals(chemicals.filter(chem => chem.id !== selectedItem.id));
        addAuditLog({
          type: 'chemical',
          action: 'delete',
          item_name: selectedItem.name,
          user_role: userRole,         
          user_name: user?.name || user?.username || 'System', 
          details: { batchNumber: selectedItem.batch_number }
        });
      } else {
        await apiDeleteEquipment(selectedItem.id);
        updateEquipment(equipment.filter(eq => eq.id !== selectedItem.id));
        addAuditLog({
          type: 'equipment',
          action: 'delete',
          item_name: selectedItem.name,
          user_role: userRole,         
          user_name: user?.name || user?.username || 'System', 
          details: { serialId: selectedItem.serial_id }
        });
      }
      
      setCurrentView(selectedItem.type === 'chemical' ? 'chemicals' : 'equipment');
    } catch (error) {
      console.error('Failed to delete:', error);
      setError('Failed to delete item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    // Handle empty values for number inputs
    let processedValue = value;
    if (type === 'number') {
      processedValue = value === '' ? null : Number(value);
    } else if (type === 'date') {
      processedValue = value || null;
    }
    
    setEditForm({
      ...editForm,
      [name]: processedValue
    });
  };

  const handlePhysicalStateChange = (state) => {
    setEditForm({ 
      ...editForm, 
      physical_state: state,
      unit: '' // Clear unit when state changes
    });
  };

  const handleCancel = () => {
    // Reset form to original selectedItem values
    const cleanItem = { ...selectedItem };
    
    // Format dates for input fields
    if (cleanItem.expiration_date) {
      cleanItem.expiration_date = formatDateForInput(cleanItem.expiration_date);
    }
    if (cleanItem.date_of_arrival) {
      cleanItem.date_of_arrival = formatDateForInput(cleanItem.date_of_arrival);
    }
    if (cleanItem.purchase_date) {
      cleanItem.purchase_date = formatDateForInput(cleanItem.purchase_date);
    }
    if (cleanItem.warranty_expiration) {
      cleanItem.warranty_expiration = formatDateForInput(cleanItem.warranty_expiration);
    }
    
    setEditForm(cleanItem);
    setEditing(false);
    setError('');
  };

  // Render chemical details
  const renderChemicalDetails = () => {
    const chemical = editing ? editForm : selectedItem;
    
    return (
      <div>
        <div className="detail-header">
          <button 
            onClick={() => setCurrentView('chemicals')}
            className="back-button"
            disabled={loading}
          >
            <ChevronLeft className="back-icon" />
          </button>
          <h1 className="detail-title">Chemical Details</h1>
          {isAdmin && (
            <div className="detail-actions">
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
          )}
        </div>

        {error && (
          <div className="error-message mb-4">
            {error}
          </div>
        )}

        <div className="detail-container">
          <div className="detail-grid">
            <div>
              <h2 className="detail-section-title">{chemical.name}</h2>
              <div className="detail-properties">
                <div className="detail-property">
                  <span className="property-label">Batch Number:</span>
                  {editing ? (
                    <input
                      type="text"
                      name="batch_number"
                      value={chemical.batch_number || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={loading}
                    />
                  ) : (
                    <span className="property-value">{chemical.batch_number}</span>
                  )}
                </div>
                
                <div className="detail-property">
                  <span className="property-label">Brand:</span>
                  {editing ? (
                    <input
                      type="text"
                      name="brand"
                      value={chemical.brand || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={loading}
                    />
                  ) : (
                    <span className="property-value">{chemical.brand}</span>
                  )}
                </div>
                
                {/* Physical State Radio Buttons */}
                <div className="detail-property">
                  <span className="property-label">Physical State:</span>
                  {editing ? (
                    <div className="flex space-x-4 mt-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="physical_state"
                          value="liquid"
                          checked={chemical.physical_state === 'liquid'}
                          onChange={(e) => handlePhysicalStateChange(e.target.value)}
                          className="mr-2"
                          disabled={loading}
                        />
                        <span>Liquid</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="physical_state"
                          value="solid"
                          checked={chemical.physical_state === 'solid'}
                          onChange={(e) => handlePhysicalStateChange(e.target.value)}
                          className="mr-2"
                          disabled={loading}
                        />
                        <span>Solid</span>
                      </label>
                    </div>
                  ) : (
                    <span className="property-value capitalize">{chemical.physical_state}</span>
                  )}
                </div>
                
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
                    <span className="property-value">{chemical.unit}</span>
                  )}
                </div>
                
                <div className="detail-property">
                  <span className="property-label">Initial Quantity:</span>
                  {editing ? (
                    <input
                      type="number"
                      name="initial_quantity"
                      value={chemical.initial_quantity || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={loading}
                    />
                  ) : (
                    <span className="property-value">{chemical.initial_quantity}</span>
                  )}
                </div>
                
                <div className="detail-property">
                  <span className="property-label">Current Quantity:</span>
                  {editing ? (
                    <input
                      type="number"
                      name="current_quantity"
                      value={chemical.current_quantity || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={loading}
                    />
                  ) : (
                    <span className="property-value">{chemical.current_quantity}</span>
                  )}
                </div>
                
                <div className="detail-property">
                  <span className="property-label">Expiration Date:</span>
                  {editing ? (
                    <input
                      type="date"
                      name="expiration_date"
                      value={chemical.expiration_date || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={loading}
                    />
                  ) : (
                    <span className="property-value">{formatDate(chemical.expiration_date)}</span>
                  )}
                </div>
                
                <div className="detail-property">
                  <span className="property-label">Date of Arrival:</span>
                  {editing ? (
                    <input
                      type="date"
                      name="date_of_arrival"
                      value={chemical.date_of_arrival || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={loading}
                    />
                  ) : (
                    <span className="property-value">{formatDate(chemical.date_of_arrival)}</span>
                  )}
                </div>
                
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
                
                <div className="detail-property">
                  <span className="property-label">Location:</span>
                  {editing ? (
                    <input
                      type="text"
                      name="location"
                      value={chemical.location || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={loading}
                    />
                  ) : (
                    <span className="property-value">{chemical.location}</span>
                  )}
                </div>
                
                {!editing && chemical.ghs_symbols && (
                  <div className="detail-property">
                    <span className="property-label">GHS Symbols:</span>
                    <div className="ghs-symbols">
                      {normalizeGhsSymbols(chemical.ghs_symbols).map(symbol => {
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
            </div>

            <div>
              <h3 className="detail-section-title">Usage Log</h3>
              <div className="log-container">
                {chemical.usage_log && chemical.usage_log.map((log, index) => (
                  <div key={index} className="log-item">
                    <div className="log-header">
                      <div>
                        <p className="log-user">{log.user_name}</p>
                        <p className="log-location">
                          <MapPin size={12} className="inline mr-1" />
                          {log.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="log-quantity">{log.quantity} units</p>
                        <p className="log-date">
                          <Clock size={12} className="inline mr-1" />
                          {formatDate(log.date)}
                        </p>
                      </div>
                    </div>
                    {log.opened && <span className="log-tag">Opened</span>}
                  </div>
                ))}
                {(!chemical.usage_log || chemical.usage_log.length === 0) && (
                  <p className="no-data">No usage recorded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render equipment details
  const renderEquipmentDetails = () => {
    const equipmentItem = editing ? editForm : selectedItem;
    
    return (
      <div>
        <div className="detail-header">
          <button 
            onClick={() => setCurrentView('equipment')}
            className="back-button"
            disabled={loading}
          >
            <ChevronLeft className="back-icon" />
          </button>
          <h1 className="detail-title">Equipment Details</h1>
          {isAdmin && (
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
          )}
        </div>

        {error && (
          <div className="error-message mb-4">
            {error}
          </div>
        )}

        <div className="detail-container">
          <div className="detail-grid">
            <div>
              <h2 className="detail-section-title">{equipmentItem.name}</h2>
              <div className="detail-properties">
                <div className="detail-property">
                  <span className="property-label">Model Number:</span>
                  {editing ? (
                    <input
                      type="text"
                      name="model"
                      value={equipmentItem.model || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={loading}
                    />
                  ) : (
                    <span className="property-value">{equipmentItem.model}</span>
                  )}
                </div>
                
                <div className="detail-property">
                  <span className="property-label">Serial ID:</span>
                  {editing ? (
                    <input
                      type="text"
                      name="serial_id"
                      value={equipmentItem.serial_id || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={loading}
                    />
                  ) : (
                    <span className="property-value">{equipmentItem.serial_id}</span>
                  )}
                </div>
                
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
                
                <div className="detail-property">
                  <span className="property-label">Location:</span>
                  {editing ? (
                    <input
                      type="text"
                      name="location"
                      value={equipmentItem.location || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={loading}
                    />
                  ) : (
                    <span className="property-value">{equipmentItem.location}</span>
                  )}
                </div>
                
                <div className="detail-property">
                  <span className="property-label">Purchase Date:</span>
                  {editing ? (
                    <input
                      type="date"
                      name="purchase_date"
                      value={equipmentItem.purchase_date || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={loading}
                    />
                  ) : (
                    <span className="property-value">{formatDate(equipmentItem.purchase_date)}</span>
                  )}
                </div>
                
                <div className="detail-property">
                  <span className="property-label">Warranty Expiration:</span>
                  {editing ? (
                    <input
                      type="date"
                      name="warranty_expiration"
                      value={equipmentItem.warranty_expiration || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={loading}
                    />
                  ) : (
                    <span className="property-value">{formatDate(equipmentItem.warranty_expiration)}</span>
                  )}
                </div>
                
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
                
                <div className="detail-property">
                  <span className="property-label">Last Maintenance:</span>
                  <span className="property-value">{formatDate(equipmentItem.last_maintenance)}</span>
                </div>
                
                <div className="detail-property">
                  <span className="property-label">Next Maintenance:</span>
                  <span className="property-value">{formatDate(equipmentItem.next_maintenance)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="detail-section-title">Maintenance Log</h3>
              <div className="log-container">
                {equipmentItem.maintenance_log && equipmentItem.maintenance_log.map((log, index) => (
                  <div key={index} className="log-item">
                    <div className="log-header">
                      <div>
                        <p className="log-user">{log.action}</p>
                        <p className="log-location">{log.user_name}</p>
                      </div>
                      <p className="log-date">{formatDate(log.date)}</p>
                    </div>
                    {log.notes && <p className="text-xs text-gray-500 mt-1">{log.notes}</p>}
                  </div>
                ))}
                {(!equipmentItem.maintenance_log || equipmentItem.maintenance_log.length === 0) && (
                  <p className="no-data">No maintenance recorded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return selectedItem.type === 'chemical' ? renderChemicalDetails() : renderEquipmentDetails();
};

export default DetailView;