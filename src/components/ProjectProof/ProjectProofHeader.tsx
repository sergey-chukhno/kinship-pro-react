import React from 'react';
import { Link } from 'react-router-dom';
import { ProjectProofData } from '../../types/projectProof';
import { getProjectProofLevelStyle } from '../../utils/projectProofLevel';
import ProjectProofSeal from './ProjectProofSeal';
import './ProjectProof.css';

interface ProjectProofHeaderProps {
  proof: ProjectProofData;
  anonymous?: boolean;
  showHash?: boolean;
  showPorteurBar?: boolean;
  nominatif?: boolean;
  onToggleIdentity?: () => void;
  showRightsLink?: boolean;
}

export const ProjectProofHeader: React.FC<ProjectProofHeaderProps> = ({
  proof,
  anonymous = false,
  showHash = true,
  showPorteurBar = false,
  nominatif = true,
  onToggleIdentity,
  showRightsLink = false,
}) => {
  const levelStyle = getProjectProofLevelStyle(proof.level);
  const displayName = anonymous ? 'Identité non divulguée' : proof.holderName;
  const displayInitials = anonymous ? '?' : proof.holderInitials;

  return (
    <div className="pp-header">
      {showPorteurBar && (
        <div className="porteur-bar">
          <span className="porteur-label">Vous consultez votre Preuve Projet®</span>
          <div className="porteur-toggle">
            <span>Anonyme</span>
            <button
              type="button"
              className={`toggle-switch ${nominatif ? 'on' : ''}`}
              onClick={onToggleIdentity}
              aria-label="Basculer entre anonyme et nominatif"
            />
            <span>Nominatif</span>
          </div>
          {showRightsLink && (
            <Link to="/droits" className="btn-droits-sm">
              Mes droits →
            </Link>
          )}
        </div>
      )}

      {levelStyle.mcBarVisible && (
        <div className={`mc-bar ${levelStyle.mcBarClass}`}>
          <span className="mc-bar-title">{levelStyle.mcTitle}</span>
          <span className="mc-bar-sub">{levelStyle.mcSub}</span>
        </div>
      )}

      <div className="pp-official">
        <div className="pp-official-left">
          <ProjectProofSeal
            fill={levelStyle.sealFill}
            stroke={levelStyle.sealStroke}
            innerStroke={levelStyle.sealInnerStroke}
            textFill={levelStyle.sealTextFill}
          />
          <div>
            <div className="pp-kname" style={{ color: levelStyle.kinshipNameColor }}>
              Kinship
            </div>
            <div className="pp-ktype" style={{ color: levelStyle.kinshipTypeColor }}>
              Preuve Projet®
            </div>
          </div>
        </div>
        <div className="pp-official-right">
          <div
            className="pp-num"
            style={{ color: levelStyle.proofNumColor, fontWeight: levelStyle.proofNumWeight }}
          >
            {proof.proofNumber}
          </div>
          <div className="pp-org-row">
            <span className="pp-flag" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="pp-org-name">{proof.orgName}</span>
          </div>
          <div className="pp-org-trust">{proof.orgTrust}</div>
        </div>
      </div>

      <div className="pp-title-band">
        <h1 className="pp-titre">{proof.projectTitle}</h1>
        <div className="pp-meta">
          {proof.dateRange} · {proof.location}
        </div>
      </div>

      <div className="pp-identity">
        <div className={`pp-avatar ${levelStyle.avatarModifier}`}>{displayInitials}</div>
        <div>
          <div
            className={`pp-id-name ${levelStyle.idNameAccent ? 'pp-id-name-gold' : ''}`}
          >
            {displayName}
          </div>
          <div className="pp-id-role">{proof.holderRole}</div>
        </div>
      </div>

      <div className="pp-status">
        <div className="pp-dot" />
        <span className="pp-status-text">Preuve Projet® active</span>
        <span className="pp-status-text pp-status-date">
          Calculée le {proof.calculatedDate}
        </span>
      </div>

      {showHash && (
        <div className="pp-hash">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#003189"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span className="pp-hash-str">
            attestation · {proof.hashShort} · vérifiable
          </span>
          <Link to="/verify" className="pp-hash-pill">
            Vérifier ↗
          </Link>
        </div>
      )}
    </div>
  );
};

export default ProjectProofHeader;
