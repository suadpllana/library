import React from 'react';
import { FaBook, FaBookmark, FaMagnifyingGlass, FaStar, FaClockRotateLeft, FaNoteSticky, FaBell, FaUsers, FaChartBar } from 'react-icons/fa6';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';
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
  title,
  description,
  action,
  actionLabel
}) => {
  const { language } = useLanguage();
  const t = translations[language];
  const resolvedTitle = title || t.nothingHereYet;
  const resolvedDescription = description || t.getStartedAdding;
  const resolvedActionLabel = actionLabel || t.getStarted;
  const IconComponent = icons[icon] || icons.default;

  return (
    <div className="empty-state">
      <div className="empty-icon-wrapper">
        <IconComponent className="empty-icon" />
        <div className="empty-icon-bg"></div>
      </div>
      <h3 className="empty-title">{resolvedTitle}</h3>
      <p className="empty-description">{resolvedDescription}</p>
      {action && (
        <button className="empty-action" onClick={action}>
          {resolvedActionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
