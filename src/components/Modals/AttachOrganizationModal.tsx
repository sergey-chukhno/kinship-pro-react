import React, { useState, useEffect } from 'react';
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

interface AttachOrganizationModalProps {
  onClose: () => void;
  onSave: (attachData: any) => void;
  initialOrganization?: Organization | null;
}

const AttachOrganizationModal: React.FC<AttachOrganizationModalProps> = ({ onClose, onSave, initialOrganization }) => {
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

  // Pre-fill form when initialOrganization is provided
  useEffect(() => {
    if (initialOrganization) {
      const getOrganizationTypeLabel = (type: string) => {
        switch (type) {
          case 'schools': return 'Établissement scolaire';
          case 'companies': return 'Entreprise';
          default: return '';
        }
      };

      // Extract city and postal code from location if available
      const locationParts = initialOrganization.location ? initialOrganization.location.split(',') : [];
      const city = locationParts[0]?.trim() || '';
      const postalCode = locationParts[1]?.trim() || '';

      setFormData(prev => ({
        ...prev,
        organizationName: initialOrganization.name || '',
        organizationType: getOrganizationTypeLabel(initialOrganization.type) || '',
        description: initialOrganization.description || '',
        contactPerson: initialOrganization.contactPerson || '',
        email: initialOrganization.email || '',
        website: initialOrganization.website || '',
        city: city,
        postalCode: postalCode,
      }));
    }
  }, [initialOrganization]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.organizationName && formData.motivation) {
      onSave(formData);
    } else {
      alert('Veuillez remplir tous les champs obligatoires');
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
                {/* <input
                disabled={true}
                  type="text"
                  id="organizationName"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  required
                  className="form-select disabled:bg-gray-100"
                /> */}
                          <select
                   disabled={true}
                  id="organizationType"
                  name="organizationType"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  required
                  className="form-select disabled:bg-gray-100"
                >
                  <option value={formData.organizationName}>{formData.organizationName}</option>
                  
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="organizationType">Type d'organisation</label>
                <select
                   disabled={true}
                  id="organizationType"
                  name="organizationType"
                  value={formData.organizationType}
                  onChange={handleInputChange}
                  required
                  className="form-select disabled:bg-gray-100"
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


          </div>


          <div className="form-section">
            <h3>Motivation et contexte</h3>
            <div className="form-group">
              <label htmlFor="motivation">Pourquoi souhaitez-vous vous rattacher { initialOrganization?.type === 'schools' ? 'à l\' établissement' : 'à l\'organisation' } : <span className="font-bold">{initialOrganization?.name}</span> ?</label>
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

            {/* <div className="form-group">
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
            </div> */}

            {/* <div className="form-grid">
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
            </div> */}

            {/* <div className="form-group">
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
            </div> */}
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
