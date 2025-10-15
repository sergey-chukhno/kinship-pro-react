import React, { useState } from 'react';
import './Modal.css';

interface AttachOrganizationModalProps {
  onClose: () => void;
  onSave: (attachData: any) => void;
}

const AttachOrganizationModal: React.FC<AttachOrganizationModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: '',
    description: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    website: '',
    motivation: '',
    expectedBenefits: '',
    currentProjects: '',
    teamSize: '',
    experience: ''
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

  const organizationTypes = [
    'Établissement scolaire',
    'Association',
    'Entreprise',
    'Collectivité territoriale',
    'Organisme de formation',
    'Autre'
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Demander un rattachement</h2>
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
                <label htmlFor="organizationType">Type d'organisation *</label>
                <select
                  id="organizationType"
                  name="organizationType"
                  value={formData.organizationType}
                  onChange={handleInputChange}
                  required
                  className="form-select"
                >
                  <option value="">Sélectionner un type</option>
                  {organizationTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
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
            <h3>Adresse</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="address">Adresse</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Numéro et nom de rue"
                />
              </div>

              <div className="form-group">
                <label htmlFor="city">Ville</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Ville"
                />
              </div>

              <div className="form-group">
                <label htmlFor="postalCode">Code postal</label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="75001"
                />
              </div>

              <div className="form-group">
                <label htmlFor="country">Pays</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="France"
                />
              </div>
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

          <div className="form-section">
            <h3>Motivation et contexte</h3>
            <div className="form-group">
              <label htmlFor="motivation">Pourquoi souhaitez-vous rejoindre le réseau Kinship ?</label>
              <textarea
                id="motivation"
                name="motivation"
                value={formData.motivation}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="Expliquez votre motivation et vos attentes"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="expectedBenefits">Quels bénéfices attendez-vous ?</label>
              <textarea
                id="expectedBenefits"
                name="expectedBenefits"
                value={formData.expectedBenefits}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="Décrivez les bénéfices attendus"
                rows={3}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="currentProjects">Projets actuels</label>
                <input
                  type="text"
                  id="currentProjects"
                  name="currentProjects"
                  value={formData.currentProjects}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Décrivez vos projets en cours"
                />
              </div>

              <div className="form-group">
                <label htmlFor="teamSize">Taille de l'équipe</label>
                <input
                  type="text"
                  id="teamSize"
                  name="teamSize"
                  value={formData.teamSize}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Ex: 5-10 personnes"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="experience">Expérience dans le domaine</label>
              <textarea
                id="experience"
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="Décrivez votre expérience et expertise"
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
            Envoyer la demande
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttachOrganizationModal;
