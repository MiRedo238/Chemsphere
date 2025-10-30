import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { auditService } from '../services/auditService';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('verified'); // 'verified' or 'pending'

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await userService.getAll();
      setUsers(data);
    } catch (err) {
      setError('Failed to load users: ' + err.message);
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      setActionLoading(`role-${userId}`);
      setError('');
      const updatedUser = await userService.updateRole(userId, newRole);
      
      // Update local state optimistically
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      await auditService.create({
        action: 'UPDATE_USER_ROLE',
        target: updatedUser.username,
        metadata: { userId, newRole }
      });
    } catch (err) {
      setError('Failed to update user role: ' + err.message);
      console.error('Update role error:', err);
      // Reload users to reset any optimistic updates
      await loadUsers();
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      setActionLoading(`status-${userId}`);
      setError('');
      const updatedUser = currentStatus ? 
        await userService.deactivate(userId) :
        await userService.activate(userId);
      
      // Update local state optimistically
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, active: !currentStatus } : user
      ));

      await auditService.create({
        action: currentStatus ? 'DEACTIVATE_USER' : 'ACTIVATE_USER',
        target: updatedUser.username,
        metadata: { userId }
      });
    } catch (err) {
      setError(`Failed to ${currentStatus ? 'deactivate' : 'activate'} user: ` + err.message);
      console.error('Toggle status error:', err);
      // Reload users to reset any optimistic updates
      await loadUsers();
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyUser = async (userId) => {
    try {
      setActionLoading(`verify-${userId}`);
      setError('');
      
      console.log('Verifying user:', userId);
      
      const result = await userService.update(userId, { verified: true });
      
      console.log('Verification response:', result);
      
      // Update local state optimistically
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, verified: true } : user
      ));

      // Get the username for audit log
      const userToVerify = users.find(u => u.id === userId);
      
      await auditService.create({
        action: 'VERIFY_USER',
        target: userToVerify?.username || 'Unknown User',
        metadata: { userId }
      });

      alert(`User ${userToVerify?.username} has been verified and can now access the system.`);
      
    } catch (err) {
      console.error('Verify user error:', err);
      setError('Failed to verify user: ' + err.message);
      
      // Reload users to reset any optimistic updates
      await loadUsers();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setActionLoading(`delete-${userToDelete.id}`);
      setError('');

      // Use permanent deletion instead of soft delete
      await userService.permanentDeleteUser(userToDelete.id);

      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userToDelete.id));

      await auditService.create({
        action: 'DELETE_USER',
        target: userToDelete.username,
        metadata: { userId: userToDelete.id }
      });

      setDeleteModalOpen(false);
      setUserToDelete(null);
      
      alert(`User ${userToDelete.username} has been permanently deleted.`);
    } catch (err) {
      setError('Failed to delete user: ' + err.message);
      console.error('Delete user error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter users based on verification status
  const verifiedUsers = users.filter(user => user.verified);
  const pendingUsers = users.filter(user => !user.verified);

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading users...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('verified')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'verified'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Verified Users ({verifiedUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Verification ({pendingUsers.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Verified Users Tab */}
      {activeTab === 'verified' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {verifiedUsers.map((user) => {
                return (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {user.username}
                        {user.marked_for_deletion && (
                          <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                            Pending Deletion
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                        className="border rounded p-1"
                        disabled={actionLoading === `role-${user.id}` || user.marked_for_deletion}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {user.active && (
                          <button
                            onClick={() => handleToggleUserStatus(user.id, user.active)}
                            disabled={actionLoading === `status-${user.id}` || user.marked_for_deletion}
                            className="bg-red-100 text-red-600 px-3 py-1 rounded text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                          >
                            {actionLoading === `status-${user.id}` ? 'Loading...' : 'Deactivate'}
                          </button>
                        )}
                        {!user.active && (
                          <button
                            onClick={() => handleToggleUserStatus(user.id, user.active)}
                            disabled={actionLoading === `status-${user.id}` || user.marked_for_deletion}
                            className="bg-green-100 text-green-600 px-3 py-1 rounded text-sm font-medium hover:bg-green-200 disabled:opacity-50"
                          >
                            {actionLoading === `status-${user.id}` ? 'Loading...' : 'Reactivate'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteClick(user)}
                          disabled={actionLoading === `delete-${user.id}` || user.marked_for_deletion}
                          className="bg-red-500 text-white p-2 rounded text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                          title="Delete User"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {verifiedUsers.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No verified users found.
            </div>
          )}
        </div>
      )}

      {/* Pending Verification Tab */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleVerifyUser(user.id)}
                        disabled={actionLoading === `verify-${user.id}`}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                      >
                        {actionLoading === `verify-${user.id}` ? 'Verifying...' : 'Verify User'}
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
                        disabled={actionLoading === `delete-${user.id}`}
                        className="bg-red-500 text-white p-2 rounded text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                        title="Delete User"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {pendingUsers.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No pending user verifications.
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        user={userToDelete}
        loading={actionLoading && actionLoading.startsWith('delete-')}
      />
    </div>
  );
};

export default UserManagement;