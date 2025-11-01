// src/components/LogUsageDetailView.jsx
import React, { useState, useContext } from 'react';
import { ChevronLeft, Edit, Trash2, Save, X, User, Calendar, FlaskConical, Microscope, MapPin } from 'lucide-react';
import { DatabaseContext } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { updateChemicalUsageLog, deleteChemicalUsageLog } from '../services/usageLogService';

const LogUsageDetailView = ({ selectedLog, setCurrentView, userRole, refreshData }) => {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { addAuditLog } = useContext(DatabaseContext);
  const { user: authUser } = useAuth();

  // Initialize edit form with data validation
  React.useEffect(() => {
    if (selectedLog) {
      setEditForm({
        notes: selectedLog.notes || '',
        location: selectedLog.location || '',
        chemicals: selectedLog.chemicals || [],
        equipment: selectedLog.equipment || []
      });
    }
  }, [selectedLog]);

  // Helper functions
  const formatDateTime = (dateString) => {
    if (!dateString) return { date: 'Unknown', time: 'Unknown', full: 'Unknown' };
    
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        full: date.toLocaleString()
      };
    } catch (error) {
      console.error('Error formatting date:', error);
      return { date: 'Invalid Date', time: 'Invalid Date', full: 'Invalid Date' };
    }
  };

  // Event handlers
  const handleSave = async () => {
    if (!editForm || !selectedLog) return;
    
    try {
      setLoading(true);
      setError('');

      const updateData = {
        notes: editForm.notes || null,
        location: editForm.location || null,
      };

      await updateChemicalUsageLog(selectedLog.id, updateData);

      addAuditLog({
        type: 'usage_log',
        action: 'update',
        itemName: `Log by ${selectedLog.user_name || selectedLog.userName}`,
        user: userRole,
        timestamp: new Date().toISOString(),
        details: {
          logId: selectedLog.id,
          user: selectedLog.user_name || selectedLog.userName
        }
      });

      await refreshData();
      setEditing(false);
      
      if (refreshData) {
        await refreshData();
      }
    } catch (error) {
      console.error('Error updating log:', error);
      setError('Failed to update log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLog || !window.confirm('Are you sure you want to delete this log entry?')) return;

    try {
      setLoading(true);
      await deleteChemicalUsageLog(selectedLog.id);
      
      addAuditLog({
        type: 'usage_log',
        action: 'delete',
        itemName: `Log by ${selectedLog.user_name || selectedLog.userName}`,
        user: userRole,
        timestamp: new Date().toISOString(),
        details: {
          logId: selectedLog.id,
          user: selectedLog.user_name || selectedLog.userName
        }
      });
      
      await refreshData();
      setCurrentView('log-usage');
    } catch (error) {
      console.error('Error deleting log:', error);
      setError('Failed to delete log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!selectedLog) return;
    
    setEditForm({
      notes: selectedLog.notes || '',
      location: selectedLog.location || '',
      chemicals: selectedLog.chemicals || [],
      equipment: selectedLog.equipment || []
    });
    setEditing(false);
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Check if current user can edit/delete
  const canModify = userRole === 'admin' || selectedLog?.user_id === authUser?.id;

  // Safe data access functions
  const getSafeChemicals = () => {
    if (!selectedLog) return [];
    return selectedLog.chemicals || [];
  };

  const getSafeEquipment = () => {
    if (!selectedLog) return [];
    return selectedLog.equipment || [];
  };

  // Get chemical name safely
  const getChemicalName = (chem) => {
    return chem.name || chem.chemical_name || 'Unknown Chemical';
  };

  // Get equipment name safely
  const getEquipmentName = (eq) => {
    return eq.name || 'Unknown Equipment';
  };

  // Render components
  const renderHeader = () => (
    <div className="detail-header">
      <button 
        onClick={() => setCurrentView('log-usage')}
        className="back-button"
        disabled={loading}
      >
        <ChevronLeft className="back-icon" />
      </button>
      <h1 className="detail-title">
        Usage Log Details
      </h1>
      {canModify && renderActionButtons()}
    </div>
  );

  const renderActionButtons = () => (
    <div className="ml-auto flex gap-2">
      {editing ? (
        <>
          <button onClick={handleCancel} className="form-button bg-gray-500" disabled={loading}>
            <X size={16} className="mr-1" />
            Cancel
          </button>
          <button onClick={handleSave} className="form-button" disabled={loading}>
            <Save size={16} className="mr-1" />
            {loading ? 'Saving...' : 'Save'}
          </button>
        </>
      ) : (
        <>
          <button onClick={() => setEditing(true)} className="view-button" disabled={loading}>
            <Edit className="view-icon" />
          </button>
          <button onClick={handleDelete} className="view-button text-red-500" disabled={loading}>
            <Trash2 className="view-icon" />
          </button>
        </>
      )}
    </div>
  );

  const renderError = () => (
    error && (
      <div className="error-message mb-4">
        {error}
      </div>
    )
  );

  const renderLogProperties = () => {
    if (!selectedLog) return null;
    
    const { date, time } = formatDateTime(selectedLog.date);
    const userName = selectedLog.user_name || selectedLog.userName || 'Unknown User';
    
    const properties = [
      { label: 'User', value: userName, icon: User },
      { label: 'Date', value: date, icon: Calendar },
      { label: 'Time', value: time, icon: Calendar }
    ];

    if (selectedLog.location || editing) {
      properties.push({ 
        label: 'Location', 
        value: editing ? (
          <input
            type="text"
            name="location"
            value={editForm?.location || ''}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter location..."
            disabled={loading}
          />
        ) : selectedLog.location || 'Not specified',
        icon: MapPin 
      });
    }

    return (
      <div className="detail-properties">
        {properties.map(({ label, value, icon: Icon }) => (
          <div key={label} className="detail-property">
            <span className="property-label flex items-center">
              <Icon size={16} className="mr-2" />
              {label}:
            </span>
            <span className="property-value">{value}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderChemicalsList = () => {
    const chemicals = getSafeChemicals();
    
    return (
      <div className="usage-detail-section">
        <h3 className="usage-detail-section-title">
          <FlaskConical size={20} />
          Chemicals Used
        </h3>
        <div>
          {chemicals.map((chem, index) => (
            <div key={index} className="usage-detail-chemical-card">
              <div className="usage-detail-chemical-header">
                <div style={{ flex: 1 }}>
                  <div className="usage-detail-chemical-name">{getChemicalName(chem)}</div>
                  <div className="usage-detail-chemical-info">
                    <div className="usage-detail-chemical-detail">
                      <strong>Quantity:</strong> {chem.quantity} ({chem.unit || ''} Each)
                      {chem.remaining_amount !== null && (
                        <span style={{ marginLeft: '8px', color: '#999' }}>
                          • Remaining: {chem.remaining_amount} {chem.unit || ''}
                        </span>
                      )}
                    </div>
                    {chem.batch_number && (
                      <div className="usage-detail-chemical-detail">
                        <strong>Batch:</strong> {chem.batch_number}
                      </div>
                    )}
                    {chem.brand && (
                      <div className="usage-detail-chemical-detail">
                        <strong>Brand:</strong> {chem.brand}
                      </div>
                    )}
                    {chem.location && (
                      <div className="usage-detail-chemical-detail">
                        <strong>Storage:</strong> {chem.location}
                      </div>
                    )}
                  </div>
                </div>
                {chem.opened && (
                  <div className="usage-detail-chemical-badge">
                    Opened
                  </div>
                )}
              </div>
            </div>
          ))}
          {chemicals.length === 0 && (
            <div className="usage-detail-empty">No chemicals used</div>
          )}
        </div>
      </div>
    );
  };

  const renderEquipmentList = () => {
    const equipment = getSafeEquipment();
    
    return (
      <div className="usage-detail-section">
        <h3 className="usage-detail-section-title">
          <Microscope size={20} />
          Equipment Used
        </h3>
        <div>
          {equipment.map((eq, index) => (
            <div key={index} className="usage-detail-equipment-card">
              <div className="usage-detail-equipment-name">{getEquipmentName(eq)}</div>
              <div className="usage-detail-equipment-info">
                {eq.serial_id && (
                  <div className="usage-detail-equipment-detail">
                    <strong>Serial:</strong> {eq.serial_id}
                  </div>
                )}
                {eq.model && (
                  <div className="usage-detail-equipment-detail">
                    <strong>Model:</strong> {eq.model}
                  </div>
                )}
                {eq.location && (
                  <div className="usage-detail-equipment-detail">
                    <MapPin size={14} />
                    <strong>Equipment Location:</strong> {eq.location}
                  </div>
                )}
                {eq.status && (
                  <div className="usage-detail-equipment-detail">
                    <strong>Status:</strong> {eq.status}
                  </div>
                )}
              </div>
            </div>
          ))}
          {equipment.length === 0 && (
            <div className="usage-detail-empty">No equipment used</div>
          )}
        </div>
      </div>
    );
  };

  const renderNotes = () => (
    <div className="usage-detail-section">
      <h3 className="usage-detail-section-title">Notes</h3>
      {editing ? (
        <textarea
          name="notes"
          value={editForm?.notes || ''}
          onChange={handleInputChange}
          className="form-input w-full h-32"
          placeholder="Add notes about this usage..."
          disabled={loading}
        />
      ) : (
        <div className="usage-detail-notes">
          {selectedLog?.notes ? (
            selectedLog.notes
          ) : (
            <span className="usage-detail-notes-empty">No notes provided</span>
          )}
        </div>
      )}
    </div>
  );

  // Main render
  if (!selectedLog || !editForm) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading log details...</p>
      </div>
    );
  }

  return (
    <div>
      {renderHeader()}
      {renderError()}
      
      <div className="detail-container">
        <div className="detail-grid">
          <div>
            {renderLogProperties()}
            {renderChemicalsList()}
            {renderEquipmentList()}
          </div>
          
          <div>
            {renderNotes()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogUsageDetailView;