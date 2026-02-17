import React, { useState } from 'react';
import { User } from '../../types';
import './Modal.css';

interface SelectSchoolForPartnershipModalProps {
  onClose: () => void;
  onSelectSchool: (schoolId: number, schoolName: string) => void;
  user: User;
  targetOrganizationName: string;
}

const SelectSchoolForPartnershipModal: React.FC<SelectSchoolForPartnershipModalProps> = ({
  onClose,
  onSelectSchool,
  user,
  targetOrganizationName,
}) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);

  // Établissements du contexte : ceux qui ont un role (ou tous si pas de champ status)
  const availableSchools = user?.available_contexts?.schools?.filter(
    (school: any) => school.role && (school.status === undefined || school.status === 'confirmed')
  ) || [];

  const handleSubmit = () => {
    if (selectedSchoolId) {
      const selectedSchool = availableSchools.find((s: any) => s.id === selectedSchoolId);
      if (selectedSchool) {
        onSelectSchool(selectedSchool.id, selectedSchool.name);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Sélectionner un établissement</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
            Pour quel établissement souhaitez-vous créer une demande de partenariat avec <strong>{targetOrganizationName}</strong> ?
          </p>

          {availableSchools.length === 0 ? (
            <div className="empty-message" style={{ padding: '2rem', textAlign: 'center' }}>
              <i className="fas fa-info-circle" style={{ fontSize: '2rem', color: '#9ca3af', marginBottom: '1rem' }}></i>
              <p>Aucun établissement disponible. Vous devez être membre confirmé d'au moins un établissement pour créer une demande de partenariat.</p>
            </div>
          ) : (
            <div className="form-group">
              <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>
                Établissement *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {availableSchools.map((school: any) => (
                  <label
                    key={school.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      border: selectedSchoolId === school.id ? '2px solid #3b82f6' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: selectedSchoolId === school.id ? '#eff6ff' : 'white',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setSelectedSchoolId(school.id)}
                  >
                    <input
                      type="radio"
                      name="school"
                      value={school.id}
                      checked={selectedSchoolId === school.id}
                      onChange={() => setSelectedSchoolId(school.id)}
                      style={{ marginRight: '0.75rem' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>{school.name}</div>
                      {school.city && (
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          {school.city} {school.zip_code ? `(${school.zip_code})` : ''}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          {availableSchools.length > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!selectedSchoolId}
            >
              Continuer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectSchoolForPartnershipModal;
