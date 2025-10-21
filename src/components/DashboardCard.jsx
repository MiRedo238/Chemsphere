import React from 'react';

const DashboardCard = ({ title, items = [], count, badgeType = '', loading = false, renderItem }) => {
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
        ) : items.length === 0 ? (
          <li>No items to display</li>
        ) : (
          items.map((item) => (
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