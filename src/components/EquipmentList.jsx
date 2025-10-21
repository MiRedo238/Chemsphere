// src/components/EquipmentList.jsx
import React, { useState, useContext } from 'react';
import { Search, Plus, Eye, Download, Upload } from 'lucide-react';
import { statusColors } from '../utils/data';
import { filterEquipment, sortItems, exportToCSV, getEquipmentSortOptions } from '../utils/helpers';
import AddEquipment from './AddEquipment';
import Modal from './Modal';
import { importEquipment } from '../services/api';
import { DatabaseContext } from '../contexts/DatabaseContext';


const EquipmentList = ({ setSelectedItem, setCurrentView, userRole, addAuditLog }) => {
  const { equipment, setEquipment } = useContext(DatabaseContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addAuditLog } = useContext(DatabaseContext);

  const isAdmin = userRole === 'admin';

  // Filter and sort equipment
  const filteredEquipment = filterEquipment(equipment, searchTerm, statusFilter, sortField, sortDirection);
  const sortedEquipment = sortItems(filteredEquipment, sortField, sortDirection);

  // Handle search with autocomplete
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length > 2) {
      const suggestions = equipment.filter(eq => 
        eq.name.toLowerCase().includes(value.toLowerCase()) ||
        eq.serial_id.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      
      setAutocompleteSuggestions(suggestions);
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  };

  // Select from autocomplete
  const selectAutocomplete = (item) => {
    setSearchTerm(item.name);
    setAutocompleteSuggestions([]);
    setShowAutocomplete(false);
  };

  // Handle export
  const handleExport = () => {
    exportToCSV(equipment, 'equipment_inventory');
    addAuditLog({
      type: 'equipment',
      action: 'export',
      itemName: 'All Equipment',
      user: userRole,
      timestamp: new Date().toISOString(),
      details: { count: equipment.length }
    });
  };

  // Handle import
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setLoading(true);
      setError('');
      
      const importedData = await importEquipment(file);
      
      // Update local state
      updateEquipment([...equipment, ...importedData]);
      
      addAuditLog({
        type: 'equipment',
        action: 'import',
        itemName: `${importedData.length} items`,
        user: userRole,
        timestamp: new Date().toISOString(),
        details: { count: importedData.length }
      });
      
      // Clear file input
      e.target.value = '';
      
    } catch (error) {
      console.error('Failed to import equipment:', error);
      setError('Failed to import equipment. Please check the file format.');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding new equipment
  const handleAddEquipment = (newEquipment) => {
    updateEquipment([...equipment, newEquipment]);
    addAuditLog({
      type: 'equipment',
      action: 'add',
      itemName: newEquipment.name,
      user: userRole,
      timestamp: new Date().toISOString(),
      details: { serialId: newEquipment.serial_id }
    });
    setShowAddModal(false);
  };

  return (
    <div>
      <div className="list-header">
        <h1 className="list-title">Equipment</h1>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="add-button"
            disabled={loading}
          >
            <Plus className="add-button-icon" />
            {loading ? 'Loading...' : 'Add Equipment'}
          </button>
        )}
      </div>
      
      {error && (
        <div className="error-message mb-4">
          {error}
        </div>
      )}

      {/* Add Equipment Modal */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        title="Add New Equipment"
      >
        <AddEquipment 
          setCurrentView={setCurrentView}
          equipment={equipment}
          updateEquipment={handleAddEquipment}
          addAuditLog={addAuditLog}
          userRole={userRole}
          isModal={true}
          onClose={() => setShowAddModal(false)}
        />
      </Modal>

      <div className="list-container">
        <div className="search-filter">
          <div className="autocomplete-container">
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search equipment..."
                className="search-input"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => searchTerm.length > 2 && setShowAutocomplete(true)}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                disabled={loading}
              />
            </div>
            {showAutocomplete && autocompleteSuggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {autocompleteSuggestions.map(eq => (
                  <div 
                    key={eq.id} 
                    className="autocomplete-item"
                    onClick={() => selectAutocomplete(eq)}
                  >
                    {eq.name} - {eq.serial_id}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <select 
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={loading}
          >
            <option value="all">All Status</option>
            <option value="Available">Available</option>
            <option value="Broken">Broken</option>
            <option value="Under Maintenance">Under Maintenance</option>
          </select>
          
          <select 
            className="filter-select"
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            disabled={loading}
          >
            {getEquipmentSortOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <button 
            className="filter-select"
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            disabled={loading}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
          
          <div className="import-export">
            <label htmlFor="import-equipment" className={`import-button ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="import-export-icon" />
              <input
                id="import-equipment"
                type="file"
                accept=".csv"
                onChange={handleImport}
                style={{ display: 'none' }}
                disabled={loading}
              />
            </label>
            <button 
              className="export-button" 
              onClick={handleExport}
              disabled={loading}
            >
              <Download className="import-export-icon" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {sortedEquipment.map(eq => (
            <div key={eq.id} className="list-item">
              <div className="item-details">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="item-name">{eq.name}</h3>
                    <p className="item-meta">{eq.serial_id} • {eq.model}</p>
                  </div>
                  <div className="item-status">
                    <span className={`status-badge ${statusColors[eq.status]}`}>
                      {eq.status}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedItem({...eq, type: 'equipment'});
                  setCurrentView('detail');
                }}
                className="view-button"
                disabled={loading}
              >
                <Eye className="view-icon" />
              </button>
            </div>
          ))}
          
          {sortedEquipment.length === 0 && (
            <p className="no-data">No equipment found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentList;