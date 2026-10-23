import React, { useMemo, useState } from 'react';
import { isUnder15 } from '../../utils/ageUtils';
import type { FormationSessionPerson } from '../../types/formationSession';
import './AddSessionParticipantModal.css';

export type AddSessionParticipantPayload = {
  lastName: string;
  firstName: string;
  birthdate: string; // YYYY-MM-DD
  email: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (person: FormationSessionPerson) => void;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * P4.4 — panneau « Ajouter un participant » (écran seul).
 * TODO Sergey: remplacer l’append local par POST participants (contrat aligné import).
 */
const AddSessionParticipantModal: React.FC<Props> = ({ open, onClose, onAdd }) => {
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [email, setEmail] = useState('');

  const under15 = useMemo(
    () => (birthdate ? isUnder15(birthdate) : false),
    [birthdate]
  );

  const canSubmit =
    lastName.trim().length > 0 &&
    firstName.trim().length > 0 &&
    birthdate.trim().length > 0 &&
    isValidEmail(email);

  if (!open) return null;

  const resetAndClose = () => {
    setLastName('');
    setFirstName('');
    setBirthdate('');
    setEmail('');
    onClose();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const person: FormationSessionPerson = {
      id: `participant-${Date.now()}`,
      name: `${firstName.trim()} ${lastName.trim()}`,
      email: email.trim(),
      role: 'participant',
      pending: false,
    };
    onAdd(person);
    resetAndClose();
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
            Nom <span className="asp-req">✱</span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </label>
          <label className="asp-field">
            Prénom <span className="asp-req">✱</span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </label>
        </div>

        <label className={`asp-field ${under15 ? 'asp-field-warn' : ''}`}>
          Date de naissance <span className="asp-req">✱</span>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
          />
        </label>
        {under15 && (
          <div className="asp-under15" role="status">
            Date de naissance : moins de 15 ans.
          </div>
        )}

        <label className="asp-field">
          E-mail <span className="asp-req">✱</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <p className="asp-hint">
          La personne est prévenue par e-mail ; aucune action n&apos;est requise de sa part.
        </p>

        <div className="fss-actions">
          <button type="button" className="fss-btn g" onClick={resetAndClose}>
            Annuler
          </button>
          <button
            type="button"
            className="fss-btn p"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSessionParticipantModal;
