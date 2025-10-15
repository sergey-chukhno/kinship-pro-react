import React, { useState } from 'react';
import './Modal.css';

interface PartnershipModalProps {
  onClose: () => void;
  onSave: (partnershipData: any) => void;
}

const PartnershipModal: React.FC<PartnershipModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    organizationName: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    partnershipType: '',
    objectives: '',
    expectedDuration: '',
    resources: '',
    benefits: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.organizationName && formData.contactPerson && formData.email) {
      onSave(formData);
    }
  };

  const partnershipTypes = [
    'Partenariat éducatif',
    'Partenariat technologique',
    'Partenariat environnemental',
    'Partenariat social',
    'Partenariat culturel'
  ];

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
          <div className="form-section">
            <h3>Informations de l'organisation</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="organizationName">Nom de l'organisation *</label>
                <input
                  type="text"
                  id="organizationName"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="Nom de l'organisation"
                />
              </div>

              <div className="form-group">
                <label htmlFor="website">Site web</label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="https://exemple.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description de l'organisation</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="Décrivez l'organisation et ses activités"
                rows={3}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Contact</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="contactPerson">Personne de contact *</label>
                <input
                  type="text"
                  id="contactPerson"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="Nom et prénom"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="email@exemple.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Téléphone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Détails du partenariat</h3>
            <div className="form-group">
              <label htmlFor="partnershipType">Type de partenariat *</label>
              <select
                id="partnershipType"
                name="partnershipType"
                value={formData.partnershipType}
                onChange={handleInputChange}
                required
                className="form-select"
              >
                <option value="">Sélectionner un type</option>
                {partnershipTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="objectives">Objectifs du partenariat</label>
              <textarea
                id="objectives"
                name="objectives"
                value={formData.objectives}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="Décrivez les objectifs du partenariat"
                rows={3}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="expectedDuration">Durée prévue</label>
                <input
                  type="text"
                  id="expectedDuration"
                  name="expectedDuration"
                  value={formData.expectedDuration}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Ex: 6 mois, 1 an, etc."
                />
              </div>

              <div className="form-group">
                <label htmlFor="resources">Ressources disponibles</label>
                <input
                  type="text"
                  id="resources"
                  name="resources"
                  value={formData.resources}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Ex: personnel, équipements, financement"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="benefits">Bénéfices attendus</label>
              <textarea
                id="benefits"
                name="benefits"
                value={formData.benefits}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="Décrivez les bénéfices attendus pour les deux parties"
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
