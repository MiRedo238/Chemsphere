import React, { useState, useContext } from 'react';
import { ChevronLeft, FlaskConical } from 'lucide-react';
import Autocomplete from './Autocomplete';
import { DatabaseContext } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';

const AddChemical = ({ 
  setCurrentView, 
  userRole, 
  isModal, 
  onClose, 
  loading 
}) => {
  const { chemicals, createChemical, addAuditLog } = useContext(DatabaseContext);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    batch_number: '',
    brand: '',
    physical_state: '',
    unit_value: '',
    unit_measure: 'Unit',
    initial_quantity: '',
    current_quantity: '',
    expiration_date: '',
    date_of_arrival: '',
    safety_class: '',
    location: '',
    ghs_symbols: []
  });
  const [apiLoading, setApiLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const ghsOptions = [
    { value: 'explosive', label: 'Explosive' },
    { value: 'flammable', label: 'Flammable' },
    { value: 'oxidizing', label: 'Oxidizing' },
    { value: 'corrosive', label: 'Corrosive' },
    { value: 'toxic', label: 'Toxic' },
    { value: 'harmful', label: 'Harmful' },
    { value: 'health-hazard', label: 'Health Hazard' },
    { value: 'environmental-hazard', label: 'Environmental Hazard' }
  ];

  // Unit options based on physical state
  const liquidUnits = [
    { value: 'mL', label: 'mL' },
    { value: 'L', label: 'L' },
    { value: 'μL', label: 'μL' },
    { value: 'gal', label: 'gal' }
  ];

  const solidUnits = [
    { value: 'g', label: 'g' },
    { value: 'kg', label: 'kg' },
    { value: 'mg', label: 'mg' },
    { value: 'lb', label: 'lb' },
    { value: 'oz', label: 'oz' }
  ];

  // Get unique names, brands, and locations for autocomplete
  const chemicalNames = [...new Set(chemicals.map(c => c.name))].map(name => ({ name }));
  const chemicalBrands = [...new Set(chemicals.map(c => c.brand))].map(brand => ({ brand }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // Clear previous field errors and validate fields that use default placeholders
    setFieldErrors({});

    const errs = {};
    if (!formData.physical_state) {
      errs.physical_state = 'Select physical state';
      errs.unit_value = 'Required';
      errs.unit_measure = 'Required';
    } else {
      if (!formData.unit_value || String(formData.unit_value).trim() === '') {
        errs.unit_value = 'Required';
      }
      if (!formData.unit_measure || formData.unit_measure === 'Unit') {
        errs.unit_measure = 'Required';
      }
    }

    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setApiLoading(true);

    if (userRole !== 'admin') {
      setApiLoading(false);
      setError('Only admins can add chemicals.');
      return;
    }

    try {
      // Combine unit_value and unit_measure for the database
      const combinedUnit = formData.unit_value ? `${formData.unit_value}${formData.unit_measure}` : null;

      const newChemical = await createChemical({
        name: formData.name,
        batch_number: formData.batch_number,
        brand: formData.brand || null,
        physical_state: formData.physical_state,
        unit: combinedUnit,
        initial_quantity: parseInt(formData.initial_quantity) || 0,
        current_quantity: parseInt(formData.current_quantity) || parseInt(formData.initial_quantity) || 0,
        expiration_date: formData.expiration_date || null,
        date_of_arrival: formData.date_of_arrival || null,
        safety_class: formData.safety_class,
        location: formData.location || null,
        ghs_symbols: formData.ghs_symbols
      });

      // optimistic flow: createChemical already updates cache

      if (addAuditLog) {
        addAuditLog({
          type: 'chemical',
          action: 'add',
          item_name: newChemical.name, 
          user_role: userRole,         
          user_name: user?.user_metadata?.name || 'System',
          details: {
            batchNumber: newChemical.batch_number,
            quantity: newChemical.initial_quantity,
            location: newChemical.location,
          }
        });
      }

      // Reset form to empty values
      setFormData({
        name: '',
        batch_number: '',
        brand: '',
        physical_state: '',
        unit_value: '',
        unit_measure: '',
        initial_quantity: '',
        current_quantity: '',
        expiration_date: '',
        date_of_arrival: '',
        safety_class: '',
        location: '',
        ghs_symbols: []
      });

      if (isModal && onClose) {
        onClose();
      } else if (!isModal) {
        setCurrentView('chemicals');
      }
    } catch (error) {
      console.error('Failed to add chemical:', error);
      const message = error?.message || error?.error || (typeof error === 'string' ? error : null) || JSON.stringify(error);
      setError(message || 'Failed to add chemical. Please try again.');
    } finally {
      setApiLoading(false);
    }
  };

  const handleGhsChange = (symbol) => {
    setFormData(prev => ({
      ...prev,
      ghs_symbols: prev.ghs_symbols.includes(symbol)
        ? prev.ghs_symbols.filter(s => s !== symbol)
        : [...prev.ghs_symbols, symbol]
    }));
  };

  const handleAutocompleteSelect = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhysicalStateChange = (state) => {
    setFormData(prev => ({ 
      ...prev, 
      physical_state: state,
      unit_measure: 'Unit',
      unit_value: '' // Clear unit value when state changes
    }));
  };

  // Get current unit options based on physical state
  const currentUnitOptions = formData.physical_state === 'liquid' ? liquidUnits : solidUnits;

  return (
    <div>
      {!isModal && (
        <div className="detail-header">
          <button 
            onClick={() => setCurrentView('chemicals')}
            className="back-button"
          >
            <ChevronLeft className="back-icon" />
          </button>
          <h1 className="detail-title">
            <FlaskConical className="inline mr-2" />
            Add Chemical
          </h1>
        </div>
      )}
      
      <div className="form-container">
        {error && (
          <div className="error-message mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Name</label>
            <Autocomplete
              value={formData.name}
              onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
              suggestions={chemicalNames}
              placeholder="Enter chemical name"
              onSelect={(item) => handleAutocompleteSelect('name', item.name)}
              field="name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Batch Number</label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.batch_number}
              onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Brand</label>
            <Autocomplete
              value={formData.brand}
              onChange={(value) => setFormData(prev => ({ ...prev, brand: value }))}
              suggestions={chemicalBrands}
              placeholder="Enter brand name"
              onSelect={(item) => handleAutocompleteSelect('brand', item.brand)}
              field="brand"
            />
          </div>

          {/* Physical State Radio Buttons */}
          <div className="form-group">
            <label className="form-label">Physical State</label>
            <div className="physical-state-options">
              <label className={`physical-state-option ${formData.physical_state === 'liquid' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="physical_state"
                  value="liquid"
                  checked={formData.physical_state === 'liquid'}
                  onChange={(e) => handlePhysicalStateChange(e.target.value)}
                  className="physical-state-radio"
                />
                <span className="physical-state-label">Liquid</span>
              </label>
              <label className={`physical-state-option ${formData.physical_state === 'solid' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="physical_state"
                  value="solid"
                  checked={formData.physical_state === 'solid'}
                  onChange={(e) => handlePhysicalStateChange(e.target.value)}
                  className="physical-state-radio"
                />
                <span className="physical-state-label">Solid</span>
              </label>
            </div>
            {fieldErrors.physical_state && (
              <div style={{ color: '#d9534f', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {fieldErrors.physical_state}
              </div>
            )}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" aria-hidden="true">&nbsp;</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  className="form-input flex-1"
                  value={formData.unit_value}
                  onChange={(e) => setFormData({...formData, unit_value: e.target.value})}
                  placeholder={
                    formData.physical_state === ''
                      ? 'Select physical state'
                      : formData.physical_state === 'liquid'
                        ? 'Volume'
                        : 'Weight'
                  }
                  aria-label="amount"
                  aria-invalid={!!fieldErrors.unit_value}
                />
                <select
                  className="form-select w-24"
                  value={formData.unit_measure}
                  onChange={(e) => setFormData({...formData, unit_measure: e.target.value})}
                  aria-invalid={!!fieldErrors.unit_measure}
                >
                  <option value="Unit">Unit</option>
                  {currentUnitOptions.map(unit => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
              {fieldErrors.unit_value && (
                <div style={{ color: '#d9534f', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {fieldErrors.unit_value}
                </div>
              )}
              {fieldErrors.unit_measure && (
                <div style={{ color: '#d9534f', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {fieldErrors.unit_measure}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Initial Quantity</label>
              <input
                type="number"
                required
                min="1"
                className="form-input"
                value={formData.initial_quantity}
                onChange={(e) => setFormData({...formData, initial_quantity: e.target.value})}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Date of Arrival</label>
              <input
                type="date"
                required
                className="form-input"
                value={formData.date_of_arrival}
                onChange={(e) => setFormData({...formData, date_of_arrival: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Expiration Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={formData.expiration_date}
                onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Safety Class</label>
            <select
              className="form-select"
              value={formData.safety_class}
              onChange={(e) => setFormData({...formData, safety_class: e.target.value})}
            >
              <option value="moderate-hazard">Moderate Hazard</option>
              <option value="toxic">Toxic</option>
              <option value="corrosive">Corrosive</option>
              <option value="reactive">Reactive</option>
              <option value="flammable">Flammable</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">GHS Symbols</label>
            <div className="ghs-symbols-grid">
              {ghsOptions.map(option => (
                <label key={option.value} className="ghs-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.ghs_symbols.includes(option.value)}
                    onChange={() => handleGhsChange(option.value)}
                    className="ghs-checkbox"
                  />
                  <span className="ghs-checkbox-text">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <div className="radio-grid">
              {[
                { value: 'flammable', label: 'flammable', cls: 'flammable' },
                { value: 'health-hazard', label: 'Health Hazard', cls: 'health' },
                { value: 'reactive-oxidizing', label: 'reactive and oxidizing', cls: 'reactive' },
                { value: 'corrosive', label: 'corrosive', cls: 'corrosive' },
                { value: 'moderate-hazard', label: 'general/moderate hazard', cls: 'moderate' }
              ].map(opt => (
                <label key={opt.value} className={`radio-option ${opt.cls}`}>
                  <input
                    type="radio"
                    name="location"
                    value={opt.value}
                    checked={formData.location === opt.value}
                    onChange={() => setFormData(prev => ({ ...prev, location: opt.value }))}
                  />
                  <span className={`radio-color ${opt.cls}`} aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="radio-check" aria-hidden="true" focusable="false">
                      <path d="M4.5 12.5l4 4 11-11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="radio-label-text">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              className="form-button"
              disabled={apiLoading || loading}
            >
              {apiLoading ? 'Adding...' : 'Add Chemical'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddChemical;