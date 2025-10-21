
import React, { useState, useEffect, useContext } from 'react';
import DashboardCard from './DashboardCard';
import ActionButtons from './ActionButtons';
import { DatabaseContext } from '../contexts/DatabaseContext';

const Dashboard = ({ addAuditLog, userRole, refreshData }) => {
  const { chemicals, equipment, setChemicals, setEquipment } = useContext(DatabaseContext);
  const [dashboardData, setDashboardData] = useState({
    nearExpiration: [],
    lowStock: [],
    expired: [],
    outOfStock: []
  });

  useEffect(() => {
    calculateDashboardData();
  }, [chemicals]);

  const calculateDashboardData = () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const nearExpiration = chemicals.filter(chem => {
      if (!chem.expiration_date) return false;
      const expDate = new Date(chem.expiration_date);
      return expDate > now && expDate <= thirtyDaysFromNow;
    });

    const lowStock = chemicals.filter(chem => 
      chem.current_quantity > 0 && chem.current_quantity <= 5
    );

    const expired = chemicals.filter(chem => {
      if (!chem.expiration_date) return false;
      return new Date(chem.expiration_date) <= now;
    });

    const outOfStock = chemicals.filter(chem => 
      chem.current_quantity === 0
    );

    setDashboardData({
      nearExpiration,
      lowStock,
      expired,
      outOfStock
    });
  };

  const handleAddChemical = (newChemical) => {
    // Optionally update chemicals state here if needed
    if (refreshData) {
      refreshData();
    }
  };

  const handleAddEquipment = (newEquipment) => {
    // Optionally update equipment state here if needed
    if (refreshData) {
      refreshData();
    }
  };

  return (
    <>
      <ActionButtons 
        onAddChemical={handleAddChemical}
        onAddEquipment={handleAddEquipment}
        chemicals={chemicals}
        equipment={equipment}
        updateChemicals={setChemicals}
        updateEquipment={setEquipment}
        addAuditLog={addAuditLog}
        userRole={userRole}
        refreshData={refreshData}
      />

      <div className="dashboard-grid">
        {/* Near Expiration Card */}
        <DashboardCard
          title="Near Expiration"
          count={dashboardData.nearExpiration.length}
          items={dashboardData.nearExpiration}
          renderItem={(item) => (
            <>
              <span>{item.name}</span>
              <span className="days">
                {Math.ceil((new Date(item.expiration_date) - new Date()) / (1000 * 60 * 60 * 24))} days
              </span>
            </>
          )}
        />

        {/* Low Stock Card */}
        <DashboardCard
          title="Low stock"
          count={dashboardData.lowStock.length}
          items={dashboardData.lowStock}
          renderItem={(item) => (
            <>
              <span>{item.name}</span>
              <span className="quantity">{item.current_quantity} left</span>
            </>
          )}
        />

        {/* Expired Card */}
        <DashboardCard
          title="Expired"
          count={dashboardData.expired.length}
          badgeType="warning"
          items={dashboardData.expired}
          renderItem={(item) => (
            <>
              <span>{item.name}</span>
              <span className="date">
                {new Date(item.expiration_date).toLocaleDateString()}
              </span>
            </>
          )}
        />

        {/* Out of Stock Card */}
        <DashboardCard
          title="Out of stock"
          count={dashboardData.outOfStock.length}
          badgeType="danger"
          items={dashboardData.outOfStock}
          renderItem={(item) => (
            <span>{item.name}</span>
          )}
        />
      </div>
    </>
  );
};

export default Dashboard;