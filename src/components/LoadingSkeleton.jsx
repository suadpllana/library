import React from 'react';
import './LoadingSkeleton.css';

export const CardSkeleton = ({ count = 6 }) => {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-image"></div>
          <div className="skeleton-content">
            <div className="skeleton-line long"></div>
            <div className="skeleton-line medium"></div>
            <div className="skeleton-line short"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ListSkeleton = ({ count = 5 }) => {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-list-item">
          <div className="skeleton-avatar"></div>
          <div className="skeleton-content">
            <div className="skeleton-line long"></div>
            <div className="skeleton-line medium"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton-header-cell"></div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div key={colIndex} className="skeleton-cell"></div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const ProfileSkeleton = () => {
  return (
    <div className="skeleton-profile">
      <div className="skeleton-avatar-large"></div>
      <div className="skeleton-content centered">
        <div className="skeleton-line long"></div>
        <div className="skeleton-line medium"></div>
        <div className="skeleton-stats">
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = ({ type = 'card', count = 6, rows, cols }) => {
  switch (type) {
    case 'list':
      return <ListSkeleton count={count} />;
    case 'table':
      return <TableSkeleton rows={rows || 5} cols={cols || 4} />;
    case 'profile':
      return <ProfileSkeleton />;
    case 'card':
    default:
      return <CardSkeleton count={count} />;
  }
};

export default LoadingSkeleton;
