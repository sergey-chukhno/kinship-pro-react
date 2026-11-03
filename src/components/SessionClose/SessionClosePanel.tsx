import React, { useMemo } from 'react';
import type { FormationSession } from '../../types/formationSession';
import {
  deliversMicrocert,
  ensureJuryDefaults,
  setCloseOptionsMock,
  setJuryDecisionMock,
  setResultNoteMock,
  validInvalidCounts,
  type SessionCloseMock,
} from '../../utils/sessionCloseMock';
import { formatDateShortFr, formatDurationHoursLabel } from '../../utils/sessionCloseCopy';
import { participantCountLabel } from '../../utils/formationSessionStore';
import './SessionClose.css';

type Props = {
  session: FormationSession;
  mock: SessionCloseMock;
  onCancel: () => void;
  onRequestConfirm: () => void;
  onMockChange: () => void;
};

const SessionClosePanel: React.FC<Props> = ({
  session,
  mock: rawMock,
  onCancel,
  onRequestConfirm,
  onMockChange,
}) => {
  const mock = useMemo(
    () => ensureJuryDefaults(session, rawMock),
    [session, rawMock]
  );
  const mc = deliversMicrocert(session);
  const deliverWord = mc ? 'microcertifications' : 'preuves de formation';
  const participants = session.people.filter((p) => p.role === 'participant');
  const { valid, invalid } = validInvalidCounts(mock);
  const shown = participants.slice(0, 4);
  const more = Math.max(0, participants.length - shown.length);
  const hoursLabel = formatDurationHoursLabel(session.durationHours);

  const refresh = () => onMockChange();

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
            {mock.endDeclaredAt ? ` le ${formatDateShortFr(mock.endDeclaredAt)}` : ''} par{' '}
            {session.formateur.name}, formateur responsable
            {hoursLabel ? ` · ${hoursLabel}` : ''} · {participantCountLabel(participants.length)}
          </p>

          {mock.endMessage && (
            <div className="sc-msg">
              Message du formateur : « {mock.endMessage} »
            </div>
          )}

          <div className="sc-sech">Décision du jury</div>
          <p className="sc-sub">
            Tous les participants sont validés par défaut. Pour ceux que le jury n&apos;a pas
            validés, choisissez « Ne pas valider ».
          </p>

          {shown.map((p) => {
            const d = mock.juryDecisions[p.id] || 'valid';
            return (
              <div key={p.id} className="sc-prow">
                <span className="n">{p.name}</span>
                {mock.attachResults && d === 'valid' && (
                  <span className="sc-note">
                    <input
                      aria-label={`Note ${p.name}`}
                      value={mock.resultNotes[p.id] || ''}
                      placeholder="—"
                      onChange={(e) => {
                        setResultNoteMock(session.id, p.id, e.target.value);
                        refresh();
                      }}
                    />
                  </span>
                )}
                <button
                  type="button"
                  className={`sc-dec ${d === 'valid' ? 'ok' : 'no'}`}
                  onClick={() => {
                    setJuryDecisionMock(
                      session.id,
                      p.id,
                      d === 'valid' ? 'invalid' : 'valid'
                    );
                    refresh();
                  }}
                >
                  {d === 'valid' ? '✓ Validé(e)' : 'Non validé'}
                </button>
              </div>
            );
          })}
          {more > 0 && <div className="sc-more">+ {more} participants</div>}
          <div className="sc-recap">
            <span>
              <b>{valid}</b> validés
            </span>
            <span>
              <b>{invalid}</b> non validés
            </span>
          </div>

          <div className="sc-q">
            <div className="sc-line">
              <span>Joindre les résultats de l&apos;évaluation aux {deliverWord} ?</span>
              <span className="sc-seg">
                <button
                  type="button"
                  className={mock.attachResults ? 'on' : ''}
                  onClick={() => {
                    setCloseOptionsMock(session.id, { attachResults: true });
                    refresh();
                  }}
                >
                  Oui
                </button>
                <button
                  type="button"
                  className={!mock.attachResults ? 'on' : ''}
                  onClick={() => {
                    setCloseOptionsMock(session.id, { attachResults: false });
                    refresh();
                  }}
                >
                  Non
                </button>
              </span>
            </div>
            <div className="sc-line">
              <span>Afficher le nom du formateur sur les {deliverWord}</span>
              <span className="sc-seg">
                <button
                  type="button"
                  className={mock.showTrainerName ? 'on' : ''}
                  onClick={() => {
                    setCloseOptionsMock(session.id, { showTrainerName: true });
                    refresh();
                  }}
                >
                  Oui
                </button>
                <button
                  type="button"
                  className={!mock.showTrainerName ? 'on' : ''}
                  onClick={() => {
                    setCloseOptionsMock(session.id, { showTrainerName: false });
                    refresh();
                  }}
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
                sa <b>preuve de formation</b>, exportable vers Europass
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
