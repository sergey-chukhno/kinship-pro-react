import React, { useState } from 'react';
import type { FormationSession } from '../../types/formationSession';
import { declareSessionEndMock, deliversMicrocert } from '../../utils/sessionCloseMock';
import { formatDateShortFr } from '../../utils/sessionCloseCopy';
import './SessionClose.css';

type Props = {
  session: FormationSession;
  open: boolean;
  onClose: () => void;
  onDeclared: () => void;
};

const DeclareSessionEndModal: React.FC<Props> = ({ session, open, onClose, onDeclared }) => {
  const [message, setMessage] = useState('');
  if (!open) return null;

  const mc = deliversMicrocert(session);
  const pCount = session.people.filter((p) => p.role === 'participant').length;

  return (
    <div className="sc-overlay" role="dialog" aria-modal="true" aria-labelledby="sc-declare-title">
      <div className="sc-modal">
        <h2 id="sc-declare-title">Déclarer la fin de la session ?</h2>
        <p>
          <b>{session.title}</b> — {pCount} participant{pCount > 1 ? 's' : ''} · du{' '}
          {formatDateShortFr(session.startDate)} au {formatDateShortFr(session.endDate)}.
        </p>
        <div className="sc-field">
          <label>Message à l&apos;organisme (facultatif)</label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Consignes pour l'organisme ou le jury…"
          />
        </div>
        <p>
          L&apos;organisme est notifié : il enregistre la décision du jury, puis clôture la session
          et délivre les {mc ? 'microcertifications' : 'preuves de formation'}.
        </p>
        <div className="sc-foot" style={{ borderTop: 'none', paddingTop: 4 }}>
          <button type="button" className="sc-btn g" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="sc-btn am"
            onClick={() => {
              declareSessionEndMock(session.id, message);
              onDeclared();
            }}
          >
            Déclarer la fin
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeclareSessionEndModal;
