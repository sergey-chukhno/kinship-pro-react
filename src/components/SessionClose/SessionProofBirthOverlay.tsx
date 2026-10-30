import React from 'react';
import type { FormationSession } from '../../types/formationSession';
import type { SessionCloseMock } from '../../utils/sessionCloseMock';
import {
  formatDateShortFr,
  formatDurationHoursLabel,
  formatProofCodeDisplay,
} from '../../utils/sessionCloseCopy';
import './SessionClose.css';

type Props = {
  session: FormationSession;
  mock: SessionCloseMock;
  open: boolean;
  onContinue: () => void;
};

const SessionProofBirthOverlay: React.FC<Props> = ({ session, mock, open, onContinue }) => {
  if (!open) return null;

  const partner = mock.partners.find((p) => p.coAttestedAt);
  const jury = session.people.find((p) => p.role === 'jury');
  const hours = formatDurationHoursLabel(session.durationHours);

  return (
    <div className="sc-overlay" role="dialog" aria-modal="true" aria-labelledby="sc-birth-title">
      <div className="sc-panel sc-birth">
        <div className="sc-panel-bar">Preuve Formation</div>
        <div className="sc-panel-inner">
          <div className="sc-big" id="sc-birth-title">
            Votre Preuve Formation est née.
          </div>
          <p className="sc-sub">
            Authentique et vérifiable — elle rejoint les preuves de votre structure.
          </p>
          <div className="sc-pf">
            <div className="sc-pf-h">
              <span>KINSHIP · PREUVE FORMATION</span>
              <span>{formatProofCodeDisplay(mock.proofCode)}</span>
            </div>
            <div className="sc-pf-b">
              <div className="sc-pf-1">{session.title}</div>
              <div className="sc-pf-2">
                {formatDateShortFr(session.startDate)} → {formatDateShortFr(session.endDate)}
                {hours ? ` · ${hours}` : ''}
                <br />
                {session.orgName} · ◆ Organisme de formation certifié
              </div>
              <div className="sc-pf-3">
                {jury && (
                  <>
                    ✓ Réussite validée par le jury — {jury.name}
                    {jury.functionLabel ? `, ${jury.functionLabel}` : ''}
                    <br />
                  </>
                )}
                {partner && (
                  <>
                    ✓ Co-attestée par {partner.name}
                    {partner.functionLabel ? `, ${partner.functionLabel}` : ''}
                    {partner.organization ? `, ${partner.organization}` : ''}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="sc-foot">
            <button type="button" className="sc-btn p" onClick={onContinue}>
              Continuer
            </button>
          </div>
          <p className="sc-hint">
            En coulisses : le rapport part au financeur ; les certificats de réalisation partent
            aux participants.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionProofBirthOverlay;
