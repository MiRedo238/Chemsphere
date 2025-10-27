import React, { useState } from 'react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, user, loading }) => {
  const [step, setStep] = useState(1);
  const [confirmationText, setConfirmationText] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setConfirmationText('');
    onClose();
  };

  const handleConfirm = () => {
    if (step === 2) {
      onConfirm();
    } else {
      setStep(step + 1);
    }
  };

  const getStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="modal-step-content">
            <div className="modal-icon-container modal-icon-warning">
              <svg className="modal-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="modal-step-title">
              Delete User Account
            </h3>
            <p className="modal-step-description">
              You are about to delete <strong>{user?.username}</strong>'s account. 
              This action will permanently remove all their data. Are you sure you want to continue?
            </p>
          </div>
        );
      
      case 2:
        return (
          <div className="modal-step-content">
            <div className="modal-icon-container modal-icon-danger">
              <svg className="modal-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="modal-step-title">
              Final Confirmation
            </h3>
            <p className="modal-step-description">
              This action <strong>cannot be undone</strong>. All user data, logs, and records associated with 
              <strong> {user?.username}</strong> will be permanently deleted.
            </p>
            <div className="modal-warning-box">
              <p className="modal-warning-text">
                <strong>Impact:</strong> Chemical usage logs, equipment assignments, and audit records will be removed.
              </p>
            </div>
            
            <div className="modal-input-group">
              <label className="modal-input-label">
                Type "DELETE {user?.username}" to confirm
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={`DELETE ${user?.username}`}
                className="modal-input"
                autoFocus
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const isStep2Valid = step === 2 ? 
    confirmationText === `DELETE ${user?.username}` : 
    true;

  return (
    <div className="delete-modal-overlay">
      <div className="delete-modal-container">
        {getStepContent()}
        
        <div className="modal-actions">
          <button
            type="button"
            onClick={handleClose}
            className="modal-button modal-button-cancel"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isStep2Valid || loading}
            className="modal-button modal-button-danger"
          >
            {loading ? 'Deleting...' : 
             step === 2 ? 'Permanently Delete Account' : 
             'Continue'}
          </button>
        </div>
        
        <div className="modal-progress">
          <div className="modal-progress-dots">
            {[1, 2].map((num) => (
              <div
                key={num}
                className={`modal-progress-dot ${
                  num === step ? 'modal-progress-dot-active' : 
                  num < step ? 'modal-progress-dot-complete' : ''
                }`}
              />
            ))}
          </div>
          <p className="modal-progress-text">Step {step} of 2</p>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;