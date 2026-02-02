import React from 'react';
import { Partnership } from '../../api/Projects';
import { User } from '../../types';
import './Modal.css';

interface PartnershipRequestDetailsModalProps {
  partnership: Partnership | null;
  partnerName: string;
  user: User;
  onClose: () => void;
  onAccept: (partnershipId: number) => void;
  onReject: (partnershipId: number) => void;
}

const PartnershipRequestDetailsModal: React.FC<PartnershipRequestDetailsModalProps> = ({
  partnership,
  partnerName,
  user,
  onClose,
  onAccept,
  onReject
}) => {
  if (!partnership) return null;

  // Check if current user is the initiator by checking all their organization/school IDs
  const isInitiator = (() => {
    if (!partnership.initiator_id || !partnership.initiator_type) {
      return false;
    }
    
    // Check all companies
    const companyIds = user.available_contexts?.companies?.map(c => c.id) || [];
    if (partnership.initiator_type === 'Company' && companyIds.includes(partnership.initiator_id)) {
      return true;
    }
    
    // Check all schools
    const schoolIds = user.available_contexts?.schools?.map(s => s.id) || [];
    if (partnership.initiator_type === 'School' && schoolIds.includes(partnership.initiator_id)) {
      return true;
    }
    
    return false;
  })();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getPartnershipTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'bilateral': 'Partenariat bilatéral',
      'educational': 'Partenariat éducatif',
      'technological': 'Partenariat technologique',
      'environmental': 'Partenariat environnemental',
      'social': 'Partenariat social',
      'cultural': 'Partenariat culturel'
    };
    return types[type] || type;
  };

  const handleAccept = () => {
    if (partnership) {
      onAccept(partnership.id);
      onClose();
    }
  };

  const handleReject = () => {
    if (partnership) {
      onReject(partnership.id);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Détails de la demande de partenariat</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="form-section">
            {/* <h3>Informations du partenariat</h3> */}
            
            {/* <div className="form-group">
              <label>Partenaire</label>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1f2937' }}>
                {partnerName}
              </div>
            </div> */}

            {partnership.name && (
              <div className="form-group">
                <label className="!font-bold !text-lg ">Nom du partenariat</label>
                <div style={{ fontSize: '1rem',  color: '#374151' }}>
                  {partnership.name}
                </div>
              </div>
            )}

            {partnership.partnership_kind && (
              <div className="form-group">
                <label>Type de partenariat</label>
                <div style={{ fontSize: '1rem', color: '#374151' }}>
                  {partnership.partnership_kind === 'administratif' ? 'Partenariat administratif' : partnership.partnership_kind}
                </div>
              </div>
            )}

            {partnership.description && (
              <div className="form-group">
                <label>Description</label>
                <div style={{ 
                  fontSize: '0.95rem', 
                  color: '#374151',
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6'
                }}>
                  {partnership.description}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Statut</label>
              <div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: '#fef3c7',
                  color: '#d97706'
                }}>
                  En attente
                </span>
              </div>
            </div>

            {/* <div className="form-group">
              <label>Date de création</label>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                {formatDate(partnership.created_at)}
              </div>
            </div> */}
{/* 
            <div className="form-section">
              <h4>Options de partage</h4>
              
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className={`fas ${partnership.share_members ? 'fa-check-circle' : 'fa-times-circle'}`}
                     style={{ color: partnership.share_members ? '#10b981' : '#ef4444' }}></i>
                  <span>Partager les membres</span>
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className={`fas ${partnership.share_projects ? 'fa-check-circle' : 'fa-times-circle'}`}
                     style={{ color: partnership.share_projects ? '#10b981' : '#ef4444' }}></i>
                  <span>Partager les projets</span>
                </div>
              </div>
            </div> */}

            {/* {partnership.partners && partnership.partners.length > 0 && (
              <div className="form-section">
                <h4>Informations des partenaires</h4>
                {partnership.partners.map((partner, index) => (
                  <div key={index} className="form-group" style={{
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{partner.name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Type: {partner.type} | Rôle: {partner.role_in_partnership} | Statut: {partner.member_status}
                    </div>
                  </div>
                ))}
              </div>
            )} */}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={onClose}
          >
            Fermer
          </button>
          {!isInitiator && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={handleReject}
                style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' }}
              >
                <i className="fas fa-times"></i>
                Rejeter
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleAccept}
              >
                <i className="fas fa-check"></i>
                Accepter
              </button>
            </div>
          )}
          {isInitiator && (
            <div style={{ padding: '12px', background: '#f3f4f6', borderRadius: '8px', color: '#6b7280', fontSize: '0.9rem' }}>
              <i className="fas fa-info-circle"></i> Votre demande de partenariat a été envoyée
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnershipRequestDetailsModal;

