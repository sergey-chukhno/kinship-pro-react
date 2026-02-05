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

interface PartnershipModalProps {
  onClose: () => void;
  onSave: (partnershipData: any) => void;
  initialOrganization?: Organization | null;
  organizationType?: 'school' | 'company';
}

const PARTNERSHIP_TYPE_ADMINISTRATIF = 'Partenariat administratif';

const PartnershipModal: React.FC<PartnershipModalProps> = ({ onClose, onSave, initialOrganization, organizationType }) => {
  const [formData, setFormData] = useState({
    partnershipType: PARTNERSHIP_TYPE_ADMINISTRATIF,
    description: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.description.trim()) {
      onSave({ description: formData.description.trim(), partnershipType: formData.partnershipType });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Proposer un partenariat</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="flex flex-col gap-2 form-section">
            <h3>Détails du partenariat</h3>
            {initialOrganization && (
              <h4 className="">Avec : <span className="text-sm font-bold">{initialOrganization.name}</span></h4>
            )}
            
            <div className="form-group">
              <label htmlFor="partnershipType">Type de partenariat *</label>
              <select
                id="partnershipType"
                name="partnershipType"
                value={formData.partnershipType}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value={PARTNERSHIP_TYPE_ADMINISTRATIF}>{PARTNERSHIP_TYPE_ADMINISTRATIF}</option>
              </select>
              <p style={{ marginTop: '6px', fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.4 }}>
                Le partenariat administratif permet de rendre visibles les administrateurs et superadministrateurs des organisations partenaires dans «&nbsp;Membres de mon réseau&nbsp;» une fois le partenariat confirmé.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="description">Ajouter un message *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                className="form-textarea"
                placeholder="Précisez le ou les projets concernés, ou le type de collaboration envisagée dans le cadre de Kinship."
                rows={3}
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
            Envoyer la proposition
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnershipModal;
