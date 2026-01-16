import React from 'react';
import { FaTriangleExclamation, FaCircleQuestion, FaCircleInfo } from 'react-icons/fa6';
import './ConfirmDialog.css';

const icons = {
  warning: FaTriangleExclamation,
  question: FaCircleQuestion,
  info: FaCircleInfo
};

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'warning', // 'warning', 'question', 'info'
  dangerous = false
}) => {
  if (!isOpen) return null;

  const IconComponent = icons[type] || icons.warning;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="confirm-dialog-overlay" onClick={onClose}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className={`confirm-icon-wrapper ${type}`}>
          <IconComponent className="confirm-icon" />
        </div>
        
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        
        <div className="confirm-actions">
          <button className="confirm-btn cancel" onClick={onClose}>
            {cancelLabel}
          </button>
          <button 
            className={`confirm-btn confirm ${dangerous ? 'dangerous' : ''}`}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
