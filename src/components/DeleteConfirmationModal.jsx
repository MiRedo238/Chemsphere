import React, { useState } from 'react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, user, loading }) => {
  const [step, setStep] = useState(1);
  const [confirmationText, setConfirmationText] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setConfirmationText('');
    setPassword('');
    onClose();
  };

  const handleConfirm = () => {
    if (step === 3) {
      onConfirm(password);
    } else {
      setStep(step + 1);
    }
  };

  const getStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Delete User Account
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              You are about to delete <strong>{user?.username}</strong>'s account. 
              This action will permanently remove all their data. Are you sure you want to continue?
            </p>
          </div>
        );
      
      case 2:
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
              <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Final Warning
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              This action <strong>cannot be undone</strong>. All user data, logs, and records associated with 
              <strong> {user?.username}</strong> will be permanently deleted.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Impact:</strong> Chemical usage logs, equipment assignments, and audit records will be removed.
              </p>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Confirm Your Identity
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              To confirm deletion of <strong>{user?.username}</strong>, type "DELETE {user?.username}" below and enter your password.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left mb-1">
                  Confirmation Text
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={`DELETE ${user?.username}`}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left mb-1">
                  Your Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const isStep3Valid = step === 3 ? 
    confirmationText === `DELETE ${user?.username}` && password.length > 0 : 
    true;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        {getStepContent()}
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isStep3Valid || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : 
             step === 3 ? 'Permanently Delete Account' : 
             step === 2 ? 'I Understand, Continue' : 'Continue'}
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <div className="flex justify-center space-x-1">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`w-2 h-2 rounded-full ${
                  num === step ? 'bg-red-600' : 
                  num < step ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Step {step} of 3</p>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
