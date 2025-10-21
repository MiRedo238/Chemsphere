// src/components/ChemicalsList.jsx
import React, { useState } from 'react';
import { Search, Plus, Eye, Download, Upload } from 'lucide-react';
import { safetyColors, ghsSymbols } from '../utils/data';
import { filterChemicals, sortItems, exportToCSV, importFromCSV, normalizeGhsSymbols, getChemicalSortOptions } from '../utils/helpers';
import { createChemical, importChemicals } from '../services/api';
import AddChemical from './AddChemical';
import Modal from './Modal';

const ChemicalsList = ({ chemicals, setSelectedItem, setCurrentView, userRole, updateChemicals, addAuditLog, refreshData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = userRole === 'admin';

  // Filter and sort chemicals
  const filteredChemicals = filterChemicals(chemicals, searchTerm, filterClass, sortField, sortDirection);
  const sortedChemicals = sortItems(filteredChemicals, sortField, sortDirection);

  // Handle search with autocomplete
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length > 2) {
      const suggestions = chemicals.filter(chem => 
        (chem.name || '').toLowerCase().includes(value.toLowerCase()) ||
        (chem.batch_number || '').toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      
      setAutocompleteSuggestions(suggestions);
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  };

  // Select from autocomplete
  const selectAutocomplete = (chemical) => {
    setSearchTerm(chemical.name);
    setAutocompleteSuggestions([]);
    setShowAutocomplete(false);
  };

  // Handle export
  const handleExport = () => {
    exportToCSV(chemicals, 'chemicals_inventory');
    addAuditLog({
      type: 'chemical',
      action: 'export',
      itemName: 'All Chemicals',
      user: userRole,
      timestamp: new Date().toISOString(),
      details: { count: chemicals.length }
    });
  };

  // Handle import
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setLoading(true);
        const result = await importChemicals(file);
        await refreshData();
        addAuditLog({
          type: 'chemical',
          action: 'import',
          itemName: `${result.imported} items`,
          user: userRole,
          timestamp: new Date().toISOString(),
          details: { count: result.imported }
        });
      } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import chemicals');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle adding a new chemical
  const handleAddChemical = async (createdChemical) => {
    try {
      updateChemicals([...chemicals, createdChemical]);

      addAuditLog({
        type: 'chemical',
        action: 'add',
        itemName: createdChemical.name,
        user: userRole,
        timestamp: new Date().toISOString(),
        details: {
          batchNumber: createdChemical.batch_number,
          quantity: createdChemical.initial_quantity
        }
      });
      alert('Chemical added successfully');
    } catch (error) {
      console.error('Failed to process added chemical:', error);
      alert('Failed to add chemical');
    }
  };

  return (
    <>
      <div className="list-header">
        <h1 className="list-title">Chemicals</h1>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="add-button"
            disabled={loading}
          >
            <Plus className="add-button-icon" />
            {loading ? 'Adding...' : 'Add Chemical'}
          </button>
        )}
      </div>
      
      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        title="Add New Chemical"
      >
        <AddChemical 
          setCurrentView={setCurrentView}
          chemicals={chemicals}
          updateChemicals={handleAddChemical}
          addAuditLog={addAuditLog}
          userRole={userRole}
          isModal={true}
          onClose={() => setShowAddModal(false)}
          loading={loading}
        />
      </Modal>

      <div className="list-container">
        <div className="search-filter">
          <div className="autocomplete-container">
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search chemicals..."
                className="search-input"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => searchTerm.length > 2 && setShowAutocomplete(true)}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
              />
            </div>
            {showAutocomplete && autocompleteSuggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {autocompleteSuggestions.map(chem => (
                  <div 
                    key={chem.id} 
                    className="autocomplete-item"
                    onClick={() => selectAutocomplete(chem)}
                  >
                    {chem.name} - {chem.batch_number}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <select 
            className="filter-select"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="all">All Classes</option>
            <option value="safe">Safe</option>
            <option value="toxic">Toxic</option>
            <option value="corrosive">Corrosive</option>
            <option value="reactive">Reactive</option>
            <option value="flammable">Flammable</option>
          </select>
          
          <select 
            className="filter-select"
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
          >
            {getChemicalSortOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <button 
            className="filter-select"
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
          
          <div className="import-export">
            <label htmlFor="import-chemicals" className="import-button">
              <Upload className="import-export-icon" />
              <input
                id="import-chemicals"
                type="file"
                accept=".csv"
                onChange={handleImport}
                style={{ display: 'none' }}
                disabled={loading}
              />
            </label>
            <button className="export-button" onClick={handleExport} disabled={loading}>
              <Download className="import-export-icon" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {sortedChemicals.map(chemical => (
            <div key={chemical.id} className="list-item">
              <div className={`safety-indicator ${safetyColors[chemical.safety_class]}`}></div>
              <div className="item-details">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="item-name">{chemical.name}</h3>
                    <p className="item-meta">{chemical.batch_number} • {chemical.brand}</p>
                    <div className="ghs-symbols">
                      {normalizeGhsSymbols(chemical.ghs_symbols).map(symbol => {
                        const imgSrc = ghsSymbols[symbol];
                        if (!imgSrc) {
                          console.warn(`GHS symbol not found: ${symbol}`);
                          return null; // or return a fallback
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
                  <div className="text-right">
                    <p className="item-meta">EXP: {chemical.expiration_date}</p>
                    <p className="item-meta">
                      Qty: {chemical.current_quantity}/{chemical.initial_quantity}
                    </p>
                    <p className="item-meta">{chemical.location}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedItem({...chemical, type: 'chemical'});
                  setCurrentView('detail');
                }}
                className="view-button"
                disabled={loading}
              >
                <Eye className="view-icon" />
              </button>
            </div>
          ))}
          
          {sortedChemicals.length === 0 && (
            <p className="no-data">No chemicals found</p>
          )}
        </div>
      </div>
    </>
  );
};

export default ChemicalsList;