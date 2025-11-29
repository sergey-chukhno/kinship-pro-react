import React from 'react';
import './OrganizationCard.css';

interface Organization {
  id: string;
  name: string;
  type: 'sub-organization' | 'partner' | 'schools' | 'companies';
  description: string;
  members: number;
  location: string;
  website?: string;
  logo?: string;
  status: 'active' | 'pending' | 'inactive';
  joinedDate: string;
  contactPerson: string;
  email: string;
}

interface OrganizationCardProps {
  organization: Organization;
  onEdit: () => void;
  onDelete: () => void;
  onAttach?: () => void;
  onPartnership?: () => void;
  isPersonalUser?: boolean;
}

const OrganizationCard: React.FC<OrganizationCardProps> = ({ organization, onEdit, onDelete, onAttach, onPartnership, isPersonalUser = false }) => {
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
    <div className="organization-card">
      <div className="organization-header">
        <div className="organization-logo">
          {organization.logo ? (
            <img src={organization.logo} alt={organization.name} />
          ) : (
            <div className="logo-placeholder">
              <i className="fas fa-building"></i>
            </div>
          )}
        </div>
        <div className="organization-info">
          <h3 className="organization-name">{organization.name}</h3>
          <div className="organization-meta">
            <span className="organization-type">{getTypeLabel(organization.type)}</span>
            <span 
              className="whitespace-nowrap organization-status" 
              style={{ color: getStatusColor(organization.status) }}
            >
              {getStatusLabel(organization.status)}
            </span>
          </div>
        </div>
        {
          organization.type !== 'schools' && (
            <>
            <div className="organization-actions">
              <button 
                className="btn-icon" 
                title="Modifier"
                onClick={onEdit}
              >
                <i className="fas fa-edit"></i>
              </button>
            </div>
      
        <div className="organization-actions">
          <button 
            className="btn-icon" 
            title="Modifier"
            onClick={onEdit}
          >
            <i className="fas fa-edit"></i>
          </button>
          <button 
            className="btn-icon" 
            title="Supprimer"
            onClick={onDelete}
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
        </>
            )
          }
      </div>

      <div className="organization-content">
        <p className="organization-description">{organization.description}</p>
        
        <div className="organization-details">
          <div className="detail-item">
            <i className="fas fa-map-marker-alt"></i>
            <span>{organization.location}</span>
          </div>
          <div className="detail-item">
            <i className="fas fa-users"></i>
            <span>{organization.members} membres</span>
          </div>
          {organization.joinedDate && (
          <div className="detail-item">
            <i className="fas fa-calendar"></i>
            <span>Rejoint le {formatDate(organization.joinedDate)}</span>
          </div>)}
          {organization.website && (
            <div className="detail-item">
              <i className="fas fa-globe"></i>
              <a href={organization.website} target="_blank" rel="noopener noreferrer">
                {organization.website}
              </a>
            </div>
          )}
        </div>
        {(organization.contactPerson || organization.email) && (
          <div className="organization-contact">
            {organization.contactPerson && (
              <div className="contact-person">
                <i className="fas fa-user"></i>
                <span>{organization.contactPerson}</span>
              </div>
            )}
            {organization.email && (
              <div className="contact-email">
                <i className="fas fa-envelope"></i>
                <a href={`mailto:${organization.email}`}>{organization.email}</a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email overlay on hover */}
      {organization.email && (
        <div className="organization-email-overlay">
          <a 
            href={`mailto:${organization.email}`}
            className="email-overlay-link"
            onClick={(e) => e.stopPropagation()}
            title={`Envoyer un email à ${organization.email}`}
          >
            <i className="fas fa-envelope"></i>
            <span>{organization.email}</span>
          </a>
        </div>
      )}

      {/* Hover Actions - Se rattacher et Demander un partenariat */}
      {(onAttach || onPartnership) && (
        <div className="organization-hover-actions">
          {onAttach && (
            <button 
              className="btn-hover-action btn-attach" 
              onClick={(e) => {
                e.stopPropagation();
                onAttach();
              }}
              title="Se rattacher"
            >
              <i className="fas fa-link"></i>
              <span>Se rattacher</span>
            </button>
          )}
          {onPartnership && (
            <button 
              className="btn-hover-action btn-partnership" 
              onClick={(e) => {
                e.stopPropagation();
                onPartnership();
              }}
              title={isPersonalUser ? "Rejoindre la communauté" : "Proposer un partenariat"}
            >
              <i className="fas fa-handshake"></i>
              <span>{isPersonalUser ? "Rejoindre la communauté" : "partenariat"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizationCard;
