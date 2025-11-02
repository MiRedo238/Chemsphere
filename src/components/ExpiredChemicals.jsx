import React, { useContext, useState } from 'react';
import { format } from 'date-fns';
import { Search, Download, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import { csvService } from '../services/csvService';
import { DatabaseContext } from '../contexts/DatabaseContext';
import { safetyColors, ghsSymbols } from '../utils/data';
import { normalizeGhsSymbols, filterChemicals, sortItems, getChemicalSortOptions, exportToCSV} from '../utils/helpers';
import { importChemicals } from '../services/api';

const ExpiredChemicals = ({ setSelectedItem, setCurrentView, userRole, refreshData }) => {
  const { chemicals, loading, addAuditLog } = useContext(DatabaseContext);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [sortField, setSortField] = useState('expiration_date');
  const [sortDirection, setSortDirection] = useState('asc');
  const [importLoading, setImportLoading] = useState(false);

  // Filter only expired chemicals
  const expiredChemicals = chemicals.filter(chemical => {
    if (!chemical.expiration_date) return false; // If no expiration date, it can't be expired
    
    try {
      const expirationDate = new Date(chemical.expiration_date);
      const today = new Date();
      // Set both dates to start of day for accurate comparison
      today.setHours(0, 0, 0, 0);
      expirationDate.setHours(0, 0, 0, 0);
      return expirationDate < today;
    } catch (error) {
      console.error('Invalid expiration date:', chemical.expiration_date, error);
      return false; // If date parsing fails, don't show as expired
    }
  });

  // Filter and sort expired chemicals
  const filteredChemicals = filterChemicals(expiredChemicals, searchTerm, filterClass, sortField, sortDirection);
  const sortedChemicals = sortItems(filteredChemicals, sortField, sortDirection);

  // Separate out-of-stock chemicals and sort them separately
  const outOfStockChemicals = sortedChemicals.filter(chem => chem.current_quantity === 0);
  const inStockChemicals = sortedChemicals.filter(chem => chem.current_quantity > 0);
  
  // Sort out-of-stock chemicals by the same criteria
  const sortedOutOfStock = sortItems(outOfStockChemicals, sortField, sortDirection);
  
  // Combine: out-of-stock first, then in-stock
  const finalSortedChemicals = [...sortedOutOfStock, ...inStockChemicals];

  const handleExportCSV = () => {
    try {
      exportToCSV(expiredChemicals, 'expired-chemicals');
      
      if (addAuditLog) {
        addAuditLog({
          type: 'chemical',
          action: 'export',
          itemName: 'Expired Chemicals',
          user: userRole || 'user',
          timestamp: new Date().toISOString(),
          details: { count: expiredChemicals.length }
        });
      }
    } catch (err) {
      setError('Failed to export data');
      console.error(err);
    }
  };

  // Handle import for expired chemicals (if needed)
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setImportLoading(true);
        const result = await importChemicals(file);
        if (refreshData) {
          await refreshData();
        }
        if (addAuditLog) {
          addAuditLog({
            type: 'chemical',
            action: 'import',
            itemName: `${result.imported} items`,
            user: userRole || 'user',
            timestamp: new Date().toISOString(),
            details: { count: result.imported }
          });
        }
      } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import chemicals');
      } finally {
        setImportLoading(false);
      }
    }
  };

  // Handle card click
  const handleChemicalClick = (chemical) => {
    if (!loading && !importLoading) {
      setSelectedItem({...chemical, type: 'chemical'}, 'expired-chemicals');
      setCurrentView('detail');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="list-header">
        <div>
          <h1 className="list-title">Expired Chemicals</h1>
          <p className="text-sm text-gray-600 mt-1">
            Total Number of Expired Chemicals: {expiredChemicals.length}
            {outOfStockChemicals.length > 0 && (
              <span className="text-red-600 font-semibold ml-2">
                • Out of Stock: {outOfStockChemicals.length}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="list-container">
        {/* Search Bar - Full Width */}
        <div className="search-row">
          <div className="autocomplete-container">
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search expired chemicals..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={importLoading}
              />
            </div>
          </div>
        </div>

        {/* Filter and Sort Row */}
        <div className="filter-sort-row">
          <select 
            className="filter-select"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            disabled={importLoading}
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
            disabled={importLoading}
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
            disabled={importLoading}
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
            <label htmlFor="import-expired-chemicals-filter" className={`import-button ${importLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="import-export-icon" />
              <span>Import</span>
              <input
                id="import-expired-chemicals-filter"
                type="file"
                accept=".csv"
                onChange={handleImport}
                style={{ display: 'none' }}
                disabled={importLoading}
              />
            </label>
            <button 
              className="export-button" 
              onClick={handleExportCSV} 
              disabled={importLoading}
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
                onClick={() => handleChemicalClick(chemical)}
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
                  <p className="chemical-detail-item expired-label">
                    <span className="detail-label">Exp:</span>
                    <span className="detail-value text-red-600 font-semibold">
                      {format(new Date(chemical.expiration_date), 'yyyy-MM-dd')}
                    </span>
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
              {expiredChemicals.length === 0 ? 'No expired chemicals found' : 'No chemicals match your search'}
            </p>
          )}
        </div>

        {/* Footer information */}
        {expiredChemicals.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {finalSortedChemicals.length} of {expiredChemicals.length} expired chemicals
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpiredChemicals;