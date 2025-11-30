import React, { useState } from 'react';
import './Modal.css';

interface Organization {
  id: string;
  name: string;
  type: 'sub-organization' | 'partner' | 'schools' | 'companies';
  description: string;
  members_count: number;
  location: string;
  website?: string;
  logo?: string;
  status: 'active' | 'pending' | 'inactive';
  joinedDate: string;
  contactPerson: string;
  email: string;
}

interface JoinOrganizationModalProps {
  onClose: () => void;
  onSave: (message: string) => void;
  initialOrganization?: Organization | null;
  organizationType: 'school' | 'company';
}

const JoinOrganizationModal: React.FC<JoinOrganizationModalProps> = ({ 
  onClose, 
  onSave, 
  initialOrganization, 
  organizationType 
}) => {
  const [message, setMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSave(message);
    }
  };

  const organizationTypeLabel = organizationType === 'school' ? 'établissement scolaire' : 'organisation';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Rejoindre {organizationType === 'school' ? 'un établissement' : 'une organisation'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="flex flex-col gap-2 form-section">
            <h3>Demande de rattachement</h3>
            {initialOrganization && (
              <div style={{ marginBottom: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#6b7280' }}>
                  {organizationType === 'school' ? 'Établissement' : 'Organisation'} :
                </h4>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>
                  {initialOrganization.name}
                </span>
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="message">Ajouter un message *</label>
              <textarea
                id="message"
                name="message"
                value={message}
                onChange={handleInputChange}
                required
                className="form-textarea"
                placeholder={`Expliquez pourquoi vous souhaitez rejoindre cet ${organizationTypeLabel}...`}
                rows={4}
              />
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" onClick={handleSubmit}>
            <i className="fas fa-paper-plane"></i>
            Envoyer la demande
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinOrganizationModal;

