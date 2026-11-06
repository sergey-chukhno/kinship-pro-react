import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import './MembershipRequests.css';
import './Network.css';

/**
 * D-FORMATION-SHARE-01 V1.5.2 — funder_attachments removed.
 * Durable attachment moves to partnership_kind=financeur (Rimma P4.6).
 * Keep route shell so Network tiles / deep links do not 404.
 */
const FunderAttachmentRequests: React.FC = () => {
  const { setCurrentPage } = useAppContext();
  const navigate = useNavigate();

  return (
    <div className="membership-requests-page">
      <div className="membership-requests-header">
        <button
          type="button"
          className="back-button"
          onClick={() => {
            setCurrentPage('network');
            navigate('/dashboard');
          }}
        >
          ← Réseau
        </button>
        <h1>Financeurs</h1>
      </div>
      <p className="network-empty" style={{ padding: '1.5rem 0' }}>
        Le rattachement financeur durable bascule sur le partenariat (kind financeur). Cette
        page sera reconnectée avec D-FORMATION-SHARE-01 en production.
      </p>
    </div>
  );
};

export default FunderAttachmentRequests;
