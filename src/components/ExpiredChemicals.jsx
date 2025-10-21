import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Download, Upload, Eye } from 'lucide-react';
import { csvService } from '../services/csvService';
import { DatabaseContext } from '../contexts/DatabaseContext';
import { safetyColors, ghsSymbols } from '../utils/data';
import { normalizeGhsSymbols, filterChemicals, sortItems, getChemicalSortOptions } from '../utils/helpers';
import { importChemicals } from '../services/api';

const ExpiredChemicals = () => {
  const { chemicals, loading, addAuditLog, refreshData } = useContext(DatabaseContext);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [sortField, setSortField] = useState('expiration_date');
  const [sortDirection, setSortDirection] = useState('asc');
  const [importLoading, setImportLoading] = useState(false);

  // Filter only expired chemicals
  const expiredChemicals = chemicals.filter(chemical => {
    const expirationDate = new Date(chemical.expiration_date);
    const today = new Date();
    return expirationDate < today;
  });

  // Filter and sort expired chemicals
  const filteredChemicals = filterChemicals(expiredChemicals, searchTerm, filterClass, sortField, sortDirection);
  const sortedChemicals = sortItems(filteredChemicals, sortField, sortDirection);

  const handleExportCSV = () => {
    try {
      const formattedData = expiredChemicals.map(chemical => ({
        ...chemical,
        expiration_date: format(new Date(chemical.expiration_date), 'yyyy-MM-dd'),
        date_of_arrival: format(new Date(chemical.date_of_arrival), 'yyyy-MM-dd'),
        ghs_symbols: chemical.ghs_symbols?.join(', ') || ''
      }));
      csvService.generateCSV(formattedData, 'expired-chemicals.csv');
      
      if (addAuditLog) {
        addAuditLog({
          type: 'chemical',
          action: 'export',
          itemName: 'Expired Chemicals',
          user: 'user', // You might want to get the actual user from context
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
            user: 'user', // You might want to get the actual user from context
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

  const handleChemicalClick = (chemical) => {
    navigate(`/chemicals/${chemical.id}`);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="p-6">
      {/* Updated header to match ChemicalsList */}
      <div className="list-header">
        <div>
          <h1 className="list-title">Expired Chemicals</h1>
          <p className="text-sm text-gray-600 mt-1">
            Total Number of Expired Chemicals: {expiredChemicals.length} 
          </p>
        </div>
      </div>

      <div className="list-container">
        {/* Search and filter section matching ChemicalsList */}
        <div className="search-filter">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search expired chemicals..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
          
          {/* Import/Export buttons in the filter row (matching ChemicalsList) */}
          <div className="import-export">
            <label htmlFor="import-expired-chemicals-filter" className="import-button">
              <Upload className="import-export-icon" />
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
            </button>
          </div>
        </div>

        {/* Chemicals list matching ChemicalsList layout */}
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
                          return null;
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
                    <p className="item-meta text-red-600 font-semibold">
                      EXP: {format(new Date(chemical.expiration_date), 'yyyy-MM-dd')}
                    </p>
                    <p className="item-meta">
                      Qty: {chemical.current_quantity}/{chemical.initial_quantity}
                    </p>
                    <p className="item-meta">{chemical.location}</p>
                  </div>
                </div>
              </div>
              {/* Eye button matching ChemicalsList */}
              <button 
                onClick={() => handleChemicalClick(chemical)}
                className="view-button"
                disabled={importLoading}
              >
                <Eye className="view-icon" />
              </button>
            </div>
          ))}
          
          {sortedChemicals.length === 0 && (
            <p className="no-data">
              {expiredChemicals.length === 0 ? 'No expired chemicals found' : 'No chemicals match your search'}
            </p>
          )}
        </div>

        {/* Footer information matching ChemicalsList style */}
        {expiredChemicals.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {sortedChemicals.length} of {expiredChemicals.length} expired chemicals
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpiredChemicals;