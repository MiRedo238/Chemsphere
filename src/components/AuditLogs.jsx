// src/components/AuditLogs.jsx
import React, { useContext, useEffect } from 'react';
import { ChevronLeft, FileText, User, Clock, FlaskConical, Microscope } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { DatabaseContext } from '../contexts/DatabaseContext';

const AuditLogs = ({ setCurrentView, userRole }) => {
  const { auditLogs, loading, fetchAuditLogs, error } = useContext(DatabaseContext);

  // Fetch audit logs when component mounts
  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

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
          className="ml-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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

      <div className="audit-log-container">
        {auditLogs && auditLogs.length > 0 ? (
          <div className="space-y-2">
            {auditLogs.map(log => (
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
          <p className="no-data">No audit logs available</p>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;