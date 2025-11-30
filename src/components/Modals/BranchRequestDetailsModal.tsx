import React from 'react';
import { BranchRequest } from '../../api/Projects';
import { User } from '../../types';
import './Modal.css';

interface BranchRequestDetailsModalProps {
  branchRequest: BranchRequest | null;
  user: User;
  onClose: () => void;
  onAccept: (requestId: number) => void;
  onReject: (requestId: number) => void;
  onDelete?: (requestId: number) => void;
}

const BranchRequestDetailsModal: React.FC<BranchRequestDetailsModalProps> = ({
  branchRequest,
  user,
  onClose,
  onAccept,
  onReject,
  onDelete
}) => {
  if (!branchRequest) return null;

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { background: '#fef3c7', color: '#d97706' };
      case 'confirmed':
        return { background: '#d1fae5', color: '#059669' };
      case 'rejected':
        return { background: '#fee2e2', color: '#dc2626' };
      default:
        return { background: '#f3f4f6', color: '#6b7280' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'confirmed':
        return 'Confirmée';
      case 'rejected':
        return 'Rejetée';
      default:
        return status;
    }
  };

  // Determine which organization to display
  const parentOrg = branchRequest.parent_school || branchRequest.parent_company;
  const childOrg = branchRequest.child_school || branchRequest.child_company;
  
  // Show the organization that is NOT the current user's organization
  const displayOrg = branchRequest.initiator === 'child' ? parentOrg : childOrg;
  const otherOrg = branchRequest.initiator === 'child' ? childOrg : parentOrg;

  // Check if current user is the recipient (can confirm/reject)
  // Check all companies and schools the user has access to
  const companyIds = user.available_contexts?.companies?.map(c => c.id) || [];
  const schoolIds = user.available_contexts?.schools?.map(s => s.id) || [];
  
  const isRecipient = (() => {
    if (branchRequest.recipient === 'parent') {
      // Check if user's organization is the parent
      if (branchRequest.parent_school && schoolIds.includes(branchRequest.parent_school.id)) {
        return true;
      }
      if (branchRequest.parent_company && companyIds.includes(branchRequest.parent_company.id)) {
        return true;
      }
    } else {
      // Check if user's organization is the child
      if (branchRequest.child_school && schoolIds.includes(branchRequest.child_school.id)) {
        return true;
      }
      if (branchRequest.child_company && companyIds.includes(branchRequest.child_company.id)) {
        return true;
      }
    }
    return false;
  })();
  
  const canAction = isRecipient && branchRequest.status === 'pending';
  const isInitiator = !isRecipient && branchRequest.status === 'pending';

  const handleAccept = () => {
    if (branchRequest) {
      onAccept(branchRequest.id);
      onClose();
    }
  };

  const handleReject = () => {
    if (branchRequest) {
      onReject(branchRequest.id);
      onClose();
    }
  };

  const handleDelete = () => {
    if (branchRequest && onDelete) {
      if (window.confirm('Êtes-vous sûr de vouloir annuler cette demande de rattachement ?')) {
        onDelete(branchRequest.id);
        onClose();
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Détails de la demande de rattachement</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="form-section">
            {/* Organisation concernée */}
            {displayOrg && (
              <div className="form-group">
                <label className="!font-bold !text-lg">
                  {branchRequest.initiator === 'child' ? 'Organisation parente' : 'Organisation enfant'}
                </label>
                <div style={{ fontSize: '1rem', color: '#374151' }}>
                  {displayOrg.name}
                </div>
                {displayOrg.city && (
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
                    <i className="fas fa-map-marker-alt" style={{ marginRight: '4px' }}></i>
                    {displayOrg.city}
                  </div>
                )}
              </div>
            )}

            {/* Organisation initiatrice */}
            {otherOrg && (
              <div className="form-group">
                <label>
                  {branchRequest.initiator === 'child' ? 'Organisation demandante' : 'Organisation destinataire'}
                </label>
                <div style={{ fontSize: '0.95rem', color: '#374151' }}>
                  {otherOrg.name}
                </div>
                {otherOrg.city && (
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
                    <i className="fas fa-map-marker-alt" style={{ marginRight: '4px' }}></i>
                    {otherOrg.city}
                  </div>
                )}
              </div>
            )}

            {/* Message */}
            {branchRequest.message && (
              <div className="form-group">
                <label>Message</label>
                <div style={{ 
                  fontSize: '0.95rem', 
                  color: '#374151',
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6'
                }}>
                  {branchRequest.message}
                </div>
              </div>
            )}

            {/* Statut */}
            <div className="form-group">
              <label>Statut</label>
              <div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  ...getStatusColor(branchRequest.status)
                }}>
                  {getStatusLabel(branchRequest.status)}
                </span>
              </div>
            </div>

            {/* Date de création */}
            {branchRequest.created_at && (
              <div className="form-group">
                <label>Date de création</label>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  <i className="fas fa-calendar" style={{ marginRight: '6px' }}></i>
                  {formatDate(branchRequest.created_at)}
                </div>
              </div>
            )}

            {/* Date de confirmation */}
            {branchRequest.confirmed_at && (
              <div className="form-group">
                <label>Date de confirmation</label>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  <i className="fas fa-check-circle" style={{ marginRight: '6px' }}></i>
                  {formatDate(branchRequest.confirmed_at)}
                </div>
              </div>
            )}

            {/* Rôle */}
            <div className="form-group">
              <label>Rôle dans la demande</label>
              <div style={{ fontSize: '0.9rem', color: '#374151' }}>
                {branchRequest.initiator === 'child' 
                  ? (isRecipient ? 'Vous êtes l\'organisation parente' : 'Vous êtes l\'organisation demandante')
                  : (isRecipient ? 'Vous êtes l\'organisation enfant' : 'Vous êtes l\'organisation destinataire')
                }
              </div>
            </div>
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
          {canAction && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={handleReject}
                style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' }}
              >
                <i className="fas fa-times"></i>
                Refuser
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
          {isInitiator && onDelete && (
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={handleDelete}
              style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' }}
            >
              <i className="fas fa-trash"></i>
              Annuler la demande
            </button>
          )}
          {branchRequest.status === 'confirmed' && (
            <div style={{ padding: '12px', background: '#d1fae5', borderRadius: '8px', color: '#059669', fontSize: '0.9rem' }}>
              <i className="fas fa-check-circle"></i> Cette demande a été confirmée
            </div>
          )}
          {branchRequest.status === 'rejected' && (
            <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '8px', color: '#dc2626', fontSize: '0.9rem' }}>
              <i className="fas fa-times-circle"></i> Cette demande a été rejetée
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchRequestDetailsModal;

