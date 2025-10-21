import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from './Modal';
import AddChemical from './AddChemical';
import AddEquipment from './AddEquipment';

const ActionButtons = ({ 
  onAddChemical, 
  onAddEquipment, 
  chemicals, 
  equipment, 
  updateChemicals, 
  updateEquipment, 
  addAuditLog, 
  userRole,
  refreshData 
}) => {
  const [showChemicalModal, setShowChemicalModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);

  const handleChemicalAdded = (newChemical) => {
    if (updateChemicals) {
      updateChemicals([...chemicals, newChemical]);
    }
    if (onAddChemical) {
      onAddChemical(newChemical);
    }
    setShowChemicalModal(false);
  };

  const handleEquipmentAdded = (newEquipment) => {
    if (updateEquipment) {
      updateEquipment([...equipment, newEquipment]);
    }
    if (onAddEquipment) {
      onAddEquipment(newEquipment);
    }
    setShowEquipmentModal(false);
  };

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
          chemicals={chemicals}
          updateChemicals={handleChemicalAdded}
          addAuditLog={addAuditLog}
          userRole={userRole}
          isModal={true}
          onClose={() => setShowChemicalModal(false)}
          refreshData={refreshData}
        />
      </Modal>

      {/* Add Equipment Modal */}
      <Modal 
        isOpen={showEquipmentModal} 
        onClose={() => setShowEquipmentModal(false)}
        title="Add New Equipment"
      >
        <AddEquipment 
          equipment={equipment}
          updateEquipment={handleEquipmentAdded}
          addAuditLog={addAuditLog}
          userRole={userRole}
          isModal={true}
          onClose={() => setShowEquipmentModal(false)}
        />
      </Modal>
    </>
  );
};

export default ActionButtons;