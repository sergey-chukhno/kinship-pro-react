import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { acceptPartnership, approveSchoolTeacherPartnershipRequest, getPartnerships, Partnership, getSchoolTeacherPartnershipRequests, rejectPartnership, rejectSchoolTeacherPartnershipRequest, TeacherPartnershipRequest } from '../../api/Projects';
import { getOrganizationId, getOrganizationType } from '../../utils/projectMapper';
import { getSelectedOrganizationId } from '../../utils/contextUtils';
import { useToast } from '../../hooks/useToast';
import SchoolTeacherPartnershipRequestDetailsModal from '../Modals/SchoolTeacherPartnershipRequestDetailsModal';
import './MembershipRequests.css';
import './Network.css';

type PartnershipTab =
  | 'received'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'teacher-requests'
  | 'org-member-requests';

const PartnershipRequests: React.FC = () => {
  const { state, setCurrentPage } = useAppContext();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [pendingPartnerships, setPendingPartnerships] = useState<Partnership[]>([]);
  const [acceptedPartnerships, setAcceptedPartnerships] = useState<Partnership[]>([]);
  const [rejectedPartnerships, setRejectedPartnerships] = useState<Partnership[]>([]);
  const [teacherRequests, setTeacherRequests] = useState<TeacherPartnershipRequest[]>([]);
  const [selectedSchoolTeacherPartnershipRequest, setSelectedSchoolTeacherPartnershipRequest] = useState<TeacherPartnershipRequest | null>(null);

  const [activeTab, setActiveTab] = useState<PartnershipTab>('received');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organizationId = getOrganizationId(state.user, state.showingPageType);
  const organizationType = getOrganizationType(state.showingPageType);

  const isEdu = state.showingPageType === 'edu';
  const isPro = state.showingPageType === 'pro';

  const fetchAll = useCallback(async () => {
    if (!organizationId || (organizationType !== 'school' && organizationType !== 'company')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Pending (for received/sent)
      const pendingResponse = await getPartnerships(organizationId, organizationType, {
        status: 'pending',
        per_page: 100
      });
      setPendingPartnerships(Array.isArray(pendingResponse.data) ? pendingResponse.data : []);

      // Accepted
      const acceptedResponse = await getPartnerships(organizationId, organizationType, {
        status: 'confirmed',
        per_page: 100
      });
      setAcceptedPartnerships(Array.isArray(acceptedResponse.data) ? acceptedResponse.data : []);

      // Rejected
      const rejectedResponse = await getPartnerships(organizationId, organizationType, {
        status: 'rejected',
        per_page: 100
      });
      setRejectedPartnerships(Array.isArray(rejectedResponse.data) ? rejectedResponse.data : []);

      // Teacher requests (school dashboard only)
      if (isEdu) {
        const schoolId = getSelectedOrganizationId(state.user, state.showingPageType);
        if (schoolId) {
          const data = await getSchoolTeacherPartnershipRequests(schoolId);
          setTeacherRequests(Array.isArray(data) ? data : []);
        } else {
          setTeacherRequests([]);
        }
      } else {
        setTeacherRequests([]);
      }
    } catch (err) {
      console.error('Error fetching partnership requests overview:', err);
      setError('Erreur lors du chargement des demandes de partenariats');
    } finally {
      setLoading(false);
    }
  }, [organizationId, organizationType, isEdu, state.user, state.showingPageType]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const receivedPending = useMemo(
    () => pendingPartnerships.filter((p) => p.initiator_id !== organizationId),
    [pendingPartnerships, organizationId]
  );

  const sentPending = useMemo(
    () => pendingPartnerships.filter((p) => p.initiator_id === organizationId),
    [pendingPartnerships, organizationId]
  );

  const acceptedList = useMemo(() => acceptedPartnerships, [acceptedPartnerships]);
  const rejectedList = useMemo(() => rejectedPartnerships, [rejectedPartnerships]);

  const handleBackToNetwork = () => {
    setCurrentPage('network');
    navigate('/network');
  };

  const getPartnershipKindLabel = (kind: string | null | undefined): string => {
    if (!kind) return '';
    if (kind === 'administratif') return 'Partenariat administratif';
    return kind;
  };

  const handleAcceptPartnership = useCallback(async (partnershipId: number) => {
    if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) return;
    try {
      await acceptPartnership(organizationId, organizationType, partnershipId);
      showSuccess('Partenariat accepté avec succès');
      await fetchAll();
    } catch (err: any) {
      console.error('Error accepting partnership:', err);
      showError(err?.response?.data?.message || 'Erreur lors de l\'acceptation du partenariat');
    }
  }, [organizationId, organizationType, showError, showSuccess, fetchAll]);

  const handleRejectPartnership = useCallback(async (partnershipId: number) => {
    if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) return;
    try {
      await rejectPartnership(organizationId, organizationType, partnershipId);
      showSuccess('Demande rejetée');
      await fetchAll();
    } catch (err: any) {
      console.error('Error rejecting partnership:', err);
      showError(err?.response?.data?.message || 'Erreur lors du rejet');
    }
  }, [organizationId, organizationType, showError, showSuccess, fetchAll]);

  const handleApproveSchoolTeacherPartnershipRequest = useCallback(async (id: number) => {
    const schoolId = getSelectedOrganizationId(state.user, state.showingPageType);
    if (!schoolId) return;
    try {
      await approveSchoolTeacherPartnershipRequest(schoolId, id);
      showSuccess('Demande validée. Le partenariat a été créé.');
      setSelectedSchoolTeacherPartnershipRequest(null);
      await fetchAll();
    } catch (err: any) {
      console.error('Error approving teacher partnership request:', err);
      showError(err?.response?.data?.message || 'Erreur lors de la validation');
    }
  }, [fetchAll, showError, showSuccess, state.showingPageType, state.user]);

  const handleRejectSchoolTeacherPartnershipRequest = useCallback(async (id: number, reason?: string) => {
    const schoolId = getSelectedOrganizationId(state.user, state.showingPageType);
    if (!schoolId) return;
    try {
      await rejectSchoolTeacherPartnershipRequest(schoolId, id, reason ? { rejection_reason: reason } : undefined);
      showSuccess('Demande rejetée');
      setSelectedSchoolTeacherPartnershipRequest(null);
      await fetchAll();
    } catch (err: any) {
      console.error('Error rejecting teacher partnership request:', err);
      showError(err?.response?.data?.message || 'Erreur lors du rejet');
    }
  }, [fetchAll, showError, showSuccess, state.showingPageType, state.user]);

  const renderNetworkStylePartnershipCard = (p: Partnership) => {
    const currentOrgId = getOrganizationId(state.user, state.showingPageType);
    const partner = (p.partners || []).find((pt: any) => pt.id !== currentOrgId);
    const isSchool = partner?.type === 'School';
    const orgTypeLabel = isSchool ? 'Établissement scolaire' : 'Organisation';
    const orgTypeColor = isSchool ? '#10b981' : '#3b82f6';
    const isInitiator = Boolean(organizationId && p.initiator_id === organizationId);
    const message = p.description || '';
    const date = p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '';

    const statusLabel =
      p.status === 'pending' ? 'En attente' : p.status === 'confirmed' ? 'Accepté' : p.status === 'rejected' ? 'Refusé' : p.status;
    const statusColor =
      p.status === 'pending' ? '#f59e0b' : p.status === 'confirmed' ? '#10b981' : p.status === 'rejected' ? '#ef4444' : '#6b7280';

    return (
      <div key={p.id} className="organization-card">
        <div className="organization-header">
          <div className="organization-logo">
            <div className="logo-placeholder">
              <i className="fas fa-building"></i>
            </div>
          </div>
          <div className="organization-info">
            <h3 className="organization-name">{partner?.name || p.name || 'Partenariat'}</h3>
            <div className="organization-meta">
              <span className="organization-type" style={{ background: `${orgTypeColor}15`, color: orgTypeColor }}>
                {orgTypeLabel}
              </span>
              <span className="whitespace-nowrap organization-status" style={{ color: statusColor }}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="organization-content">
          {message && (
            <div className="organization-description" style={{ marginBottom: '12px' }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message}</p>
            </div>
          )}

          {p.status === 'pending' && (
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isInitiator ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: '#dbeafe',
                  color: '#1e40af',
                  border: '1px solid #93c5fd'
                }}>
                  <i className="fas fa-paper-plane" style={{ fontSize: '0.7rem' }}></i>
                  Demande envoyée
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fcd34d'
                }}>
                  <i className="fas fa-inbox" style={{ fontSize: '0.7rem' }}></i>
                  Demande reçue
                </span>
              )}
            </div>
          )}

          {p.partnership_kind && (
            <div className="detail-item" style={{ marginBottom: '12px' }}>
              <i className="fas fa-handshake" style={{ marginRight: '6px' }}></i>
              <span>Type de partenariat : {getPartnershipKindLabel(p.partnership_kind)}</span>
            </div>
          )}

          {date && (
            <div className="detail-item" style={{ marginBottom: '12px' }}>
              <i className="fas fa-calendar" style={{ marginRight: '6px' }}></i>
              <span>Créée le {date}</span>
            </div>
          )}

          {p.status === 'pending' && !isInitiator && (
            <div className="organization-actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                className="btn btn-primary"
                onClick={() => handleAcceptPartnership(p.id)}
                style={{ flex: 1 }}
              >
                <i className="fas fa-check"></i> Accepter
              </button>
              <button
                className="btn btn-outline"
                onClick={() => handleRejectPartnership(p.id)}
                style={{ flex: 1 }}
              >
                <i className="fas fa-times"></i> Refuser
              </button>
            </div>
          )}

          {p.status === 'pending' && isInitiator && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px', color: '#6b7280', fontSize: '0.9rem' }}>
              <i className="fas fa-info-circle"></i> Votre demande de partenariat a été envoyée
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSchoolTeacherRequestCard = (req: TeacherPartnershipRequest) => {
    const descriptionPreview = req.description
      ? req.description.length > 120
        ? `${req.description.slice(0, 120)}…`
        : req.description
      : '';

    return (
      <div
        key={req.id}
        className="organization-card"
        onClick={() => setSelectedSchoolTeacherPartnershipRequest(req)}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedSchoolTeacherPartnershipRequest(req);
          }
        }}
      >
        <div className="organization-header">
          <div className="organization-logo">
            <div className="logo-placeholder"><i className="fas fa-user-graduate"></i></div>
          </div>
          <div className="organization-info">
            <h3 className="organization-name">{req.name || 'Demande de partenariat'}</h3>
            <div className="organization-meta">
              <span className="organization-type" style={{ background: '#dbeafe', color: '#2563eb' }}>
                Demande de {req.teacher?.full_name || 'un enseignant'}
              </span>
              <span className="whitespace-nowrap organization-status" style={{ color: '#f59e0b' }}>
                En attente
              </span>
            </div>
          </div>
        </div>
        <div className="organization-content">
          {descriptionPreview ? (
            <p className="organization-description" style={{ margin: 0 }}>{descriptionPreview}</p>
          ) : null}
          <span style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px', display: 'block' }}>
            Cliquer pour voir les détails et valider / rejeter
          </span>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <div className="loading-state">Chargement des demandes...</div>;
    }

    if (error) {
      return <div className="no-requests">{error}</div>;
    }

    if (activeTab === 'received') {
      if (receivedPending.length === 0) {
        return <div className="no-requests">Aucune demande de partenariat reçue.</div>;
      }
      return (
        <div className="organizations-list">
          <div className="grid !grid-cols-3">
            {receivedPending.map((p) => renderNetworkStylePartnershipCard(p))}
          </div>
        </div>
      );
    }

    if (activeTab === 'sent') {
      if (sentPending.length === 0) {
        return <div className="no-requests">Aucune demande de partenariat envoyée.</div>;
      }
      return (
        <div className="organizations-list">
          <div className="grid !grid-cols-3">
            {sentPending.map((p) => renderNetworkStylePartnershipCard(p))}
          </div>
        </div>
      );
    }

    if (activeTab === 'accepted') {
      if (acceptedList.length === 0) {
        return <div className="no-requests">Aucune demande de partenariat acceptée.</div>;
      }
      return (
        <div className="organizations-list">
          <div className="grid !grid-cols-3">
            {acceptedList.map((p) => renderNetworkStylePartnershipCard(p))}
          </div>
        </div>
      );
    }

    if (activeTab === 'rejected') {
      if (rejectedList.length === 0) {
        return <div className="no-requests">Aucune demande de partenariat refusée.</div>;
      }
      return (
        <div className="organizations-list">
          <div className="grid !grid-cols-3">
            {rejectedList.map((p) => renderNetworkStylePartnershipCard(p))}
          </div>
        </div>
      );
    }

    if (activeTab === 'teacher-requests') {
      if (!isEdu) {
        return <div className="no-requests">Cette section est disponible uniquement pour les établissements scolaires.</div>;
      }
      if (teacherRequests.length === 0) {
        return <div className="no-requests">Aucune demande de partenariat par les enseignants.</div>;
      }
      return (
        <div className="organizations-list">
          <div className="grid !grid-cols-3">
            {teacherRequests.map((req) => renderSchoolTeacherRequestCard(req))}
          </div>
        </div>
      );
    }

    if (activeTab === 'org-member-requests') {
      return (
        <div className="no-requests">
          Cette fonctionnalité sera disponible prochainement pour les organisations professionnelles.
        </div>
      );
    }

    return null;
  };

  return (
    <section className="membership-requests-container with-sidebar">
      <div className="membership-requests-header">
        <div className="section-title-left">
          <button
            className="back-button"
            onClick={handleBackToNetwork}
            title='Revenir vers la page "Mon réseau Kinship"'
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <img src="/icons_logo/Icon=Reseau.svg" alt="Demandes de partenariat" className="section-icon" />
          <h2>Gérer les demandes de partenariat</h2>
        </div>
      </div>

      <div className="membership-requests-content">
        <div className="filter-tabs" style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className={`filter-tab ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Demandes de partenariat reçues ({receivedPending.length})
          </button>
          <button
            type="button"
            className={`filter-tab ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Demandes de partenariat envoyées ({sentPending.length})
          </button>
          <button
            type="button"
            className={`filter-tab ${activeTab === 'accepted' ? 'active' : ''}`}
            onClick={() => setActiveTab('accepted')}
          >
            Demandes de partenariats acceptées ({acceptedList.length})
          </button>
          <button
            type="button"
            className={`filter-tab ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            Demandes de partenariats refusées ({rejectedList.length})
          </button>
          {isEdu && (
            <button
              type="button"
              className={`filter-tab ${activeTab === 'teacher-requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('teacher-requests')}
            >
              Demandes de partenariats par membres de mon établissement ({teacherRequests.length})
            </button>
          )}
          {isPro && (
            <button
              type="button"
              className="filter-tab"
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            >
              Demandes de partenariats par membres de mon organisation (à venir)
            </button>
          )}
        </div>

        {renderContent()}
      </div>

      {isEdu && selectedSchoolTeacherPartnershipRequest && (
        <SchoolTeacherPartnershipRequestDetailsModal
          request={selectedSchoolTeacherPartnershipRequest}
          onClose={() => setSelectedSchoolTeacherPartnershipRequest(null)}
          onAccept={handleApproveSchoolTeacherPartnershipRequest}
          onReject={handleRejectSchoolTeacherPartnershipRequest}
        />
      )}
    </section>
  );
};

export default PartnershipRequests;

