// src/components/VerificationPending.jsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Clock, Shield } from 'lucide-react';

const VerificationPending = () => {
  const { user, logout } = useAuth();

  return (
    <div className="verification-pending-container">
      <div className="verification-card">
        <div className="verification-icon-container">
          <Shield className="verification-icon" size={48} />
        </div>
        
        <h1 className="verification-title">
          Account Pending Verification
        </h1>
        
        <div className="verification-user-info">
          <p className="verification-greeting">
            Hello, <span className="verification-email">{user?.email}</span>
          </p>
          <p className="verification-message">
            Your account is currently being reviewed by our administrators.
          </p>
        </div>
        
        <div className="verification-status-box">
          <div className="verification-status-icon">
            <Clock size={20} />
          </div>
          <div className="verification-status-text">
            <p className="verification-status-title">Verification in Progress</p>
            <p className="verification-status-description">
              You will receive access to the system once an administrator approves your account. 
              This process typically takes 24-48 hours.
            </p>
          </div>
        </div>
        
        <div className="verification-actions">
          <button
            onClick={logout}
            className="verification-logout-button"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
          
          <p className="verification-help-text">
            Need help? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerificationPending;