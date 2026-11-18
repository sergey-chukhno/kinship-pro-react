import React from 'react';
import type { FormationSession } from '../../types/formationSession';
import { deliversMicrocert, validInvalidCounts, type SessionCloseMock } from '../../utils/sessionCloseMock';
import { invalidParticipantSentence, proofLabel } from '../../utils/sessionCloseCopy';
import './SessionClose.css';

type Props = {
  session: FormationSession;
  /** Draft jury state (same shape as mock for counts). */
  draft: Pick<SessionCloseMock, 'juryDecisions'>;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  submitting?: boolean;
};

const SessionCloseConfirmModal: React.FC<Props> = ({
  session,
  draft,
  open,
  onCancel,
  onConfirm,
  submitting = false,
}) => {
  if (!open) return null;

  const mc = deliversMicrocert(session);
  const { valid, invalid } = validInvalidCounts(draft as SessionCloseMock);
  const invalidNames = session.people
    .filter((p) => p.role === 'participant' && draft.juryDecisions[p.id] === 'invalid')
    .map((p) => p.name);

  return (
    <div className="sc-overlay" role="dialog" aria-modal="true" aria-labelledby="sc-confirm-title">
      <div className="sc-modal">
        <h2 id="sc-confirm-title">Délivrer {proofLabel(valid, mc)}&nbsp;?</h2>
        <p>
          La session sera clôturée.
          {mc
            ? ` Chaque microcertification portera la mention « Délivrée par ${session.orgName} ».`
            : ' Chaque participant validé recevra sa preuve de formation ; chaque participant recevra son certificat de réalisation.'}
        </p>
        {invalid > 0 && <p>{invalidParticipantSentence(invalid, invalidNames, mc)}</p>}
        <p>
          <b>Cette action est irréversible.</b>
        </p>
        <div className="sc-foot" style={{ borderTop: 'none', paddingTop: 4 }}>
          <button type="button" className="sc-btn g" onClick={onCancel} disabled={submitting}>
            Annuler
          </button>
          <button
            type="button"
            className="sc-btn am"
            disabled={submitting}
            onClick={() => {
              void onConfirm();
            }}
          >
            {submitting ? 'Clôture…' : 'Confirmer la délivrance'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionCloseConfirmModal;
