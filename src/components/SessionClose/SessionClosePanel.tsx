import React, { useMemo } from 'react';
import type { FormationSession } from '../../types/formationSession';
import { deliversMicrocert, validInvalidCounts, type SessionCloseMock } from '../../utils/sessionCloseMock';
import { formatDateShortFr, formatDurationHoursLabel } from '../../utils/sessionCloseCopy';
import { participantCountLabel } from '../../utils/formationSessionStore';
import './SessionClose.css';

export type SessionCloseDraft = {
  juryDecisions: Record<string, 'valid' | 'invalid'>;
  resultNotes: Record<string, string>;
  showTrainerName: boolean;
  endDeclaredAt?: string;
  endMessage?: string;
};

type Props = {
  session: FormationSession;
  draft: SessionCloseDraft;
  onCancel: () => void;
  onRequestConfirm: () => void;
  onDraftChange: (next: SessionCloseDraft) => void;
};

const SessionClosePanel: React.FC<Props> = ({
  session,
  draft,
  onCancel,
  onRequestConfirm,
  onDraftChange,
}) => {
  const mc = deliversMicrocert(session);
  const deliverWord = mc ? 'microcertifications' : 'preuves de formation';
  const participants = session.people.filter((p) => p.role === 'participant');
  const counts = useMemo(
    () => validInvalidCounts(draft as SessionCloseMock),
    [draft]
  );
  const shown = participants.slice(0, 4);
  const more = Math.max(0, participants.length - shown.length);
  const hoursLabel = formatDurationHoursLabel(session.durationHours);

  const setDecision = (id: string, next: 'valid' | 'invalid') => {
    onDraftChange({
      ...draft,
      juryDecisions: { ...draft.juryDecisions, [id]: next },
    });
  };

  const setNote = (id: string, value: string) => {
    onDraftChange({
      ...draft,
      resultNotes: { ...draft.resultNotes, [id]: value },
    });
  };

  return (
    <div className="sc-overlay" role="dialog" aria-modal="true" aria-labelledby="sc-close-title">
      <div className="sc-panel">
        <div className="sc-panel-bar">Clôture de la session</div>
        <div className="sc-panel-inner">
          <h2 className="sc-head" id="sc-close-title">
            Clôture de la session — {session.title}
          </h2>
          <p className="sc-sub">
            Fin de session déclarée
            {draft.endDeclaredAt ? ` le ${formatDateShortFr(draft.endDeclaredAt)}` : ''} par{' '}
            {session.formateur.name}, formateur responsable
            {hoursLabel ? ` · ${hoursLabel}` : ''} · {participantCountLabel(participants.length)}
          </p>

          {draft.endMessage && (
            <div className="sc-msg">
              Message du formateur : « {draft.endMessage} »
            </div>
          )}

          <div className="sc-sech">Décision du jury</div>
          <p className="sc-sub">
            Tous les participants sont validés par défaut. Pour ceux que le jury n&apos;a pas
            validés, choisissez « Ne pas valider ».
          </p>

          {shown.map((p) => {
            const d = draft.juryDecisions[p.id] || 'valid';
            return (
              <div key={p.id} className="sc-prow">
                <span className="n">{p.name}</span>
                {d === 'valid' && (
                  <span className="sc-note">
                    <input
                      aria-label={`Note ${p.name}`}
                      value={draft.resultNotes[p.id] || ''}
                      placeholder="—"
                      onChange={(e) => setNote(p.id, e.target.value)}
                    />
                  </span>
                )}
                <button
                  type="button"
                  className={`sc-dec ${d === 'valid' ? 'ok' : 'no'}`}
                  onClick={() => setDecision(p.id, d === 'valid' ? 'invalid' : 'valid')}
                >
                  {d === 'valid' ? '✓ Validé(e)' : 'Non validé'}
                </button>
              </div>
            );
          })}
          {more > 0 && <div className="sc-more">+ {more} participants</div>}
          <div className="sc-recap">
            <span>
              <b>{counts.valid}</b> validés
            </span>
            <span>
              <b>{counts.invalid}</b> non validés
            </span>
          </div>

          <div className="sc-q">
            {/* Patrick 12/11 — « joindre » caché ; les notes restent ci-dessus. */}
            <div className="sc-line">
              <span>Afficher le nom du formateur sur les {deliverWord}</span>
              <span className="sc-seg">
                <button
                  type="button"
                  className={draft.showTrainerName ? 'on' : ''}
                  onClick={() => onDraftChange({ ...draft, showTrainerName: true })}
                >
                  Oui
                </button>
                <button
                  type="button"
                  className={!draft.showTrainerName ? 'on' : ''}
                  onClick={() => onDraftChange({ ...draft, showTrainerName: false })}
                >
                  Non
                </button>
              </span>
            </div>
          </div>

          <div className="sc-fin">
            Votre financeur sera informé de l&apos;achèvement et recevra le rapport de la session.
          </div>

          <p className="sc-warnline">
            La clôture délivre à chaque participant validé{' '}
            {mc ? (
              <>
                sa <b>microcertification</b>
              </>
            ) : (
              <>
                sa <b>preuve de formation</b>
              </>
            )}
            , et à chaque participant son <b>certificat de réalisation</b>. Le participant non
            validé reste inscrit à la session : il garde son certificat et ses preuves de présence.
            On ne rouvre pas une session close.
          </p>

          <div className="sc-foot">
            <button type="button" className="sc-btn g" onClick={onCancel}>
              Annuler
            </button>
            <button type="button" className="sc-btn am" onClick={onRequestConfirm}>
              Clôturer et délivrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionClosePanel;
