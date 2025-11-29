import React from 'react';
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

interface OrganizationDetailsModalProps {
  organization: Organization | null;
  onClose: () => void;
  onAttach?: () => void;
  onPartnership?: () => void;
  isPersonalUser?: boolean;
}

const OrganizationDetailsModal: React.FC<OrganizationDetailsModalProps> = ({ organization, onClose, onAttach, onPartnership, isPersonalUser = false }) => {
  if (!organization) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'inactive': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'pending': return 'En attente';
      case 'inactive': return 'Inactif';
      default: return 'Inconnu';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sub-organization': return 'Sous-organisation';
      case 'partner': return 'Partenaire';
      case 'schools': return 'Établissement scolaire';
      case 'companies': return 'Organisation';
      default: return 'Organisation';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            {organization.logo ? (
              <img 
                src={organization.logo} 
                alt={organization.name}
                style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '8px', 
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                fontSize: '24px'
              }}>
                <i className="fas fa-building"></i>
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, marginBottom: '4px' }}>{organization.name}</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ 
                  fontSize: '0.875rem', 
                  color: '#6b7280',
                  background: '#f3f4f6',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  {getTypeLabel(organization.type)}
                </span>
                <span 
                  style={{ 
                    fontSize: '0.875rem',
                    color: getStatusColor(organization.status),
                    fontWeight: 500
                  }}
                >
                  {getStatusLabel(organization.status)}
                </span>
              </div>
            </div>
          </div>
          <button 
            className="modal-close-btn"
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px 8px'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {organization.description && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: '#111827' }}>
                Description
              </h3>
              <p style={{ margin: 0, color: '#6b7280', lineHeight: 1.6 }}>
                {organization.description}
              </p>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: '#111827' }}>
              Informations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className="fas fa-map-marker-alt" style={{ color: 'var(--primary)', width: '20px' }}></i>
                <span style={{ color: '#374151' }}>{organization.location}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className="fas fa-users" style={{ color: 'var(--primary)', width: '20px' }}></i>
                <span style={{ color: '#374151' }}>{organization.members_count} membres</span>
              </div>
              {organization.joinedDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="fas fa-calendar" style={{ color: 'var(--primary)', width: '20px' }}></i>
                  <span style={{ color: '#374151' }}>Rejoint le {formatDate(organization.joinedDate)}</span>
                </div>
              )}
              {organization.website && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="fas fa-globe" style={{ color: 'var(--primary)', width: '20px' }}></i>
                  <a 
                    href={organization.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'none' }}
                  >
                    {organization.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {(organization.contactPerson || organization.email) && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: '#111827' }}>
                Contact
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {organization.contactPerson && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i className="fas fa-user" style={{ color: 'var(--primary)', width: '20px' }}></i>
                    <span style={{ color: '#374151' }}>{organization.contactPerson}</span>
                  </div>
                )}
                {organization.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i className="fas fa-envelope" style={{ color: 'var(--primary)', width: '20px' }}></i>
                    <a 
                      href={`mailto:${organization.email}`}
                      style={{ color: 'var(--primary)', textDecoration: 'none' }}
                    >
                      {organization.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {(onAttach || onPartnership) && (
            <>
              {onAttach && (
                <button
                  onClick={() => {
                    onAttach();
                    onClose();
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--primary)';
                  }}
                >
                  <i className="fas fa-link"></i>
                  <span>Se rattacher</span>
                </button>
              )}
              {onPartnership && (
                <button
                  onClick={() => {
                    onPartnership();
                    onClose();
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: '#ffffff',
                    color: 'var(--primary)',
                    border: '1.5px solid var(--primary)',
                    borderRadius: '8px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(85, 112, 241, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  <i className="fas fa-handshake"></i>
                  <span>{isPersonalUser ? "Rejoindre la communauté" : "Proposer un partenariat"}</span>
                </button>
              )}
            </>
          )}
          {organization.email && (
            <a
              href={`mailto:${organization.email}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'var(--primary)',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--primary)';
              }}
            >
              <i className="fas fa-envelope"></i>
              <span>Envoyer un email</span>
            </a>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationDetailsModal;

