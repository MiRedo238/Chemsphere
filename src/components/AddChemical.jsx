import React, { useState } from 'react';
import { ChevronLeft, FlaskConical } from 'lucide-react';
import Autocomplete from './Autocomplete';
import { createChemical } from '../services/api';

const AddChemical = ({ 
  setCurrentView, 
  chemicals, 
  updateChemicals, 
  addAuditLog, 
  userRole, 
  isModal, 
  onClose, 
  loading 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    batch_number: '',
    brand: '',
    volume: '',
    initial_quantity: '',
    current_quantity: '',
    expiration_date: '',
    date_of_arrival: '',
    safety_class: 'safe',
    location: '',
    ghs_symbols: []
  });
  const [apiLoading, setApiLoading] = useState(false);
  const [error, setError] = useState('');

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

  // Get unique names, brands, and locations for autocomplete
  const chemicalNames = [...new Set(chemicals.map(c => c.name))].map(name => ({ name }));
  const chemicalBrands = [...new Set(chemicals.map(c => c.brand))].map(brand => ({ brand }));
  const chemicalLocations = [...new Set(chemicals.map(c => c.location))].map(location => ({ location }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setApiLoading(true);

    try {
      const newChemical = await createChemical({
        name: formData.name,
        batch_number: formData.batch_number,
        brand: formData.brand || null,
        volume: formData.volume || null,
        initial_quantity: parseInt(formData.initial_quantity) || 0,
        current_quantity: parseInt(formData.current_quantity) || parseInt(formData.initial_quantity) || 0,
        expiration_date: formData.expiration_date || null,
        date_of_arrival: formData.date_of_arrival || null,
        safety_class: formData.safety_class,
        location: formData.location || null,
        ghs_symbols: formData.ghs_symbols
      });

      if (updateChemicals) {
        updateChemicals(newChemical);
      }

      if (addAuditLog) {
        addAuditLog({
          type: 'chemical',
          action: 'add',
          itemName: newChemical.name,
          user: userRole,
          timestamp: new Date().toISOString(),
          details: {
            batchNumber: newChemical.batch_number,
            quantity: newChemical.initial_quantity
          }
        });
      }

      // Reset form
      setFormData({
        name: '',
        batch_number: '',
        brand: '',
        volume: '',
        initial_quantity: '',
        current_quantity: '',
        expiration_date: '',
        date_of_arrival: '',
        safety_class: 'safe',
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
      setError(error.message || 'Failed to add chemical. Please try again.');
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

          <div className="form-grid">
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
            <div className="form-group">
              <label className="form-label">Current Quantity</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={formData.current_quantity}
                onChange={(e) => setFormData({...formData, current_quantity: e.target.value})}
                placeholder="Same as initial"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Volume</label>
            <input
              type="text"
              className="form-input"
              value={formData.volume}
              onChange={(e) => setFormData({...formData, volume: e.target.value})}
              placeholder="e.g., 500mL, 1L"
            />
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
              <option value="safe">Safe</option>
              <option value="toxic">Toxic</option>
              <option value="corrosive">Corrosive</option>
              <option value="reactive">Reactive</option>
              <option value="flammable">Flammable</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">GHS Symbols</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {ghsOptions.map(option => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.ghs_symbols.includes(option.value)}
                    onChange={() => handleGhsChange(option.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <Autocomplete
              value={formData.location}
              onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
              suggestions={chemicalLocations}
              placeholder="Enter location"
              onSelect={(item) => handleAutocompleteSelect('location', item.location)}
              field="location"
            />
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