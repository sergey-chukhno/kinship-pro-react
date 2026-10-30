import React, { useState } from 'react';
import type { FormationSession } from '../../types/formationSession';
import type { MockCertificate, SessionCloseMock } from '../../utils/sessionCloseMock';
import {
  formatDateLongFr,
  formatDateRangeLongFr,
  formatDateShortFr,
  formatDurationHoursLabel,
  printCertificatesLabel,
} from '../../utils/sessionCloseCopy';
import './SessionClose.css';

type Props = {
  session: FormationSession;
  mock: SessionCloseMock;
  open: boolean;
  onClose: () => void;
};

const MODELS = [
  'France — ministère du Travail (2020, arrêté mod. 2024)',
  'France — modèle organisme',
];

const SessionCertificateOrgView: React.FC<Props> = ({ session, mock, open, onClose }) => {
  const [selected, setSelected] = useState<MockCertificate | null>(
    mock.certificates[0] || null
  );
  const [model, setModel] = useState(MODELS[0]);
  const [signerName, setSignerName] = useState('Nadia Reynaud');
  const [signerRole, setSignerRole] = useState('directrice');
  const [city, setCity] = useState('Aix-en-Provence');

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

  const modalityLabel =
    session.modality === 'presentiel'
      ? 'présentiel'
      : session.modality === 'distanciel'
        ? 'distanciel'
        : session.modality === 'hybride'
          ? 'hybride'
          : session.modality || 'présentiel';
  const hours = formatDurationHoursLabel(session.durationHours) || '—';
  const failedCount = mock.certificates.filter((c) => c.status === 'failed').length;

  return (
    <div className="sc-overlay" role="dialog" aria-modal="true" aria-labelledby="sc-cert-title">
      <div className="sc-panel" style={{ maxWidth: 560 }}>
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
              ? `Envoyé par e-mail le ${formatDateShortFr(cert.sentAt)}`
              : 'E-mail en échec après relance — à imprimer, remise en main propre'}
          </span>

          <div className="sc-field" style={{ marginBottom: 10 }}>
            <label>Modèle</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 7,
                border: '1px solid var(--fs-input)',
                fontFamily: 'inherit',
                fontSize: 11,
              }}
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div className="sc-field" style={{ flex: 1, margin: 0 }}>
              <label>Signataire</label>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 7,
                  border: '1px solid var(--fs-input)',
                  fontFamily: 'inherit',
                  fontSize: 11,
                }}
              />
            </div>
            <div className="sc-field" style={{ flex: 1, margin: 0 }}>
              <label>Fonction</label>
              <input
                value={signerRole}
                onChange={(e) => setSignerRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 7,
                  border: '1px solid var(--fs-input)',
                  fontFamily: 'inherit',
                  fontSize: 11,
                }}
              />
            </div>
            <div className="sc-field" style={{ flex: 1, margin: 0 }}>
              <label>Fait à</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 7,
                  border: '1px solid var(--fs-input)',
                  fontFamily: 'inherit',
                  fontSize: 11,
                }}
              />
            </div>
          </div>

          <div className="sc-cert-a4">
            <div className="sc-cert-ttl">CERTIFICAT DE RÉALISATION</div>
            <div className="sc-cert-law">
              Art. R. 6332-26 du Code du travail · arrêté du 21 décembre 2018 modifié
            </div>
            <p>
              Je soussignée <b>{signerName}</b>, {signerRole}
              <br />
              <span className="sc-box on" aria-hidden />
              représentante légale du dispensateur de formation &nbsp;
              <span className="sc-box" aria-hidden />
              prestataire de formation &nbsp;
              <span className="sc-box" aria-hidden />
              employeur (formation interne)
              <br />
              de <b>{session.orgName}</b> · ◆ Organisme de formation certifié
              <br />
              <br />
              atteste que <b>{cert.name}</b>
              <br />
              salarié(e) de l&apos;entreprise : —
              <br />
              a suivi l&apos;action de : <span className="sc-box on" aria-hidden />
              formation &nbsp;
              <span className="sc-box" aria-hidden />
              bilan de compétences &nbsp;
              <span className="sc-box" aria-hidden />
              VAE &nbsp;
              <span className="sc-box" aria-hidden />
              formation par apprentissage
              <br />
              Intitulé : <b>« {session.title} »</b>
              <br />
              {formatDateRangeLongFr(session.startDate, session.endDate)} — durée totale :{' '}
              <b>{hours}</b> · {modalityLabel}
            </p>
            <div className="sc-enc">
              <b>Assiduité :</b> {cert.assiduity}
            </div>
            <p className="sc-hint" style={{ color: '#637087' }}>
              Les justificatifs de réalisation sont conservés pendant 3 ans à compter de la fin de
              l&apos;année du dernier paiement (10 ans en cas de cofinancement européen).
            </p>
            <p style={{ marginTop: 8 }}>
              Fait à <b>{city}</b>, le <b>{formatDateLongFr(mock.closedAt || cert.sentAt)}</b>
            </p>
            <div className="sc-sig">
              <div className="sc-slot">✍ Signature électronique du responsable — horodatée</div>
              <div className="sc-slot">Cachet du dispensateur</div>
            </div>
            <div className="sc-qr">
              <div className="sc-qrbox" aria-hidden />
              <div>
                <b>Vos preuves vous attendent — scannez pour les récupérer.</b>
              </div>
            </div>
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
              {printCertificatesLabel(cert.status === 'failed' ? 1 : failedCount || 1)}
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
