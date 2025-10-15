import React, { useState } from 'react';
import './Modal.css';

interface ContactModalProps {
  email: string;
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ email, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Contacter le membre</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="contact-info">
            <div className="email-display">
              <div className="email-label">Adresse email :</div>
              <div className="email-value">{email}</div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className={`btn ${copied ? 'btn-success' : 'btn-outline'}`}
            onClick={handleCopyEmail}
          >
            <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
            {copied ? 'Copié !' : 'Copier'}
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
