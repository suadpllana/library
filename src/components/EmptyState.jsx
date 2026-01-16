import React from 'react';
import { FaBook, FaBookmark, FaMagnifyingGlass, FaStar, FaClockRotateLeft, FaNoteSticky, FaBell, FaUsers, FaChartBar } from 'react-icons/fa6';
import './EmptyState.css';

const icons = {
  books: FaBook,
  wishlist: FaBookmark,
  search: FaMagnifyingGlass,
  reviews: FaStar,
  history: FaClockRotateLeft,
  notes: FaNoteSticky,
  notifications: FaBell,
  users: FaUsers,
  stats: FaChartBar,
  default: FaBook
};

const EmptyState = ({ 
  icon = 'default',
  title = 'Nothing here yet',
  description = 'Get started by adding some items.',
  action,
  actionLabel = 'Get Started'
}) => {
  const IconComponent = icons[icon] || icons.default;

  return (
    <div className="empty-state">
      <div className="empty-icon-wrapper">
        <IconComponent className="empty-icon" />
        <div className="empty-icon-bg"></div>
      </div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-description">{description}</p>
      {action && (
        <button className="empty-action" onClick={action}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
