import React, { useState } from 'react';
import type { FormationSession } from '../../types/formationSession';
import type { MockCertificate, SessionCloseMock } from '../../utils/sessionCloseMock';
import './SessionClose.css';

type Props = {
  session: FormationSession;
  mock: SessionCloseMock;
  open: boolean;
  onClose: () => void;
};

const SessionCertificateOrgView: React.FC<Props> = ({ session, mock, open, onClose }) => {
  const [selected, setSelected] = useState<MockCertificate | null>(
    mock.certificates[0] || null
  );

  if (!open) return null;

  const cert = selected || mock.certificates[0];
  if (!cert) {
    return (
      <div className="sc-overlay" role="dialog" aria-modal="true">
        <div className="sc-modal">
          <p>Aucun certificat généré.</p>
          <button type="button" className="sc-btn g" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-overlay" role="dialog" aria-modal="true" aria-labelledby="sc-cert-title">
      <div className="sc-panel" style={{ maxWidth: 540 }}>
        <div className="sc-panel-bar" id="sc-cert-title">
          Certificat de réalisation · vue organisme
        </div>
        <div className="sc-panel-inner">
          <div style={{ marginBottom: 10 }}>
            {mock.certificates.map((c) => (
              <button
                key={c.participantId}
                type="button"
                className="sc-btn sm s"
                style={{ marginRight: 6, marginBottom: 6 }}
                onClick={() => setSelected(c)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <span className={`sc-st ${cert.status === 'sent' ? 'ok' : 'pr'}`}>
            {cert.status === 'sent'
              ? `Envoyé par e-mail${cert.sentAt ? ` le ${cert.sentAt}` : ''}`
              : 'E-mail en échec après relance — à imprimer, remise en main propre'}
          </span>

          <div className="sc-cert-a4">
            <div className="sc-cert-ttl">CERTIFICAT DE RÉALISATION</div>
            <div className="sc-cert-law">
              Art. R. 6332-26 du Code du travail · arrêté du 21 décembre 2018 modifié
            </div>
            <p>
              Je soussigné(e), représentant(e) légal(e) du dispensateur de formation de{' '}
              <b>{session.orgName}</b> · ◆ Organisme de formation certifié
              <br />
              <br />
              atteste que <b>{cert.name}</b> a suivi l&apos;action de formation
              <br />
              Intitulé : <b>« {session.title} »</b>
              <br />
              du <b>{session.startDate}</b> au <b>{session.endDate}</b>
              {session.durationHours ? (
                <>
                  {' '}
                  — durée totale : <b>{session.durationHours}</b>
                </>
              ) : null}
            </p>
            <div className="sc-enc">
              <b>Assiduité :</b> {cert.assiduity}
            </div>
            <p className="sc-hint">
              Les justificatifs de réalisation sont conservés pendant 3 ans à compter de la fin de
              l&apos;année du dernier paiement.
            </p>
          </div>

          <div className="sc-sech">Encarts d&apos;assiduité (aperçu)</div>
          {mock.certificates.slice(0, 3).map((c) => (
            <div key={c.participantId} className="sc-prow" style={{ flexWrap: 'wrap' }}>
              <span className="n">{c.name}</span>
              <span className="sc-enc" style={{ flex: 1, margin: 0 }}>
                <b>Assiduité :</b> {c.assiduity}
              </span>
            </div>
          ))}

          <div className="sc-foot">
            <button type="button" className="sc-btn s sm">
              {cert.status === 'failed' ? 'Imprimer' : 'Imprimer'}
            </button>
            <button type="button" className="sc-btn s sm">
              Renvoyer par e-mail
            </button>
            <button type="button" className="sc-btn g" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionCertificateOrgView;
