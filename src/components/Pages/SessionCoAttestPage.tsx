import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSessionById } from '../../utils/formationSessionStore';
import {
  coAttestPartnerMock,
  findPartnerByToken,
  subscribeSessionCloseMock,
} from '../../utils/sessionCloseMock';
import {
  formatDateShortFr,
  formatDurationHoursLabel,
} from '../../utils/sessionCloseCopy';
import '../SessionClose/SessionClose.css';

const SessionCoAttestPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [tick, setTick] = useState(0);
  React.useEffect(() => subscribeSessionCloseMock(() => setTick((n) => n + 1)), []);

  const hit = useMemo(() => (token ? findPartnerByToken(token) : null), [token, tick]);
  const session = hit ? getSessionById(hit.sessionId) : undefined;

  const [name, setName] = useState('');
  const [functionLabel, setFunctionLabel] = useState('');
  const [organization, setOrganization] = useState('');

  React.useEffect(() => {
    if (!hit) return;
    setName(hit.partner.name);
    setFunctionLabel(hit.partner.functionLabel);
    setOrganization(hit.partner.organization);
  }, [hit?.partner.id]);

  if (!hit || !session) {
    return (
      <div className="sc-overlay" style={{ position: 'relative', minHeight: '100vh' }}>
        <div className="sc-modal">
          <h2>Lien invalide ou expiré</h2>
          <p>Ce lien de co-attestation n&apos;est plus valide (session close ou jeton inconnu).</p>
        </div>
      </div>
    );
  }

  const done = Boolean(hit.partner.coAttestedAt);
  const closed = hit.mock.closed;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--fs-bg-deep, #eceae4)',
        padding: 24,
        fontFamily: 'var(--fs-font)',
      }}
    >
      <div className="sc-panel" style={{ margin: '0 auto' }}>
        <div className="sc-panel-bar">Co-attester la session</div>
        <div className="sc-panel-inner">
          <div className="sc-enc" style={{ marginTop: 0 }}>
            <b>
              {session.title}
            </b>
            <br />
            {session.orgName} · ◆ Organisme de formation certifié
            <br />
            {formatDateShortFr(session.startDate)} → {formatDateShortFr(session.endDate)}
            {formatDurationHoursLabel(session.durationHours)
              ? ` · ${formatDurationHoursLabel(session.durationHours)}`
              : ''}{' '}
            · {session.people.filter((p) => p.role === 'participant').length} participants
          </div>

          {closed && !done && (
            <p className="sc-warnline">
              La session est déjà clôturée : ce lien ne peut plus être utilisé.
            </p>
          )}

          {done ? (
            <>
              <div
                className="sc-msg"
                style={{ fontStyle: 'normal', background: 'var(--fs-ok-soft)', color: 'var(--fs-ok)' }}
              >
                ✓ Co-attestée par {hit.partner.name}, {hit.partner.functionLabel},{' '}
                {hit.partner.organization}
                {hit.partner.coAttestedAt
                  ? ` — le ${formatDateShortFr(hit.partner.coAttestedAt)}`
                  : ''}
              </div>
              <p className="sc-hint">
                Créez votre espace gratuit — vos co-attestations vous suivront.
              </p>
            </>
          ) : (
            <>
              <p className="sc-sub">
                Vous voyez la synthèse de la session, jamais la liste des participants. Lien
                personnel, valable jusqu&apos;à la clôture, pour une seule co-attestation.
              </p>
              <div className="sc-field">
                <label>
                  Votre nom <span style={{ color: 'var(--fs-danger)' }}>✱</span>
                </label>
                <input value={name} onChange={(e) => setName(e.target.value)} disabled={closed} />
              </div>
              <div className="sc-field">
                <label>
                  Votre fonction <span style={{ color: 'var(--fs-danger)' }}>✱</span>
                </label>
                <input
                  value={functionLabel}
                  onChange={(e) => setFunctionLabel(e.target.value)}
                  disabled={closed}
                />
              </div>
              <div className="sc-field">
                <label>
                  Votre organisation <span style={{ color: 'var(--fs-danger)' }}>✱</span>
                </label>
                <input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  disabled={closed}
                />
              </div>
              <div className="sc-foot">
                <button
                  type="button"
                  className="sc-btn p"
                  disabled={closed || !name.trim() || !functionLabel.trim() || !organization.trim()}
                  onClick={() => {
                    coAttestPartnerMock(token, { name, functionLabel, organization });
                    setTick((n) => n + 1);
                  }}
                >
                  Co-attester la session
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionCoAttestPage;
