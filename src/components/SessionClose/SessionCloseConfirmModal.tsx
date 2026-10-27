import React from 'react';
import type { FormationSession } from '../../types/formationSession';
import {
  closeAndDeliverMock,
  deliversMicrocert,
  validInvalidCounts,
  type SessionCloseMock,
} from '../../utils/sessionCloseMock';
import './SessionClose.css';

type Props = {
  session: FormationSession;
  mock: SessionCloseMock;
  open: boolean;
  onCancel: () => void;
  onConfirmed: () => void;
};

const SessionCloseConfirmModal: React.FC<Props> = ({
  session,
  mock,
  open,
  onCancel,
  onConfirmed,
}) => {
  if (!open) return null;

  const mc = deliversMicrocert(session);
  const { valid, invalid } = validInvalidCounts(mock);
  const invalidNames = session.people
    .filter((p) => p.role === 'participant' && mock.juryDecisions[p.id] === 'invalid')
    .map((p) => p.name);

  return (
    <div className="sc-overlay" role="dialog" aria-modal="true" aria-labelledby="sc-confirm-title">
      <div className="sc-modal">
        <h2 id="sc-confirm-title">
          Délivrer {valid} {mc ? 'microcertifications' : 'preuves de formation'}&nbsp;?
        </h2>
        <p>
          La session sera clôturée.
          {mc
            ? ` Chaque microcertification portera la mention « Délivrée par ${session.orgName} ».`
            : ' Chaque participant validé recevra sa preuve de formation, exportable vers Europass ; chaque participant recevra son certificat de réalisation.'}
        </p>
        {invalid > 0 && (
          <p>
            {invalid} participant{invalid > 1 ? 's' : ''} non validé
            {invalid > 1 ? 's' : ''} ne recevront pas de{' '}
            {mc ? 'microcertification' : 'preuve de formation'} : {invalidNames.join(', ')}.
          </p>
        )}
        <p>
          <b>Cette action est irréversible.</b>
        </p>
        <div className="sc-foot" style={{ borderTop: 'none', paddingTop: 4 }}>
          <button type="button" className="sc-btn g" onClick={onCancel}>
            Annuler
          </button>
          <button
            type="button"
            className="sc-btn am"
            onClick={() => {
              closeAndDeliverMock(session);
              onConfirmed();
            }}
          >
            Confirmer la délivrance
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionCloseConfirmModal;
