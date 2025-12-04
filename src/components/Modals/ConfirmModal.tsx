import React from 'react';
import './Modal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  onConfirm,
  onCancel,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'fas fa-exclamation-triangle',
      iconColor: '#ef4444',
      confirmButton: 'btn-danger'
    },
    warning: {
      icon: 'fas fa-exclamation-circle',
      iconColor: '#f59e0b',
      confirmButton: 'btn-warning'
    },
    info: {
      icon: 'fas fa-info-circle',
      iconColor: '#3b82f6',
      confirmButton: 'btn-primary'
    }
  };

  const style = variantStyles[variant];

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: `${style.iconColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: style.iconColor
            }}>
              <i className={style.icon}></i>
            </div>
            <h2 style={{ margin: 0 }}>{title}</h2>
          </div>
          <button className="modal-close" onClick={onCancel}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <p style={{ 
            fontSize: '1rem', 
            color: '#6b7280',
            lineHeight: '1.6',
            margin: 0,
            whiteSpace: 'pre-line'
          }}>
            {message}
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className={`btn ${style.confirmButton}`} 
            onClick={onConfirm}
            style={{
              background: variant === 'danger' 
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : variant === 'warning'
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: '#fff',
              border: 'none'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

