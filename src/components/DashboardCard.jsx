import React from 'react';
import { sortChemicalsByUrgency } from '../utils/helpers'; // Adjust import path as needed

const DashboardCard = ({ 
  title, 
  items = [], 
  count, 
  badgeType = '', 
  loading = false, 
  renderItem,
  sortByUrgency = false // New prop to enable urgency sorting
}) => {
  // Sort items by urgency if enabled and items are chemicals
  const displayItems = sortByUrgency ? sortChemicalsByUrgency(items) : items;

  return (
    <div className="card">
      <div className="card-header">
        <h2>{title}</h2>
        <span className={`badge ${badgeType ? `badge-${badgeType}` : ''}`}>
          {count}
        </span>
      </div>
      <ul className="card-list">
        {loading ? (
          <li>Loading...</li>
        ) : displayItems.length === 0 ? (
          <li>No items to display</li>
        ) : (
          displayItems.map((item) => (
            <li key={item.id}>
              {renderItem(item)}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default DashboardCard;