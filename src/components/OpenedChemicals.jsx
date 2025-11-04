// src/components/OpenedChemicals.jsx
import React, { useState, useContext, useEffect } from 'react';
import { Search, Download, Upload, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, FlaskConical } from 'lucide-react';
import { DatabaseContext } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { safetyColors, ghsSymbols } from '../utils/data';
import { normalizeGhsSymbols, sortItems, exportToCSV, getChemicalSortOptions } from '../utils/helpers';
import AddLogEntry from './AddLogEntry';
import Modal from './Modal';

const OpenedChemicals = ({ setCurrentView, userRole, refreshData, addAuditLog, onViewLogDetail }) => {
  const { chemicals, equipment } = useContext(DatabaseContext);
  const { user: authUser } = useAuth();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [loading, setLoading] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedChemical, setSelectedChemical] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Get opened chemicals directly from chemicals table
  const getOpenedChemicals = () => {
    return chemicals.filter(chemical => 
      chemical.opened === true && 
      (chemical.remaining_amount > 0 || chemical.current_quantity > 0)
    );
  };

  const openedChemicals = getOpenedChemicals();

  // Filter and sort opened chemicals
  const filteredChemicals = openedChemicals.filter(chemical => 
    searchTerm === '' ||
    chemical.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chemical.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chemical.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chemical.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedChemicals = sortItems(filteredChemicals, sortField, sortDirection);

  // Pagination calculations
  const totalItems = sortedChemicals.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = sortedChemicals.slice(startIndex, endIndex);

  // Handle search
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Handle export
  const handleExport = () => {
    const exportData = sortedChemicals.map(chem => ({
      'Chemical Name': chem.name,
      'Brand': chem.brand,
      'Batch Number': chem.batch_number,
      'Expiration Date': chem.expiration_date ? new Date(chem.expiration_date).toLocaleDateString() : '',
      'Remaining Amount': chem.remaining_amount || chem.current_quantity,
      'Unit': chem.unit,
      'Location': chem.location,
      'Safety Class': chem.safety_class,
      'Physical State': chem.physical_state,
      'Date Opened': chem.opened_date ? new Date(chem.opened_date).toLocaleDateString() : 'Unknown',
      'Last Updated': new Date(chem.updated_at).toLocaleString()
    }));
    
    exportToCSV(exportData, 'opened_chemicals');
    addAuditLog({
      type: 'chemical',
      action: 'export',
      item_name: 'Opened Chemicals',
      user_role: userRole,
      user_name: authUser?.user_metadata?.name || 'System',
      details: { count: sortedChemicals.length }
    });
  };

  // Handle log chemical button click
  const handleLogChemical = (chemical) => {
    setSelectedChemical(chemical);
    setShowLogModal(true);
    
    // Create audit log
    addAuditLog({
      type: 'usage_log',
      action: 'open-log-modal',
      item_name: chemical.name,
      user_role: userRole,
      user_name: authUser?.user_metadata?.name || 'System',
      details: {
        batch_number: chemical.batch_number,
        remaining_amount: chemical.remaining_amount
      }
    });
  };

  // Handle adding new log from modal
  const handleAddLog = async (newLog) => {
    try {
      await refreshData();
      
      addAuditLog({
        type: 'usage_log',
        action: 'add',
        item_name: 'Usage Log',
        user_role: userRole,
        user_name: authUser?.user_metadata?.name || 'System',
        details: {
          user: newLog.user_name,
          chemicals: newLog.chemicals?.length || 0,
          equipment: newLog.equipment?.length || 0
        }
      });
      
      setShowLogModal(false);
      setSelectedChemical(null);
    } catch (error) {
      console.error('Failed to process new log:', error);
    }
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  // Render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="pagination-container">
        <div className="pagination-info">
          Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} items
        </div>
        
        <div className="pagination-controls">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <div className="pagination-numbers">
            {pageNumbers.map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`pagination-number ${currentPage === page ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="pagination-size">
          <select
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="pagination-select"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>
    );
  };

  // Render chemical card
  const renderChemicalCard = (chemical) => {
    const isLowQuantity = (chemical.remaining_amount || chemical.current_quantity) < 10;
    
    return (
      <div 
        key={chemical.id} 
        className="chemical-card opened-chemical-card"
        onMouseEnter={(e) => {
          const button = e.currentTarget.querySelector('.log-chemical-button');
          if (button) button.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          const button = e.currentTarget.querySelector('.log-chemical-button');
          if (button) button.style.opacity = '0';
        }}
      >
        <div className={`chemical-safety-indicator ${safetyColors[chemical.safety_class] || 'default'}`}></div>
        
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
            <span className="detail-label">Remaining:</span>
            <span className={`detail-value ${isLowQuantity ? 'text-red-600 font-bold' : ''}`}>
              {chemical.remaining_amount}/{chemical.unit}
            </span>
          </p>
          <p className="chemical-detail-item">
            <span className="detail-label">Exp:</span>
            <span className="detail-value">
              {chemical.expiration_date ? new Date(chemical.expiration_date).toLocaleDateString() : 'N/A'}
            </span>
          </p>
          <p className="chemical-detail-item">
            <span className="detail-label">Location:</span>
            <span className="detail-value">{chemical.location || 'Not specified'}</span>
          </p>
        </div>

        {/* Log Chemical Button - appears on hover */}
        <button
          className="log-chemical-button"
          onClick={(e) => {
            e.stopPropagation();
            handleLogChemical(chemical);
          }}
        >
          <FlaskConical size={14} />
          Log Usage
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="list-header">
        <div>
          <h1 className="list-title">Opened Chemicals</h1>
          <p className="text-sm text-gray-600 mt-1">
            Total Number of Opened Chemicals: {openedChemicals.length}
          </p>
        </div>
      </div>

      {/* Log Chemical Modal */}
      <Modal 
        isOpen={showLogModal} 
        onClose={() => {
          setShowLogModal(false);
          setSelectedChemical(null);
        }}
        title="Log Chemical Usage"
      >
        <AddLogEntry 
          onSave={handleAddLog}
          onCancel={() => {
            setShowLogModal(false);
            setSelectedChemical(null);
          }}
          chemicals={chemicals}
          equipment={equipment}
          userRole={userRole}
          currentUser={authUser}
          addAuditLog={addAuditLog}
          refreshData={refreshData}
          prefillChemical={selectedChemical ? {
            chemical_id: selectedChemical.id,
            chemical_name: selectedChemical.name,
            quantity: 0.1, // Start with small amount for opened chemicals
            unit: selectedChemical.unit,
            opened: true, // Keep it opened
            remaining_amount: selectedChemical.remaining_amount || selectedChemical.current_quantity,
            remaining_location: selectedChemical.location
          } : null}
          isPrefilled={!!selectedChemical}
        />
      </Modal>

      <div className="list-container">
        {/* Search Bar */}
        <div className="search-row">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search opened chemicals by name, brand, batch number, or location..."
              className="search-input"
              value={searchTerm}
              onChange={handleSearchChange}
              disabled={loading}
            />
          </div>
        </div>

        {/* Filter and Sort Row */}
        <div className="filter-sort-row">
          <select 
            className="filter-select"
            value={sortField}
            onChange={(e) => {
              setSortField(e.target.value);
              setCurrentPage(1);
            }}
            disabled={loading}
          >
            <option value="name">Name</option>
            <option value="expiration_date">Expiration Date</option>
            <option value="remaining_amount">Remaining Amount</option>
            <option value="brand">Brand</option>
            <option value="batch_number">Batch Number</option>
            <option value="location">Location</option>
          </select>
          
          <button 
            className="sort-direction-button"
            onClick={() => {
              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              setCurrentPage(1);
            }}
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
            <button 
              className="export-button" 
              onClick={handleExport} 
              disabled={loading || openedChemicals.length === 0}
            >
              <Download className="import-export-icon" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Chemicals List */}
        <div className="chemicals-list opened-chemicals-list">
          {currentItems.map(renderChemicalCard)}
          
          {currentItems.length === 0 && (
            <p className="no-data">
              {openedChemicals.length === 0 ? 'No opened chemicals found' : 'No chemicals match your search'}
            </p>
          )}
        </div>

        {/* Pagination */}
        {renderPagination()}
      </div>
    </>
  );
};

export default OpenedChemicals;