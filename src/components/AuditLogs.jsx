// src/components/AuditLogs.jsx
import React, { useContext, useEffect, useState } from 'react';
import { ChevronLeft, FileText, User, Clock, FlaskConical, Microscope, Search, Download, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import { formatDate, exportToCSV, sortItems } from '../utils/helpers';
import { DatabaseContext } from '../contexts/DatabaseContext';

const AuditLogs = ({ setCurrentView, userRole }) => {
  const { auditLogs, loading, fetchAuditLogs, error } = useContext(DatabaseContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState('desc'); // Default to newest first
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Fetch audit logs when component mounts
  useEffect(() => {
    if (!auditLogs || auditLogs.length === 0) {
      fetchAuditLogs();
    }
  }, []);

  // Get unique actions and users for filters
  const uniqueActions = [...new Set(auditLogs?.map(log => log.action).filter(Boolean))];
  const uniqueUsers = [...new Set(auditLogs?.map(log => log.user_name || log.user || log.userName).filter(Boolean))];

  // Filter and sort audit logs
  const filteredLogs = auditLogs?.filter(log => {
    const matchesSearch = searchTerm === '' || 
      (log.item_name || log.itemName || log.details?.itemName || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (log.user_name || log.user || log.userName || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesUser = userFilter === 'all' || 
      (log.user_name || log.user || log.userName) === userFilter;

    return matchesSearch && matchesAction && matchesUser;
  }) || [];

  // Sort by timestamp (newest first by default)
  const sortedLogs = sortItems(filteredLogs, 'timestamp', sortDirection);

  // Handle search with autocomplete
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length > 2 && auditLogs) {
      const suggestions = auditLogs.filter(log => 
        (log.item_name || log.itemName || log.details?.itemName || '')
          .toLowerCase().includes(value.toLowerCase()) ||
        (log.user_name || log.user || log.userName || '')
          .toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      
      setAutocompleteSuggestions(suggestions);
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  };

  // Select from autocomplete
  const selectAutocomplete = (log) => {
    setSearchTerm(log.item_name || log.itemName || log.details?.itemName || '');
    setAutocompleteSuggestions([]);
    setShowAutocomplete(false);
  };

  // Handle export
  const handleExport = () => {
    if (auditLogs && auditLogs.length > 0) {
      exportToCSV(auditLogs, 'audit_logs');
    }
  };

  // Handle import (placeholder - you might want to implement this based on your needs)
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Implement import logic here
      console.log('Import file:', file);
      alert('Audit log import functionality would be implemented here');
    }
  };

  const getActionIcon = (type) => {
    switch (type) {
      case 'chemical': return <FlaskConical size={16} className="mr-1" />;
      case 'equipment': return <Microscope size={16} className="mr-1" />;
      default: return <FileText size={16} className="mr-1" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'add': return 'text-green-600';
      case 'update': return 'text-blue-600';
      case 'delete': return 'text-red-600';
      case 'usage': return 'text-purple-600';
      case 'checkout': return 'text-orange-600';
      case 'checkin': return 'text-green-600';
      case 'import': return 'text-indigo-600';
      case 'export': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div>
        <div className="detail-header">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="back-button"
          >
            <ChevronLeft className="back-icon" />
          </button>
          <h1 className="detail-title">
            <FileText className="inline mr-2" />
            Audit Logs
          </h1>
        </div>
        <div className="loading-container">
          <p>Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="detail-header">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className="back-button"
        >
          <ChevronLeft className="back-icon" />
        </button>
        <h1 className="detail-title">
          <FileText className="inline mr-2" />
          Audit Logs
        </h1>
        <button 
          onClick={fetchAuditLogs}
          className="refresh-button-icon"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-message mb-4">
          {error}
          <button 
            onClick={fetchAuditLogs}
            className="ml-4 text-sm underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="list-container">
        {/* Search Bar - Full Width */}
        <div className="search-row">
          <div className="autocomplete-container">
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search audit logs..."
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
                {autocompleteSuggestions.map(log => (
                  <div 
                    key={log.id} 
                    className="autocomplete-item"
                    onClick={() => selectAutocomplete(log)}
                  >
                    {log.item_name || log.itemName || log.details?.itemName} - {log.user_name || log.user || log.userName}
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
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            disabled={loading || !auditLogs}
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          
          <select 
            className="filter-select"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            disabled={loading || !auditLogs}
          >
            <option value="all">All Users</option>
            {uniqueUsers.map(user => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
          
          <button 
            className="sort-direction-button"
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            disabled={loading || !auditLogs}
          >
            {sortDirection === 'asc' ? (
              <>
                <ArrowUp className="sort-arrow" />
                Oldest First
              </>
            ) : (
              <>
                <ArrowDown className="sort-arrow" />
                Newest First
              </>
            )}
          </button>
          
          <div className="import-export-buttons">
            <label htmlFor="import-audit-logs" className={`import-button ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="import-export-icon" />
              <span>Import</span>
              <input
                id="import-audit-logs"
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
              disabled={loading || !auditLogs || auditLogs.length === 0}
            >
              <Download className="import-export-icon" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="audit-log-container">
          {sortedLogs.length > 0 ? (
            <div className="space-y-2">
              {sortedLogs.map(log => (
                <div key={log.id} className="audit-log-item">
                  <div className="audit-log-header">
                    <div className="flex items-center">
                      {getActionIcon(log.type || 'general')}
                      <span className={`audit-log-action ${getActionColor(log.action)}`}>
                        {log.action} {log.type}
                      </span>
                      <span className="ml-3 font-medium"> {log.item_name || log.itemName || log.details?.itemName}</span>
                    </div>
                    <div className="audit-log-timestamp">
                      <Clock size={14} className="inline mr-1" />
                      {formatDate(log.timestamp || log.created_at || log.createdAt)}
                    </div>
                  </div>
                  <div className="audit-log-details">
                    <User size={14} className="inline mr-1" />
                    {log.user_name || log.user || log.userName}
                    {log.details && (
                      <>
                        {log.details.model && ` • Model: ${log.details.model}`}
                        {log.details.serial_id && ` • Serial: ${log.details.serial_id}`}
                        {log.details.serialId && ` • Serial: ${log.details.serialId}`}
                        {log.details.batchNumber && ` • Serial: ${log.details.batchNumber}`}
                        {log.details.location && ` • Location: ${log.details.location}`}
                        {log.details.quantity && ` • Quantity: ${log.details.quantity}`}
                        {log.details.status && ` • Status: ${log.details.status}`}
                        {log.details.condition && ` • Condition: ${log.details.condition}`}
                        {/* Add fallback for any other details */}
                        {Object.keys(log.details).length > 0 && 
                        !log.details.model && 
                        !log.details.serial_id && 
                        !log.details.serialId && 
                        !log.details.batchNumber && 
                        !log.details.location && 
                        !log.details.quantity && 
                        !log.details.status && 
                        !log.details.condition && 
                        ` • Details: ${JSON.stringify(log.details)}`}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">
              {auditLogs && auditLogs.length === 0 ? 'No audit logs available' : 'No logs match your search'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;