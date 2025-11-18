import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from './Modal';
import AddChemical from './AddChemical';
import AddEquipment from './AddEquipment';

const ActionButtons = ({ userRole, loading, onCancel }) => {
  const [showChemicalModal, setShowChemicalModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);

  // If onCancel is provided, render form action buttons (used inside forms)
  if (typeof onCancel === 'function') {
    return (
      <div className="form-actions flex justify-end gap-2 pt-4">
        <button type="button" className="form-button bg-gray-500" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="form-button" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    );
  }

  return (
    <>
      <header className="top-bar">
        <button 
          className="add-btn" 
          onClick={() => setShowChemicalModal(true)}
          disabled={userRole !== 'admin'}
        >
          <Plus size={20} />
          Add Chemical
        </button>
        <button 
          className="add-btn" 
          onClick={() => setShowEquipmentModal(true)}
          disabled={userRole !== 'admin'}
        >
          <Plus size={20} />
          Add Equipment
        </button>
      </header>

      {/* Add Chemical Modal */}
      <Modal 
        isOpen={showChemicalModal} 
        onClose={() => setShowChemicalModal(false)}
        title="Add New Chemical"
      >
        <AddChemical 
          userRole={userRole}
          isModal={true}
          onClose={() => setShowChemicalModal(false)}
        />
      </Modal>

      {/* Add Equipment Modal */}
      <Modal 
        isOpen={showEquipmentModal} 
        onClose={() => setShowEquipmentModal(false)}
        title="Add New Equipment"
      >
        <AddEquipment 
          userRole={userRole}
          isModal={true}
          onClose={() => setShowEquipmentModal(false)}
        />
      </Modal>
    </>
  );
};

export default ActionButtons;