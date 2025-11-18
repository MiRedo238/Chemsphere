// src/components/LogChemicalUsage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { Search, Plus, Download, Upload, ArrowUp, ArrowDown, Calendar, User, FlaskConical, Microscope, MapPin } from 'lucide-react';
import { DatabaseContext } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import AddLogEntry from './AddLogEntry';
import Modal from './Modal';
import { exportToCSV } from '../utils/helpers';

const LogChemicalUsage = ({ setCurrentView, addAuditLog, userRole, refreshData, onViewLogDetail }) => {
  const { chemicals, equipment } = useContext(DatabaseContext);
  const { user: authUser } = useAuth();
  
  // State
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const { usageLogs, fetchUsageLogs, logUsage } = useContext(DatabaseContext);

  // Use cache-first usageLogs from DatabaseContext. Only fetch if cache empty.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        let data = usageLogs && usageLogs.length > 0 ? usageLogs : await fetchUsageLogs();
        if (!data) data = [];

        const formattedLogs = data.map(log => ({
          id: log.id,
          type: 'usage_log',
          user_id: log.user_id,
          user_name: log.user_name,
          userName: log.user_name || 'Unknown User',
          date: log.date,
          notes: log.notes,
          location: log.location,
          created_at: log.created_at,
          updated_at: log.updated_at,
          equipment: log.equipment || [],
          chemicals: log.chemicals || []
        })).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (mounted) setLogs(formattedLogs);
      } catch (error) {
        console.error('Error fetching usage logs:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => { mounted = false; };
  }, [usageLogs, fetchUsageLogs]);

  // Filter and sort logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.chemicals?.some(chem => 
        chem.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chem.chemical_name?.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      log.equipment?.some(eq => 
        eq.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const logDate = new Date(log.date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const matchesDate = dateFilter === 'all' ||
      (dateFilter === 'today' && logDate.toDateString() === today.toDateString()) ||
      (dateFilter === 'yesterday' && logDate.toDateString() === yesterday.toDateString()) ||
      (dateFilter === 'last-week' && logDate >= lastWeek && logDate <= today);

    return matchesSearch && matchesDate;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
  });

  // Search with autocomplete
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length > 2) {
      const suggestions = logs.filter(log => 
        log.userName?.toLowerCase().includes(value.toLowerCase()) ||
        log.chemicals?.some(chem => 
          chem.name?.toLowerCase().includes(value.toLowerCase()) ||
          chem.chemical_name?.toLowerCase().includes(value.toLowerCase())
        )
      ).slice(0, 5);
      
      setAutocompleteSuggestions(suggestions);
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  };

  const selectAutocomplete = (log) => {
    setSearchTerm(log.userName || '');
    setAutocompleteSuggestions([]);
    setShowAutocomplete(false);
  };

  // Export functionality
  const handleExport = () => {
    const exportData = sortedLogs.map(log => ({
      'Log ID': log.id,
      'User': log.userName,
      'Date': new Date(log.date).toLocaleDateString(),
      'Time': new Date(log.date).toLocaleTimeString(),
      'Location': log.location || '',
      'Notes': log.notes || '',
      'Chemicals': log.chemicals?.map(chem => 
        `${chem.name || chem.chemical_name} (${chem.quantity}${chem.unit || ''})`
      ).join('; ') || '',
      'Equipment': log.equipment?.map(eq => eq.name).join('; ') || '',
      'Created At': new Date(log.created_at).toLocaleString()
    }));
    
    exportToCSV(exportData, 'chemical_usage_logs');
    addAuditLog({
      type: 'usage_log',
      action: 'export',
      itemName: 'Usage Logs',
      user: userRole,
      timestamp: new Date().toISOString(),
      details: { count: sortedLogs.length }
    });
  };

  // Handle adding new log
  const handleAddLog = async (newLog) => {
    try {
      // After adding a log, refresh usage logs from the server to ensure we have full details.
      if (fetchUsageLogs) await fetchUsageLogs(true);
      
      addAuditLog({
        type: 'usage_log',
        action: 'add',
        itemName: 'Usage Log',
        user: userRole,
        timestamp: new Date().toISOString(),
        details: {
          user: newLog.user_name,
          chemicals: newLog.chemicals?.length || 0,
          equipment: newLog.equipment?.length || 0
        }
      });
      
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to process new log:', error);
    }
  };

  // Handle card click to view details
  const handleLogClick = (log) => {
    if (onViewLogDetail) {
      onViewLogDetail(log, 'log-usage');
    } else {
      console.warn('onViewLogDetail not provided, using setCurrentView fallback');
      setCurrentView('log-detail', log);
    }
  };

  // Format date for display
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Get chemical name safely
  const getChemicalName = (chem) => {
    return chem.name || chem.chemical_name || 'Unknown Chemical';
  };

  // Get equipment name safely
  const getEquipmentName = (eq) => {
    return eq.name || 'Unknown Equipment';
  };

  // Render log card
  const renderLogCard = (log) => {
    const { date, time } = formatDateTime(log.date);
    
    return (
      <div 
        key={log.id} 
        className="usage-log-item"
        onClick={() => handleLogClick(log)}
      >
        {/* Left side - Main content */}
        <div className="usage-log-content">
          <h3 className="usage-log-user">Log by: {log.userName}</h3>
          
          {/* Location */}
          {log.location && (
            <div className="usage-log-location">
              <MapPin size={14} />
              <span>{log.location}</span>
            </div>
          )}
          
          {/* Chemicals used */}
          {log.chemicals && log.chemicals.length > 0 && (
            <div className="usage-log-chemicals">
              <FlaskConical size={14} />
              <span>
                <strong>Chemicals:</strong> {log.chemicals.map(chem => 
                  `${getChemicalName(chem)} (${chem.quantity} unit)`
                ).join(', ')}
              </span>
            </div>
          )}
          
          {/* Equipment used */}
          {log.equipment && log.equipment.length > 0 && (
            <div className="usage-log-equipment">
              <Microscope size={14} />
              <span>
                <strong>Equipment:</strong> {log.equipment.map(eq => getEquipmentName(eq)).join(', ')}
              </span>
            </div>
          )}
          
          {/* Notes preview */}
          {log.notes && (
            <div className="usage-log-notes">
              <strong>Notes:</strong> {log.notes}
            </div>
          )}
        </div>
        
        {/* Right side - Date and time */}
        <div className="usage-log-datetime">
          <div className="usage-log-date">{date}</div>
          <div className="usage-log-time">{time}</div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="list-header">
        <div>
          <h1 className="list-title">Usage Logs</h1>
          <p className="text-sm text-gray-600 mt-1">
            Total Log Entries: {logs.length}
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="add-button"
          disabled={loading}
        >
          <Plus className="add-button-icon" />
          {loading ? 'Loading...' : 'Add Log Entry'}
        </button>
      </div>

      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        title="Add New Usage Log"
      >
        <AddLogEntry 
          onSave={handleAddLog}
          onCancel={() => setShowAddModal(false)}
          chemicals={chemicals}
          equipment={equipment}
          userRole={userRole}
          currentUser={authUser}
          addAuditLog={addAuditLog}
          refreshData={refreshData}
        />
      </Modal>

      <div className="list-container">
        {/* Search Bar */}
        <div className="search-row">
          <div className="autocomplete-container">
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search logs by user, chemical, equipment, location, or notes..."
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
                    {log.userName} - {formatDateTime(log.date).date}
                    {log.location && ` - ${log.location}`}
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
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            disabled={loading}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last-week">Last 7 Days</option>
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
            <label htmlFor="import-logs" className={`import-button ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="import-export-icon" />
              <span>Import</span>
              <input
                id="import-logs"
                type="file"
                accept=".csv"
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

        {/* Logs List */}
        <div className="equipment-list">
          {sortedLogs.map(renderLogCard)}
          
          {sortedLogs.length === 0 && (
            <p className="no-data">
              {logs.length === 0 ? 'No usage logs found' : 'No logs match your search'}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default LogChemicalUsage;