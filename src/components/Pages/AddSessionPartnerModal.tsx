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
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [functionLabel, setFunctionLabel] = useState('');
  const [organization, setOrganization] = useState('');

  if (!open) return null;

  const canSubmit = Boolean(email.trim());

  return (
    <div
      className="fss-modal-backdrop asp-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asp-partner-title"
    >
      <div className="fss-modal asp-modal">
        <h2 id="asp-partner-title">Ajouter un partenaire</h2>
        <p className="asp-hint">
          Le partenaire co-attestant est <b>invité dès son ajout</b>. Son lien vaut{' '}
          <b>jusqu&apos;à la clôture</b>, pour <b>une seule</b> co-attestation. Seul l&apos;e-mail
          est requis ici ; le nom, la fonction et l&apos;organisation sont donnés sur sa page.
        </p>
        <label className="asp-field">
          <span className="asp-lab">
            E-mail <span className="asp-req">✱</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />
        </label>
        <label className="asp-field">
          <span className="asp-lab">Nom</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Facultatif"
          />
        </label>
        <label className="asp-field">
          <span className="asp-lab">Fonction</span>
          <input
            value={functionLabel}
            onChange={(e) => setFunctionLabel(e.target.value)}
            placeholder="Facultatif"
          />
        </label>
        <label className="asp-field">
          <span className="asp-lab">Organisation</span>
          <input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="Facultatif"
          />
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
                name: name.trim() || email.trim().split('@')[0] || 'Partenaire',
                email,
                organization: organization.trim(),
                functionLabel: functionLabel.trim(),
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
