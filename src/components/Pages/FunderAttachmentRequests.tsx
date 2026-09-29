import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  confirmFunderAttachment,
  FunderAttachment,
  getFunderAttachments,
  rejectFunderAttachment,
} from '../../api/Projects';
import { useAppContext } from '../../context/AppContext';
import { getSelectedOrganizationId } from '../../utils/contextUtils';
import { getOrganizationType } from '../../utils/projectMapper';
import { useToast } from '../../hooks/useToast';
import './MembershipRequests.css';
import './Network.css';

type Tab = 'received' | 'sent' | 'accepted' | 'rejected';

const FunderAttachmentRequests: React.FC = () => {
  const { state, setCurrentPage } = useAppContext();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [tab, setTab] = useState<Tab>('received');
  const [sent, setSent] = useState<FunderAttachment[]>([]);
  const [received, setReceived] = useState<FunderAttachment[]>([]);
  const [loading, setLoading] = useState(false);

  const organizationId = getSelectedOrganizationId(state.user, state.showingPageType);
  const organizationType = getOrganizationType(state.showingPageType) === 'school' ? 'school' : 'company';

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const data = await getFunderAttachments(organizationId, organizationType);
      setSent(data.sent);
      setReceived(data.received);
    } catch {
      setSent([]);
      setReceived([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, organizationType]);

  useEffect(() => {
    void load();
  }, [load]);

  const receivedPending = received.filter((a) => a.status === 'pending');
  const sentPending = sent.filter((a) => a.status === 'pending');
  const accepted = [...received, ...sent].filter((a) => a.status === 'confirmed');
  const rejected = [...received, ...sent].filter((a) => a.status === 'rejected');
  const list =
    tab === 'received' ? receivedPending : tab === 'sent' ? sentPending : tab === 'accepted' ? accepted : rejected;

  return (
    <section className="membership-requests-container with-sidebar">
      <div className="section-title-row">
        <div className="section-title-left">
          <button className="back-button" onClick={() => { setCurrentPage('network'); navigate('/network'); }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <img src="/icons_logo/Icon=Reseau.svg" alt="" className="section-icon" />
          <h2>Gérer les demandes de rattachement financeur</h2>
        </div>
      </div>
      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        <button type="button" className={`filter-tab ${tab === 'received' ? 'active' : ''}`} onClick={() => setTab('received')}>
          Demandes reçues ({receivedPending.length})
        </button>
        <button type="button" className={`filter-tab ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab('sent')}>
          Demandes envoyées ({sentPending.length})
        </button>
        <button type="button" className={`filter-tab ${tab === 'accepted' ? 'active' : ''}`} onClick={() => setTab('accepted')}>
          Acceptées ({accepted.length})
        </button>
        <button type="button" className={`filter-tab ${tab === 'rejected' ? 'active' : ''}`} onClick={() => setTab('rejected')}>
          Refusées ({rejected.length})
        </button>
      </div>
      {loading ? (
        <p>Chargement…</p>
      ) : list.length === 0 ? (
        <p className="fp-empty-sub">Aucune demande dans cet onglet. Le ponctuel n’entre jamais ici — seulement les rattachements.</p>
      ) : (
        list.map((item) => (
          <article key={item.id} className="fp-card" style={{ marginBottom: 8 }}>
            <div className="fp-card-title">
              {tab === 'sent' || item.direction === 'sent'
                ? item.carrier?.name
                : item.funder_company?.name}
            </div>
            <div className="fp-meta">{item.project_title ? `via ${item.project_title}` : 'Rattachement financeur'}</div>
            {tab === 'received' && item.status === 'pending' && (
              <div className="fp-row2" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="fp-btn-confirm"
                  onClick={() => void confirmFunderAttachment(item.id).then(() => { showSuccess('Rattachement accepté.'); void load(); }).catch(() => showError('Impossible d’accepter.'))}
                >
                  Accepter
                </button>
                <button
                  type="button"
                  className="fp-btn-ghost"
                  onClick={() => void rejectFunderAttachment(item.id).then(() => { showSuccess('Demande refusée.'); void load(); }).catch(() => showError('Impossible de refuser.'))}
                >
                  Refuser
                </button>
              </div>
            )}
          </article>
        ))
      )}
    </section>
  );
};

export default FunderAttachmentRequests;
