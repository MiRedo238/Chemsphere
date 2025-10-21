// src/components/LogChemicalUsage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { ChevronLeft, FlaskConical, User, Calendar, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import Autocomplete from './Autocomplete';
import { logChemicalUsage, getChemicalUsageLogs, updateChemicalUsageLog, deleteChemicalUsageLog } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

import { DatabaseContext } from '../contexts/DatabaseContext';

const LogChemicalUsage = ({ 
  setCurrentView, 
  addAuditLog, 
  userRole,
  currentUser,
  refreshData
}) => {
  const { chemicals } = useContext(DatabaseContext);
  const [selectedChemicals, setSelectedChemicals] = useState([]);
  const [user, setUser] = useState(currentUser?.name || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('log');
  const [editingLog, setEditingLog] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [userLogs, setUserLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user: authUser } = useAuth();

  const allUsers = [...new Set([
    ...chemicals.flatMap(c => c.usage_log ? c.usage_log.map(u => u.user_name) : [])
  ])].map(user => ({ user }));

  useEffect(() => {
    if (activeTab === 'edit' && authUser) {
      fetchUserLogs();
    }
  }, [activeTab, authUser]);

  const fetchUserLogs = async () => {
    try {
      setLoading(true);
      const chemicalLogs = await getChemicalUsageLogs(authUser.id);
      const formattedLogs = chemicalLogs.map(log => ({
        ...log,
        id: log.id,
        type: 'chemical',
        itemName: log.chemical_name,
        itemId: log.chemical_id
      })).sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setUserLogs(formattedLogs);
    } catch (error) {
      console.error('Error fetching user logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const addChemicalUsage = () => {
    setSelectedChemicals([...selectedChemicals, { 
      chemicalId: '', 
      quantity: '', 
      opened: false, 
      remainingAmount: '' 
    }]);
  };

  const removeChemicalUsage = (index) => {
    setSelectedChemicals(selectedChemicals.filter((_, i) => i !== index));
  };

  const updateChemicalUsage = (index, field, value) => {
    const updated = [...selectedChemicals];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedChemicals(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user || selectedChemicals.length === 0) return;

    try {
      setLoading(true);
      for (const chemUsage of selectedChemicals) {
        if (chemUsage.chemicalId && chemUsage.quantity) {
          const chemicalData = {
            chemical_id: parseInt(chemUsage.chemicalId),
            user_id: authUser?.id || null,
            user_name: user,
            date,
            quantity: parseInt(chemUsage.quantity),
            notes: notes || null,
            opened: chemUsage.opened || false,
            remaining_amount: chemUsage.opened && chemUsage.remainingAmount ? 
              parseFloat(chemUsage.remainingAmount) : null
          };

          const cleanData = {};
          Object.keys(chemicalData).forEach(key => {
            const value = chemicalData[key];
            cleanData[key] = (value === undefined || value === '') ? null : value;
          });

          await logChemicalUsage(cleanData);
          
          addAuditLog({
            type: 'chemical',
            action: 'usage',
            itemName: chemicals.find(c => c.id === parseInt(chemUsage.chemicalId))?.name,
            user: userRole,
            timestamp: new Date().toISOString(),
            details: {
              quantity: parseInt(chemUsage.quantity),
              user,
              opened: chemUsage.opened,
              remainingAmount: chemUsage.remainingAmount
            }
          });
        }
      }

      await refreshData();
      // Reset form but stay on current tab
      setSelectedChemicals([]);
      setUser(currentUser?.name || '');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    } catch (error) {
      console.error('Error logging usage:', error);
      alert('Failed to log usage. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (log) => {
    setEditingLog(log.id);
    setEditForm({
      quantity: log.quantity || '',
      notes: log.notes || '',
      opened: log.opened || false,
      remaining_amount: log.remaining_amount || ''
    });
  };

  const cancelEditing = () => {
    setEditingLog(null);
    setEditForm({});
  };

  const saveEdit = async (log) => {
    try {
      setLoading(true);
      const updateData = {
        quantity: parseInt(editForm.quantity),
        notes: editForm.notes || null,
        opened: editForm.opened || false,
        remaining_amount: editForm.opened && editForm.remaining_amount ? 
          parseFloat(editForm.remaining_amount) : null
      };

      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === '') {
          updateData[key] = null;
        }
      });

      await updateChemicalUsageLog(log.id, updateData);

      addAuditLog({
        type: 'chemical',
        action: 'update',
        itemName: log.itemName,
        user: userRole,
        timestamp: new Date().toISOString(),
        details: {
          quantity: parseInt(editForm.quantity),
          opened: editForm.opened,
          remaining_amount: editForm.remaining_amount
        }
      });

      await refreshData();
      await fetchUserLogs();

      // Stay on "My Logs" tab after saving
      setEditingLog(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating log:', error);
      alert('Failed to update log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteLog = async (log) => {
    if (!window.confirm('Are you sure you want to delete this log entry?')) return;

    try {
      setLoading(true);
      await deleteChemicalUsageLog(log.id);
      addAuditLog({
        type: 'chemical',
        action: 'delete',
        itemName: log.itemName,
        user: userRole,
        timestamp: new Date().toISOString(),
        details: {
          quantity: log.quantity,
          date: log.date
        }
      });
      await refreshData();
      await fetchUserLogs();
    } catch (error) {
      console.error('Error deleting log:', error);
      alert('Failed to delete log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="detail-header">
        <h1 className="detail-title">
          <FlaskConical className="inline mr-2" />
          Log Chemical Usage
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-6 py-3 font-medium ${activeTab === 'log' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('log')}
          disabled={loading}
        >
          New Log Entry
        </button>
        <button
          className={`px-6 py-3 font-medium ${activeTab === 'edit' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('edit')}
          disabled={loading}
        >
          My Logs
        </button>
      </div>

      {activeTab === 'log' && (
        <div className="usage-form">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-4">Basic Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    <User className="inline mr-1" size={16} />
                    User
                  </label>
                  <Autocomplete
                    value={user}
                    onChange={setUser}
                    suggestions={allUsers}
                    placeholder="Enter user name"
                    onSelect={(item) => setUser(item.user)}
                    field="user"
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <Calendar className="inline mr-1" size={16} />
                    Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Chemical Usage */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center">
                  <FlaskConical className="mr-2" size={20} />
                  Chemical Usage
                </h3>
                <button
                  type="button"
                  onClick={addChemicalUsage}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                  disabled={loading}
                >
                  <Plus size={16} className="mr-1" />
                  Add Chemical
                </button>
              </div>
              {selectedChemicals.map((chemUsage, index) => (
                <div key={index} className="p-4 bg-white rounded border mb-4">
                  <div className="flex items-end gap-4 mb-4">
                    <div className="flex-1">
                      <label className="form-label">Chemical</label>
                      <select
                        className="form-select"
                        value={chemUsage.chemicalId}
                        onChange={(e) => updateChemicalUsage(index, 'chemicalId', e.target.value)}
                        required
                        disabled={loading}
                      >
                        <option value="">Select chemical</option>
                        {chemicals.filter(c => c.current_quantity > 0).map(chem => (
                          <option key={chem.id} value={chem.id}>
                            {chem.name} - {chem.batch_number} ({chem.current_quantity} available)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <label className="form-label">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        max={chemUsage.chemicalId ? chemicals.find(c => c.id === parseInt(chemUsage.chemicalId))?.current_quantity : undefined}
                        className="form-input"
                        value={chemUsage.quantity}
                        onChange={(e) => updateChemicalUsage(index, 'quantity', e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeChemicalUsage(index)}
                      className="text-red-600 hover:text-red-800 p-2"
                      disabled={loading}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {/* Liquid chemical remaining amount */}
                  {chemUsage.chemicalId && (() => {
                    const selectedChem = chemicals.find(c => c.id === parseInt(chemUsage.chemicalId));
                    return selectedChem && selectedChem.type === 'liquid' ? (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-4 mb-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={chemUsage.opened || false}
                              onChange={(e) => updateChemicalUsage(index, 'opened', e.target.checked)}
                              disabled={loading}
                            />
                            <span className="text-sm">Container opened</span>
                          </label>
                        </div>
                        
                        {chemUsage.opened && (
                          <div className="ml-6">
                            <label className="form-label">Remaining amount</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="form-input w-32"
                                value={chemUsage.remainingAmount}
                                onChange={(e) => updateChemicalUsage(index, 'remainingAmount', e.target.value)}
                                placeholder="0.0"
                                disabled={loading}
                              />
                              <span className="text-sm text-gray-500">mL</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              ))}
            </div>

            {/* General Notes */}
            <div className="form-group">
              <label className="form-label">General Notes</label>
              <textarea
                className="form-input"
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="General notes about this usage session..."
                disabled={loading}
              />
            </div>

            <div className="flex justify-center pt-4">
              <button
                type="submit"
                className="form-button"
                disabled={!user || selectedChemicals.length === 0 || loading}
              >
                {loading ? 'Logging...' : 'Log Usage'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">My Usage Logs</h3>
          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading logs...</p>
          ) : userLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No usage logs found</p>
          ) : (
            userLogs.map((log) => (
              <div key={log.id} className="bg-white border rounded-lg p-4">
                {editingLog === log.id ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{log.itemName}</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(log)}
                          className="text-green-600 hover:text-green-800"
                          disabled={loading}
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-800"
                          disabled={loading}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label">Quantity</label>
                        <input
                          type="number"
                          className="form-input"
                          value={editForm.quantity}
                          onChange={(e) => setEditForm({...editForm, quantity: e.target.value})}
                          disabled={loading}
                        />
                      </div>
                      <div className="form-group">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={editForm.opened || false}
                            onChange={(e) => setEditForm({...editForm, opened: e.target.checked})}
                            disabled={loading}
                          />
                          Container opened
                        </label>
                        {editForm.opened && (
                          <div className="mt-2">
                            <label className="form-label">Remaining amount</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.1"
                                className="form-input w-32"
                                placeholder="0.0"
                                value={editForm.remaining_amount}
                                onChange={(e) => setEditForm({...editForm, remaining_amount: e.target.value})}
                                disabled={loading}
                              />
                              <span className="text-sm text-gray-500">mL</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-input"
                        rows="2"
                        value={editForm.notes}
                        onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                        disabled={loading}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center">
                        <FlaskConical className="mr-2" size={16} />
                        {log.itemName}
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(log)}
                          className="text-blue-600 hover:text-blue-800"
                          disabled={loading}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteLog(log)}
                          className="text-red-600 hover:text-red-800"
                          disabled={loading}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Date:</strong> {log.date}</p>
                      <p><strong>Quantity:</strong> {log.quantity}</p>
                      {log.opened && (
                        <p>
                          <strong>Container Opened:</strong> Yes 
                          {log.remaining_amount && ` (${log.remaining_amount} mL remaining)`} {/* mL label added */}
                        </p>
                      )}
                      {log.notes && <p><strong>Notes:</strong> {log.notes}</p>}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default LogChemicalUsage;
