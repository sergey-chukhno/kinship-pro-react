import React from 'react';
import './CloseProjectModal.css';

interface CloseProjectBirthOverlayProps {
  title: string;
  organization?: string;
  onOpen: () => void;
  onContinue: () => void;
}

const CloseProjectBirthOverlay: React.FC<CloseProjectBirthOverlayProps> = ({
  title,
  organization,
  onOpen,
  onContinue,
}) => (
  <div className="pp-birth-overlay" role="dialog" aria-label="Preuve Projet née">
    <div className="pp-birth-title">Votre Preuve Projet est née.</div>
    <div className="pp-birth-sub">Authentique et vérifiable — elle rejoint les preuves de votre structure.</div>
    <div className="pp-birth-card">
      <div className="pp-birth-card-head">
        <div className="pp-birth-k">
          <svg width="30" height="30" viewBox="0 0 52 52" aria-hidden>
            <polygon points="26,2 50,14 50,38 26,50 2,38 2,14" fill="#fff" opacity=".92" />
            <text x="26" y="32" textAnchor="middle" fontSize="14" fontWeight="600" fill="#48A78D">K</text>
          </svg>
          <div>
            <div className="pp-birth-kname">Kinship</div>
            <div className="pp-birth-ktype">Preuve Projet®</div>
          </div>
        </div>
      </div>
      <div className="pp-birth-card-title">{title}</div>
      {organization ? <div className="pp-birth-card-meta">{organization}</div> : <div className="pp-birth-card-meta" />}
    </div>
    <div className="pp-birth-actions">
      <button type="button" className="pp-birth-open" onClick={onOpen}>Ouvrir la preuve</button>
      <button type="button" className="pp-birth-continue" onClick={onContinue}>Continuer</button>
    </div>
  </div>
);

export default CloseProjectBirthOverlay;
