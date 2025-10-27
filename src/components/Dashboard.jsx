
import React, { useState, useEffect, useContext } from 'react';
import DashboardCard from './DashboardCard';
import ActionButtons from './ActionButtons';
import { DatabaseContext } from '../contexts/DatabaseContext';

const Dashboard = ({ userRole, refreshData }) => {
  const { chemicals, equipment, setChemicals, setEquipment } = useContext(DatabaseContext);
  const [dashboardData, setDashboardData] = useState({
    nearExpiration: [],
    lowStock: [],
    expired: [],
    outOfStock: []
  });
  const { addAuditLog } = useContext(DatabaseContext);

  useEffect(() => {
    calculateDashboardData();
  }, [chemicals]);

  const calculateDashboardData = () => {
    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // 🔹 Near Expiration: within 90 days, soonest first
    const nearExpiration = chemicals
      .filter(chem => {
        if (!chem.expiration_date) return false;
        const expDate = new Date(chem.expiration_date);
        return expDate > now && expDate <= ninetyDaysFromNow;
      })
      .sort((a, b) => new Date(a.expiration_date) - new Date(b.expiration_date));

    // 🔹 Low Stock: ascending by quantity (least stock first)
    const lowStock = chemicals
      .filter(chem => chem.current_quantity > 0 && chem.current_quantity <= 5)
      .sort((a, b) => a.current_quantity - b.current_quantity);

    // 🔹 Expired: earliest expired first
    const expired = chemicals
      .filter(chem => {
        if (!chem.expiration_date) return false;
        const expirationDate = new Date(chem.expiration_date);
        const today = new Date();
        return expirationDate < today;
      })
      .sort((a, b) => new Date(a.expiration_date) - new Date(b.expiration_date));

    // 🔹 Out of Stock: alphabetical by chemical name
    const outOfStock = chemicals
      .filter(chem => chem.current_quantity === 0)
      .sort((a, b) => a.name.localeCompare(b.name));

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