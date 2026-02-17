import React, { useState } from 'react';
import { TeacherPartnershipRequest } from '../../api/Projects';
import './Modal.css';

const PARTNERSHIP_TYPE_LABELS: Record<string, string> = {
  bilateral: 'Bilatéral',
  educational: 'Éducatif',
  administratif: 'Administratif',
};

interface SchoolTeacherPartnershipRequestDetailsModalProps {
  request: TeacherPartnershipRequest | null;
  onClose: () => void;
  onAccept: (id: number) => void;
  onReject: (id: number, rejectionReason?: string) => void;
}

const SchoolTeacherPartnershipRequestDetailsModal: React.FC<SchoolTeacherPartnershipRequestDetailsModalProps> = ({
  request,
  onClose,
  onAccept,
  onReject,
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  if (!request) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAccept = () => {
    onAccept(request.id);
    onClose();
  };

  const handleReject = () => {
    if (showRejectInput) {
      onReject(request.id, rejectReason.trim() || undefined);
      onClose();
    } else {
      setShowRejectInput(true);
    }
  };

  const handleCancelReject = () => {
    setShowRejectInput(false);
    setRejectReason('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Demande de partenariat (enseignant)</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="form-section">
            {request.teacher?.full_name && (
              <div className="form-group">
                <label>Demandeur</label>
                <div style={{ fontSize: '1rem', color: '#374151', fontWeight: 500 }}>
                  {request.teacher.full_name}
                </div>
              </div>
            )}

            {request.school?.name && (
              <div className="form-group">
                <label>Établissement concerné</label>
                <div style={{ fontSize: '1rem', color: '#374151' }}>
                  {request.school.name}
                </div>
              </div>
            )}

            {request.name && (
              <div className="form-group">
                <label>Nom du partenariat</label>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>
                  {request.name}
                </div>
              </div>
            )}

            {request.partnership_type && (
              <div className="form-group">
                <label>Type de partenariat</label>
                <div style={{ fontSize: '1rem', color: '#374151' }}>
                  {PARTNERSHIP_TYPE_LABELS[request.partnership_type] || request.partnership_type}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Description</label>
              <div
                style={{
                  fontSize: '1rem',
                  color: '#374151',
                  whiteSpace: 'pre-wrap',
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  minHeight: '80px',
                }}
              >
                {request.description || '—'}
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Partager les projets : {request.share_projects ? 'Oui' : 'Non'}
              </span>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Partager les membres : {request.share_members ? 'Oui' : 'Non'}
              </span>
            </div>

            {request.created_at && (
              <div className="form-group" style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                Demandé le {formatDate(request.created_at)}
              </div>
            )}
          </div>

          {request.status === 'pending' && (
            <div className="form-section" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              {!showRejectInput ? (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary" onClick={handleAccept}>
                    <i className="fas fa-check" style={{ marginRight: '8px' }}></i>
                    Valider la demande
                  </button>
                  <button type="button" className="btn btn-outline" onClick={handleReject}>
                    <i className="fas fa-times" style={{ marginRight: '8px' }}></i>
                    Rejeter
                  </button>
                </div>
              ) : (
                <div>
                  <label className="form-group" style={{ display: 'block', marginBottom: '8px' }}>
                    Raison du refus (optionnel)
                  </label>
                  <textarea
                    className="form-textarea"
                    placeholder="Indiquez une raison..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    style={{ width: '100%', marginBottom: '12px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-primary" onClick={handleReject}>
                      Confirmer le rejet
                    </button>
                    <button type="button" className="btn btn-outline" onClick={handleCancelReject}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolTeacherPartnershipRequestDetailsModal;
