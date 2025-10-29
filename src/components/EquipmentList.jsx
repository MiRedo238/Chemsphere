// src/components/EquipmentList.jsx
import React, { useState, useContext } from 'react';
import { Search, Plus, Download, Upload, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const isAdmin = userRole === 'admin';

  // Filter and sort equipment
  const filteredEquipment = filterEquipment(equipment, searchTerm, statusFilter, sortField, sortDirection);
  const sortedEquipment = sortItems(filteredEquipment, sortField, sortDirection);

  // Pagination calculations
  const totalItems = sortedEquipment.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = sortedEquipment.slice(startIndex, endIndex);

  // Handle search with autocomplete
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
    
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
    setCurrentPage(1);
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
      setEquipment([...equipment, ...importedData]);
      
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
    setEquipment([...equipment, newEquipment]);
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

  // Handle card click
  const handleCardClick = (eq) => {
    if (!loading) {
      setSelectedItem({...eq, type: 'equipment'});
      setCurrentView('detail');
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
        {/* Search Bar - Full Width */}
        <div className="search-row">
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
        </div>

        {/* Filter and Sort Row */}
        <div className="filter-sort-row">
          <select 
            className="filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
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
            onChange={(e) => {
              setSortField(e.target.value);
              setCurrentPage(1);
            }}
            disabled={loading}
          >
            {getEquipmentSortOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
            <label htmlFor="import-equipment" className={`import-button ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="import-export-icon" />
              <span>Import</span>
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
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="equipment-list">
          {currentItems.map(eq => (
            <div 
              key={eq.id} 
              className="equipment-card"
              onClick={() => handleCardClick(eq)}
            >
              <div className="equipment-info">
                <h3 className="equipment-name">{eq.name}</h3>
                <p className="equipment-meta">{eq.model} • {eq.serial_id}</p>
              </div>
              <div className="equipment-status">
                <span className={`status-badge ${statusColors[eq.status]}`}>
                  {eq.status}
                </span>
              </div>
            </div>
          ))}
          
          {currentItems.length === 0 && (
            <p className="no-data">No equipment found</p>
          )}
        </div>

        {/* Pagination */}
        {renderPagination()}
      </div>
    </div>
  );
};

export default EquipmentList;