// src/components/AddLogEntry.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Save, X, User, Calendar, FlaskConical, Microscope, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { logChemicalUsage } from '../services/usageLogService';
import { createChemical, updateChemicalQuantity } from '../services/chemicalService'; 

// Constants
const CHEMICAL_TYPES = [
  { value: 'inventory', label: 'New Containers' },
  { value: 'open', label: 'Opened Containers' },
  { value: 'expired', label: 'Expired' }
];

// Helper functions
const getUserDisplayName = (user) => {
  if (!user) return '';
  
  const userName = user.user_metadata?.name || 
                  user.user_metadata?.full_name || 
                  user.user_metadata?.username;
  
  if (userName) return userName;
  
  if (user.email) {
    const emailUsername = user.email.split('@')[0];
    const formattedUsername = emailUsername
      .split(/[._]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
    
    return formattedUsername;
  }
  
  return '';
};

const getInitialFormData = () => ({
  userName: '',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  chemicals: [],
  equipment_ids: [],
  notes: '',
  location: ''
});

const AddLogEntry = ({ 
  onSave, 
  onCancel, 
  chemicals, 
  equipment, 
  userRole, 
  currentUser, 
  addAuditLog, 
  refreshData 
}) => {
  const [formData, setFormData] = useState(getInitialFormData);
  const [selectedChemicalType, setSelectedChemicalType] = useState('inventory');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user: authUser } = useAuth();

  // Initialize user name
  useEffect(() => {
    const userName = getUserDisplayName(authUser) || getUserDisplayName(currentUser) || '';
    setFormData(prev => ({ ...prev, userName }));
  }, [authUser, currentUser]);

  // Filter chemicals based on type and sort alphabetically
  const getFilteredChemicals = useCallback(() => {
    const now = new Date();
    
    let filteredChemicals;
    
    switch (selectedChemicalType) {
      case 'expired':
        filteredChemicals = chemicals.filter(chem => {
          if (!chem.expiration_date) return false;
          const expDate = new Date(chem.expiration_date);
          return expDate < now;
        });
        break;
      case 'open':
        filteredChemicals = chemicals.filter(chem => chem.opened === true && chem.current_quantity > 0);
        break;
      case 'inventory':
      default:
        filteredChemicals = chemicals.filter(chem => chem.current_quantity > 0);
        break;
    }

    // Sort chemicals alphabetically by name
    return filteredChemicals.sort((a, b) => a.name.localeCompare(b.name));
  }, [chemicals, selectedChemicalType]);

  // Event handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleChemicalAdd = (chemicalId) => {
    const chemical = chemicals.find(c => c.id === chemicalId);
    if (!chemical) return;

    const newChemical = {
      chemical_id: chemical.id,
      chemical_name: chemical.name,
      quantity: 1,
      unit: chemical.unit || '',
      opened: false,
      remaining_amount: null,
      remaining_location: ''
    };

    setFormData(prev => ({
      ...prev,
      chemicals: [...prev.chemicals, newChemical]
    }));
  };

  const handleChemicalRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      chemicals: prev.chemicals.filter((_, i) => i !== index)
    }));
  };

  const handleChemicalUpdate = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      chemicals: prev.chemicals.map((chem, i) => 
        i === index ? { ...chem, [field]: value } : chem
      )
    }));
  };

  const handleEquipmentAdd = (equipmentId) => {
    setFormData(prev => ({
      ...prev,
      equipment_ids: [...prev.equipment_ids, equipmentId]
    }));
  };

  const handleEquipmentRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      equipment_ids: prev.equipment_ids.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    if (!formData.userName.trim()) {
      setError('Please enter a user name');
      return false;
    }

    if (formData.chemicals.length === 0 && formData.equipment_ids.length === 0) {
      setError('Please add at least one chemical or equipment');
      return false;
    }

    // Validate that if container is opened, remaining location is provided
    for (const chem of formData.chemicals) {
      if (chem.opened && (!chem.remaining_amount || chem.remaining_amount <= 0)) {
        setError('Please enter a valid remaining amount when container is opened');
        return false;
      }
      if (chem.opened && !chem.remaining_location?.trim()) {
        setError('Please enter storage location for opened containers');
        return false;
      }
    }

    return true;
  };

  // Function to create new chemical entry for opened containers
  const createOpenedChemicalEntry = async (originalChemical, chemUsage) => {
    try {
      const newChemicalData = {
        name: `${originalChemical.name} (Opened)`,
        batch_number: `${originalChemical.batch_number}`,
        brand: originalChemical.brand,
        initial_quantity: 1,
        current_quantity: 1,
        expiration_date: originalChemical.expiration_date,
        date_of_arrival: new Date().toISOString().split('T')[0],
        location: chemUsage.opened ? chemUsage.remaining_location : null,
        ghs_symbols: originalChemical.ghs_symbols,
        safety_class: originalChemical.safety_class,
        physical_state: originalChemical.physical_state,
        unit: chemUsage.unit || originalChemical.unit,
        opened: true,
        remaining_amount: parseFloat(chemUsage.remaining_amount),
        parent_chemical_id: originalChemical.id
      };

      const newChemical = await createChemical(newChemicalData);
      
      // Add audit log for new chemical creation
      if (addAuditLog) {
        addAuditLog({
          type: 'chemical',
          action: 'add',
          item_name: newChemicalData.name,
          user_role: userRole,
          user_name: formData.userName,
          details: `Created from opened container of ${originalChemical.name}`
        });
      }

      return newChemical;
    } catch (error) {
      console.error('Error creating opened chemical entry:', error);
      throw new Error('Failed to create opened chemical entry');
    }
  };

  const prepareUsageData = () => {
    const dateTime = new Date(`${formData.date}T${formData.time}`);
    
    return {
        user_id: authUser?.id || null,
        user_name: formData.userName,
        date: dateTime.toISOString(),
        notes: formData.notes || null,
        location: formData.location || null,
        equipment_ids: formData.equipment_ids,
        chemical_usages: formData.chemicals.map(chemUsage => ({
        chemical_id: chemUsage.chemical_id,
        quantity: parseInt(chemUsage.quantity),
        unit: chemUsage.unit || '',
        opened: chemUsage.opened || false,
        remaining_amount: chemUsage.opened && chemUsage.remaining_amount ? 
            parseFloat(chemUsage.remaining_amount) : null
        }))
    };
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (!validateForm()) return;

      try {
        setLoading(true);
        setError('');

        const usageData = prepareUsageData();
        console.log('Sending usage data:', usageData);
        
        // First, update quantities for used chemicals
        const updatePromises = formData.chemicals.map(async (chemUsage) => {
          await updateChemicalQuantity(chemUsage.chemical_id, chemUsage.quantity);
        });
        
        await Promise.all(updatePromises);
        
        // Then, create new chemical entries for opened containers
        const openedChemicalPromises = formData.chemicals
          .filter(chem => chem.opened && chem.remaining_amount > 0)
          .map(async (chemUsage) => {
            const originalChemical = chemicals.find(c => c.id === chemUsage.chemical_id);
            if (originalChemical) {
              return await createOpenedChemicalEntry(originalChemical, chemUsage);
            }
            return null;
          });

        await Promise.all(openedChemicalPromises);
        
        // Then log the usage
        await logChemicalUsage(usageData);
        await refreshData();

        // Add audit log for log entry creation
        if (addAuditLog) {
          addAuditLog({
            type: 'log',
            action: 'add',
            item_name: 'Usage Log Entry',
            user_role: userRole,
            user_name: formData.userName,
            details: `Created log entry with ${formData.chemicals.length} chemicals and ${formData.equipment_ids.length} equipment`
          });
        }

        const dateTime = new Date(`${formData.date}T${formData.time}`);
        const newLog = {
          user_name: formData.userName,
          date: dateTime.toISOString(),
          chemicals: formData.chemicals,
          equipment: equipment.filter(eq => formData.equipment_ids.includes(eq.id)),
          notes: formData.notes,
          location: formData.location
        };

        onSave(newLog);
      } catch (error) {
        console.error('Error creating log entry:', error);
        setError('Failed to create log entry. Please try again.');
      } finally {
        setLoading(false);
      }
    };

  // Render chemical form
  const renderChemicalForm = (chemUsage, index) => {
    const chemical = chemicals.find(c => c.id === chemUsage.chemical_id);
    
    return (
      <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold">{chemical?.name}</h4>
          <button
            type="button"
            onClick={() => handleChemicalRemove(index)}
            className="text-red-600 hover:text-red-800"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="form-label">Quantity</label>
            <input
              type="number"
              min="1"
              max={chemical?.current_quantity}
              value={chemUsage.quantity}
              onChange={(e) => handleChemicalUpdate(index, 'quantity', e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label">Unit</label>
            <input
              type="text"
              value={chemUsage.unit}
              onChange={(e) => handleChemicalUpdate(index, 'unit', e.target.value)}
              className="form-input"
              placeholder="mL, g, etc."
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={chemUsage.opened || false}
              onChange={(e) => handleChemicalUpdate(index, 'opened', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Container opened</span>
          </label>

          {chemUsage.opened && (
            <>
              <div>
                <label className="form-label">Remaining Amount</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={chemUsage.remaining_amount || ''}
                  onChange={(e) => handleChemicalUpdate(index, 'remaining_amount', e.target.value)}
                  className="form-input"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="form-label">Storage Location</label>
                <input
                  type="text"
                  value={chemUsage.remaining_location || ''}
                  onChange={(e) => handleChemicalUpdate(index, 'remaining_location', e.target.value)}
                  className="form-input"
                  placeholder="Where is the remaining chemical stored?"
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Get selected equipment objects for display
  const getSelectedEquipment = () => {
    return equipment.filter(eq => formData.equipment_ids.includes(eq.id));
  };

  const filteredChemicals = getFilteredChemicals();
  const selectedEquipment = getSelectedEquipment();

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Basic Information */}
        <BasicInfoSection formData={formData} onInputChange={handleInputChange} />

        {/* Chemicals Section */}
        <ChemicalsSection
          selectedChemicalType={selectedChemicalType}
          onChemicalTypeChange={setSelectedChemicalType}
          filteredChemicals={filteredChemicals}
          onChemicalAdd={handleChemicalAdd}
          chemicals={formData.chemicals}
          renderChemicalForm={renderChemicalForm}
        />

        {/* Equipment Section */}
        <EquipmentSection
          equipment={equipment}
          selectedEquipment={selectedEquipment}
          onEquipmentAdd={handleEquipmentAdd}
          onEquipmentRemove={handleEquipmentRemove}
        />

        {/* Notes */}
        <NotesSection formData={formData} onInputChange={handleInputChange} />

        {/* Action Buttons */}
        <ActionButtons loading={loading} onCancel={onCancel} />
      </form>
    </div>
  );
};

// Sub-components for better organization
const BasicInfoSection = ({ formData, onInputChange }) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <h3 className="font-semibold mb-4">Basic Information</h3>
    <div className="grid grid-cols-2 gap-4">
      <FormField
        label="User"
        icon={User}
        name="userName"
        value={formData.userName}
        onChange={onInputChange}
        type="text"
        required
      />
      <FormField
        label="Date"
        icon={Calendar}
        name="date"
        value={formData.date}
        onChange={onInputChange}
        type="date"
        required
      />
      <FormField
        label="Time"
        name="time"
        value={formData.time}
        onChange={onInputChange}
        type="time"
        required
      />
      <FormField
        label="Location"
        icon={MapPin}
        name="location"
        value={formData.location}
        onChange={onInputChange}
        type="text"
        placeholder="Where was this work done?"
      />
    </div>
  </div>
);

const ChemicalsSection = ({
  selectedChemicalType,
  onChemicalTypeChange,
  filteredChemicals,
  onChemicalAdd,
  chemicals,
  renderChemicalForm
}) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold flex items-center">
        <FlaskConical size={16} className="mr-2" />
        Chemicals Used
      </h3>
      
      <ChemicalTypeFilter
        selectedType={selectedChemicalType}
        onTypeChange={onChemicalTypeChange}
      />
    </div>

    <ChemicalSelector
      chemicals={filteredChemicals}
      onChemicalAdd={onChemicalAdd}
    />

    {chemicals.map((chemUsage, index) => renderChemicalForm(chemUsage, index))}
  </div>
);

const ChemicalTypeFilter = ({ selectedType, onTypeChange }) => (
  <div className="flex space-x-2">
    {CHEMICAL_TYPES.map(type => (
      <label key={type.value} className="flex items-center">
        <input
          type="radio"
          value={type.value}
          checked={selectedType === type.value}
          onChange={(e) => onTypeChange(e.target.value)}
          className="mr-1"
        />
        <span className="text-sm">{type.label}</span>
      </label>
    ))}
  </div>
);

const ChemicalSelector = ({ chemicals, onChemicalAdd }) => (
  <div className="mb-4">
    <select
      onChange={(e) => {
        if (e.target.value) {
          onChemicalAdd(e.target.value);
          e.target.value = '';
        }
      }}
      className="form-select"
    >
      <option value="">Select chemical to add...</option>
      {chemicals.map(chem => (
        <option key={chem.id} value={chem.id}>
          {chem.name} - {chem.batch_number} ({chem.current_quantity} available)
        </option>
      ))}
    </select>
  </div>
);

const EquipmentSection = ({
  equipment,
  selectedEquipment,
  onEquipmentAdd,
  onEquipmentRemove
}) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <h3 className="font-semibold mb-4 flex items-center">
      <Microscope size={16} className="mr-2" />
      Equipment Used
    </h3>

    <EquipmentSelector
      equipment={equipment}
      onEquipmentAdd={onEquipmentAdd}
    />

    {selectedEquipment.map((eq, index) => (
      <EquipmentItem
        key={eq.id}
        equipment={eq}
        onRemove={() => onEquipmentRemove(index)}
      />
    ))}
  </div>
);

const EquipmentSelector = ({ equipment, onEquipmentAdd }) => (
  <div className="mb-4">
    <select
      onChange={(e) => {
        if (e.target.value) {
          onEquipmentAdd(e.target.value);
          e.target.value = '';
        }
      }}
      className="form-select"
    >
      <option value="">Select equipment to add...</option>
      {equipment.filter(eq => eq.status === 'Available').map(eq => (
        <option key={eq.id} value={eq.id}>
          {eq.name} - {eq.serial_id}
        </option>
      ))}
    </select>
  </div>
);

const EquipmentItem = ({ equipment, onRemove }) => (
  <div className="bg-white p-3 rounded border mb-2 flex justify-between items-center">
    <div>
      <p className="font-medium">{equipment.name}</p>
      {equipment.serial_id && (
        <p className="text-sm text-gray-600">Serial: {equipment.serial_id}</p>
      )}
      {equipment.location && (
        <p className="text-sm text-gray-600">Location: {equipment.location}</p>
      )}
    </div>
    <button
      type="button"
      onClick={onRemove}
      className="text-red-600 hover:text-red-800"
    >
      <X size={16} />
    </button>
  </div>
);

const NotesSection = ({ formData, onInputChange }) => (
  <div className="form-group">
    <label className="form-label">Notes</label>
    <textarea
      name="notes"
      value={formData.notes}
      onChange={onInputChange}
      className="form-input h-24"
      placeholder="Additional notes about this usage..."
    />
  </div>
);

const ActionButtons = ({ loading, onCancel }) => (
  <div className="flex justify-end space-x-3 pt-4 border-t">
    <button
      type="button"
      onClick={onCancel}
      className="form-button bg-gray-500"
      disabled={loading}
    >
      <X size={16} className="mr-1" />
      Cancel
    </button>
    <button
      type="submit"
      className="form-button"
      disabled={loading}
    >
      <Save size={16} className="mr-1" />
      {loading ? 'Saving...' : 'Save Log Entry'}
    </button>
  </div>
);

const FormField = ({ label, icon: Icon, ...props }) => (
  <div className="form-group">
    <label className="form-label">
      {Icon && <Icon size={16} className="mr-1" />}
      {label}
    </label>
    <input
      className="form-input"
      {...props}
    />
  </div>
);

export default AddLogEntry;