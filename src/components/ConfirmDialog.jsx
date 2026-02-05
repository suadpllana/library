import React from 'react';
import { FaTriangleExclamation, FaCircleQuestion, FaCircleInfo } from 'react-icons/fa6';
import Modal from './Modal';
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
  const IconComponent = icons[type] || icons.warning;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small" className="confirm-dialog-modal">
      <div className={`confirm-icon-wrapper ${type}`}>
        <IconComponent className="confirm-icon" />
      </div>
      
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
    </Modal>
  );
};

export default ConfirmDialog;
