import React, { useMemo, useState } from 'react';
import { isUnder15 } from '../../utils/ageUtils';
import type { SessionPreRegisterPayload } from '../../types/formationSession';
import './AddSessionParticipantModal.css';

export type AddSessionParticipantPayload = SessionPreRegisterPayload;

type Props = {
  open: boolean;
  onClose: () => void;
  /** Calls BE pre_register; throw to keep modal open with error. */
  onSubmit: (payload: SessionPreRegisterPayload) => Promise<void>;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * P4.4 — panneau « Ajouter un participant » (contrat V1.3 §11 B pre_register).
 */
const AddSessionParticipantModal: React.FC<Props> = ({ open, onClose, onSubmit }) => {
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const under15 = useMemo(
    () => (birthdate ? isUnder15(birthdate) : false),
    [birthdate]
  );

  const canSubmit =
    !busy &&
    lastName.trim().length > 0 &&
    firstName.trim().length > 0 &&
    birthdate.trim().length > 0 &&
    isValidEmail(email);

  if (!open) return null;

  const resetAndClose = () => {
    if (busy) return;
    setLastName('');
    setFirstName('');
    setBirthdate('');
    setEmail('');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birthday: birthdate.trim(),
        email: email.trim(),
      });
      setLastName('');
      setFirstName('');
      setBirthdate('');
      setEmail('');
      setError(null);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fss-modal-backdrop asp-backdrop"
      onClick={resetAndClose}
      role="presentation"
    >
      <div
        className="fss-modal asp-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="asp-title"
      >
        <h2 id="asp-title">Ajouter un participant</h2>

        <div className="asp-row">
          <label className="asp-field">
            <span className="asp-lab">
              Nom <span className="asp-req">✱</span>
            </span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              disabled={busy}
            />
          </label>
          <label className="asp-field">
            <span className="asp-lab">
              Prénom <span className="asp-req">✱</span>
            </span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              disabled={busy}
            />
          </label>
        </div>

        <label className={`asp-field ${under15 ? 'asp-field-warn' : ''}`}>
          <span className="asp-lab">
            Date de naissance <span className="asp-req">✱</span>
          </span>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            disabled={busy}
          />
        </label>
        {under15 && (
          <div className="asp-under15" role="status">
            Date de naissance : moins de 15 ans.
          </div>
        )}

        <label className="asp-field">
          <span className="asp-lab">
            E-mail <span className="asp-req">✱</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={busy}
          />
        </label>

        <p className="asp-hint">
          La personne est prévenue par e-mail ; aucune action n&apos;est requise de sa part.
        </p>

        {error && (
          <div className="asp-err" role="alert">
            {error}
          </div>
        )}

        <div className="fss-actions">
          <button type="button" className="fss-btn g" onClick={resetAndClose} disabled={busy}>
            Annuler
          </button>
          <button
            type="button"
            className="fss-btn p"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {busy ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSessionParticipantModal;
