import React, { useState } from 'react';
import { addSessionPartnerMock, coAttestLinkFor } from '../../utils/sessionCloseMock';
import '../SessionClose/SessionClose.css';
import './AddSessionParticipantModal.css';

type Props = {
  open: boolean;
  sessionId: string;
  onClose: () => void;
  onAdded: (link: string) => void;
};

const AddSessionPartnerModal: React.FC<Props> = ({ open, sessionId, onClose, onAdded }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [functionLabel, setFunctionLabel] = useState('');

  if (!open) return null;

  const canSubmit =
    name.trim() && email.trim() && organization.trim() && functionLabel.trim();

  return (
    <div
      className="fss-modal-backdrop asp-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asp-partner-title"
    >
      <div className="fss-modal asp-modal">
        <h2 id="asp-partner-title">Ajouter un partenaire</h2>
        <p className="asp-partner-hint">
          Le partenaire co-attestant est <b>invité dès son ajout</b>. Son lien vaut{' '}
          <b>jusqu&apos;à la clôture</b>, pour <b>une seule</b> co-attestation. Il voit la synthèse
          de la session, jamais la liste des participants.
        </p>
        <label className="asp-field">
          <span className="asp-lab">
            Nom <span className="asp-req">✱</span>
          </span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label className="asp-field">
          <span className="asp-lab">
            E-mail <span className="asp-req">✱</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="asp-field">
          <span className="asp-lab">
            Fonction <span className="asp-req">✱</span>
          </span>
          <input value={functionLabel} onChange={(e) => setFunctionLabel(e.target.value)} />
        </label>
        <label className="asp-field">
          <span className="asp-lab">
            Organisation <span className="asp-req">✱</span>
          </span>
          <input value={organization} onChange={(e) => setOrganization(e.target.value)} />
        </label>
        <div className="fss-actions">
          <button type="button" className="fss-btn g" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="fss-btn p"
            disabled={!canSubmit}
            onClick={() => {
              const mock = addSessionPartnerMock(sessionId, {
                name,
                email,
                organization,
                functionLabel,
              });
              const partner = mock.partners[mock.partners.length - 1];
              onAdded(coAttestLinkFor(partner));
              onClose();
            }}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSessionPartnerModal;
