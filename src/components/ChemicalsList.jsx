// src/components/ChemicalsList.jsx
import React, { useState, useContext } from 'react';
import { Search, Plus, Download, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import { safetyColors, ghsSymbols } from '../utils/data';
import { filterChemicals, sortItems, exportToCSV, normalizeGhsSymbols, getChemicalSortOptions } from '../utils/helpers';
import { importChemicals } from '../services/api';
import AddChemical from './AddChemical';
import Modal from './Modal';
import { DatabaseContext } from '../contexts/DatabaseContext';

const ChemicalsList = ({ setSelectedItem, setCurrentView, userRole, refreshData }) => {
  const { chemicals, setChemicals, addAuditLog } = useContext(DatabaseContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = userRole === 'admin';

  // Filter out expired chemicals from the main inventory
  const nonExpiredChemicals = chemicals.filter(chemical => {
    if (!chemical.expiration_date) return true; // If no expiration date, consider it not expired
    
    try {
      const expirationDate = new Date(chemical.expiration_date);
      const today = new Date();
      if (isNaN(expirationDate.getTime())) return true;
      // Set both dates to start of day for accurate comparison
      today.setHours(0, 0, 0, 0);
      expirationDate.setHours(0, 0, 0, 0);
      return expirationDate >= today;
    } catch (error) {
      console.error('Invalid expiration date:', chemical.expiration_date, error);
      return true; // If date parsing fails, show the chemical
    }
  });

  // Filter and sort non-expired chemicals
  const filteredChemicals = filterChemicals(nonExpiredChemicals, searchTerm, filterClass, sortField, sortDirection);
  const sortedChemicals = sortItems(filteredChemicals, sortField, sortDirection);

  // Separate out-of-stock chemicals and sort them separately
  const outOfStockChemicals = sortedChemicals.filter(chem => chem.current_quantity === 0);
  const inStockChemicals = sortedChemicals.filter(chem => chem.current_quantity > 0);
  
  // Sort out-of-stock chemicals by the same criteria
  const sortedOutOfStock = sortItems(outOfStockChemicals, sortField, sortDirection);
  
  // Combine: out-of-stock first, then in-stock
  const finalSortedChemicals = [...sortedOutOfStock, ...inStockChemicals];

  // Handle search with autocomplete (only on non-expired chemicals)
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length > 2) {
      const suggestions = nonExpiredChemicals.filter(chem => 
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

  // Handle export (only non-expired chemicals)
  const handleExport = () => {
    exportToCSV(nonExpiredChemicals, 'active_chemicals_inventory');
    addAuditLog({
      type: 'chemical',
      action: 'export',
      itemName: 'Active Chemicals',
      user: userRole,
      timestamp: new Date().toISOString(),
      details: { count: nonExpiredChemicals.length }
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
      setChemicals([...chemicals, createdChemical]);
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

  // Handle card click
  const handleCardClick = (chemical) => {
    if (!loading) {
      setSelectedItem({...chemical, type: 'chemical'});
      setCurrentView('detail');
    }
  };

  return (
    <>
      <div className="list-header">
        <div>
          <h1 className="list-title">Chemical Inventory</h1>
          <p className="text-sm text-gray-600 mt-1">
            Total Number of Chemicals: {nonExpiredChemicals.length} 
            {outOfStockChemicals.length > 0 && (
              <span className="text-red-600 font-semibold ml-2">
                • Out of Stock: {outOfStockChemicals.length}
              </span>
            )}
          </p>
        </div>
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
        {/* Search Bar - Full Width */}
        <div className="search-row">
          <div className="autocomplete-container">
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search active chemicals..."
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
        </div>

        {/* Filter and Sort Row */}
        <div className="filter-sort-row">
          <select 
            className="filter-select"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            disabled={loading}
          >
            <option value="all">All Classes</option>
            <option value="moderate-hazard">Moderate Hazard</option>
            <option value="toxic">Toxic</option>
            <option value="corrosive">Corrosive</option>
            <option value="reactive">Reactive</option>
            <option value="flammable">Flammable</option>
          </select>
          
          <select 
            className="filter-select"
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            disabled={loading}
          >
            {getChemicalSortOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <button 
            className="sort-direction-button"
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            disabled={loading}
          >
            {sortDirection === 'asc' ? (
              <>
                <ArrowUp className="sort-arrow" />
                Ascending
              </>
            ) : (
              <>
                <ArrowDown className="sort-arrow" />
                Descending
              </>
            )}
          </button>
          
          <div className="import-export-buttons">
            <label htmlFor="import-chemicals" className={`import-button ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="import-export-icon" />
              <span>Import</span>
              <input
                id="import-chemicals"
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
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Chemicals List */}
        <div className="chemicals-list">
          {finalSortedChemicals.map(chemical => {
            const isOutOfStock = chemical.current_quantity === 0;
            
            return (
              <div 
                key={chemical.id} 
                className={`chemical-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                onClick={() => handleCardClick(chemical)}
              >
                <div className={`chemical-safety-indicator ${safetyColors[chemical.safety_class]}`}></div>
                
                <div className="chemical-main-info">
                  <h3 className="chemical-name">{chemical.name}</h3>
                  <p className="chemical-meta">{chemical.batch_number} • {chemical.brand}</p>
                  <div className="ghs-symbols">
                    {normalizeGhsSymbols(chemical.ghs_symbols).map(symbol => {
                      const imgSrc = ghsSymbols[symbol];
                      if (!imgSrc) return null;
                      
                      return (
                        <img 
                          key={symbol} 
                          src={imgSrc} 
                          alt={symbol}
                          title={symbol}
                          className="ghs-symbol-image"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
                
                <div className="chemical-details">
                  <p className="chemical-detail-item">
                    <span className="detail-label">Qty:</span>
                    <span className={`detail-value ${isOutOfStock ? 'text-red-600 font-bold' : ''}`}>
                      {chemical.current_quantity}/{chemical.initial_quantity}
                    </span>
                  </p>
                  <p className="chemical-detail-item">
                    <span className="detail-label">Exp:</span>
                    <span className="detail-value">{chemical.expiration_date}</span>
                  </p>
                  <p className="chemical-detail-item">
                    <span className="detail-label">Loc:</span>
                    <span className="detail-value">{chemical.location}</span>
                  </p>
                </div>
              </div>
            );
          })}
          
          {finalSortedChemicals.length === 0 && (
            <p className="no-data">
              {nonExpiredChemicals.length === 0 ? 'No active chemicals in inventory' : 'No chemicals match your search'}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ChemicalsList;