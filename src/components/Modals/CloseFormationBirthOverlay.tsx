import React from 'react';
import './CloseProjectModal.css';
import './CloseFormationBirthOverlay.css';

interface CloseFormationBirthOverlayProps {
  title: string;
  organization?: string;
  proofNumber?: string;
  datesLabel?: string;
  qualiopi?: boolean;
  euMc?: boolean;
  onOpen: () => void;
  onContinue: () => void;
}

const CloseFormationBirthOverlay: React.FC<CloseFormationBirthOverlayProps> = ({
  title,
  organization,
  proofNumber = 'PF·2027·FR·4K8NX2QM',
  datesLabel,
  qualiopi,
  euMc,
  onOpen,
  onContinue,
}) => (
  <div className="pp-birth-overlay pf-birth-overlay" role="dialog" aria-label="Preuve Formation née">
    <div className="pp-birth-title">Votre Preuve Formation est née.</div>
    <div className="pp-birth-sub">Authentique et vérifiable — elle rejoint les preuves de votre structure.</div>
    <div className={`pfc ${euMc ? 'eumc' : ''}`}>
      <div className="pfc-head">
        <div className="pfc-brand">
          <svg width="30" height="30" viewBox="0 0 52 52" aria-hidden>
            <polygon points="26,2 50,14 50,38 26,50 2,38 2,14" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" />
            <text x="26" y="31" textAnchor="middle" fontSize="14" fontWeight="500" fill="#fff">K</text>
          </svg>
          <div>
            <div className="pfc-kname">Kinship</div>
            <div className="pfc-ktype">{euMc ? 'Microcertification UE' : 'Preuve Formation®'}</div>
          </div>
        </div>
        <div className="pfc-num">{proofNumber.replace('·', '·\n')}</div>
      </div>
      <div className="pfc-body">
        <div className="pfc-titre">{title}</div>
        {datesLabel ? <div className="pfc-dates">{datesLabel}</div> : null}
        {organization ? (
          <div className="pfc-org">
            <span className="pfc-flag" aria-hidden>
              <span /><span /><span />
            </span>
            <span className="pfc-orgname">{organization}</span>
          </div>
        ) : null}
        {qualiopi ? <div className="pfc-trust">◆ Reconnu et certifié par Qualiopi</div> : null}
        <div className="pfc-share">
          <div className="pfc-qr" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 40 40">
              <rect x="4" y="4" width="11" height="11" fill="#1a1a2e" rx="1" />
              <rect x="25" y="4" width="11" height="11" fill="#1a1a2e" rx="1" />
              <rect x="4" y="25" width="11" height="11" fill="#1a1a2e" rx="1" />
              <rect x="27" y="27" width="5" height="5" fill="#1a1a2e" rx="1" />
            </svg>
          </div>
          <div>
            <div className="pfc-share-t">Partager cette preuve</div>
            <div className="pfc-share-h">b7e4a1…f293 · vérifiable</div>
          </div>
        </div>
      </div>
    </div>
    <div className="pp-birth-actions">
      <button type="button" className="pp-birth-open" onClick={onOpen}>Ouvrir la preuve</button>
      <button type="button" className="pp-birth-continue" onClick={onContinue}>Continuer</button>
    </div>
  </div>
);

export default CloseFormationBirthOverlay;
