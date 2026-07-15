import React from 'react';
import { Link } from 'react-router-dom';
import { ProofData, ProofCardVariant } from '../../types/proof';
import {
  TRUST_LEVEL_STYLES,
  getProofRoute,
  getProofSurtitle,
  truncateProofNumber,
} from '../../utils/proofTrustLevel';
import './Proof.css';

export const ProofChevron: React.FC<{ large?: boolean }> = ({ large }) => (
  <div className={`proof-chevron ${large ? 'proof-chevron-lg' : ''}`} aria-hidden="true">
    <svg
      width={large ? 12 : 10}
      height={large ? 12 : 10}
      viewBox="0 0 12 12"
      fill="none"
      stroke="#9e9d97"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 3 8 6 4 9" />
    </svg>
  </div>
);

interface ProofHeaderProps {
  proof: ProofData;
  compact?: boolean;
  intermediate?: boolean;
}

export const ProofHeader: React.FC<ProofHeaderProps> = ({ proof, compact, intermediate }) => {
  const style = TRUST_LEVEL_STYLES[proof.trustLevel];
  const surtitle = getProofSurtitle(proof.proofType);
  const isStrategic = proof.trustLevel === 'STRATEGIC_PARTNER';

  if (compact) {
    return (
      <div className={`proof-compact-header ${style.headerClass}`}>
        <div className={`proof-compact-surtitle ${isStrategic ? 'proof-strategic-compact-surtitle' : ''}`}>
          {surtitle}
        </div>
        <div className="proof-compact-title">{proof.badgeTitle}</div>
        <div className={`proof-compact-qa ${isStrategic ? 'proof-strategic-compact-qa' : ''}`}>
          {proof.qaLabel}
        </div>
      </div>
    );
  }

  if (intermediate) {
    return (
      <div className={`proof-inter-header ${style.headerClass}`}>
        <div className={`proof-inter-surtitle ${isStrategic ? 'proof-strategic-compact-surtitle' : ''}`}>
          {surtitle}
        </div>
        <div className="proof-inter-title">{proof.badgeTitle}</div>
        <div className="proof-inter-header-row">
          <div className={`proof-inter-qa ${isStrategic ? 'proof-strategic-compact-qa' : ''}`}>
            {proof.qaLabel}
          </div>
          <div className="proof-inter-date">{proof.awardedDate}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`proof-z1 ${style.headerClass} ${proof.proofType === 'PE' ? 'proof-z1-pe' : ''}`}
    >
      <div className="proof-z1-top">
        <div className="proof-z1-badge-wrap">
          <div className="proof-z1-icon">{proof.badgeIcon}</div>
          <div>
            <div className="proof-z1-surtitle">{surtitle}</div>
            <div className="proof-z1-title">{proof.badgeTitle}</div>
            <div className="proof-z1-pills">
              <span className="proof-pill proof-pill-level">{proof.badgeLevel}</span>
              {proof.eqfPill && (
                <span className="proof-pill proof-pill-series proof-pill-eqf">{proof.eqfPill}</span>
              )}
              <span className="proof-pill proof-pill-series">{proof.seriesPill}</span>
            </div>
          </div>
        </div>
        <div className="proof-z1-status">
          <div className="proof-z1-attested">✓ {proof.statusBubble}</div>
          <div className="proof-z1-proof-num">{proof.proofNumber}</div>
        </div>
      </div>
      <div className="proof-z1-context">
        {proof.eventTitle && (
          <div>
            <div className="proof-z1-ctx-label">Événement</div>
            <div className="proof-z1-ctx-value">{proof.eventTitle}</div>
          </div>
        )}
        {proof.projectTitle && (
          <div>
            <div className="proof-z1-ctx-label">Projet</div>
            <div className="proof-z1-ctx-value">{proof.projectTitle}</div>
          </div>
        )}
        <div>
          <div className="proof-z1-ctx-label">Date</div>
          <div className="proof-z1-ctx-value">{proof.awardedDate}</div>
        </div>
      </div>
    </div>
  );
};

export const ProofSkillsList: React.FC<{
  proof: ProofData;
  compact?: boolean;
  maxItems?: number;
}> = ({ proof, compact, maxItems = 3 }) => {
  if (proof.presenceVerified) {
    return (
      <div className="proof-presence-block">
        <div className="proof-presence-title">Présence physique vérifiée</div>
        {(proof.presenceDate || proof.presenceLocation) && (
          <div className="proof-presence-sub">
            {[proof.presenceDate, proof.presenceLocation].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    );
  }

  const skills = proof.skills.slice(0, maxItems);
  const remaining = proof.skills.length - maxItems;

  return (
    <div className="proof-skills-list">
      {skills.map((skill) => (
        <div className="proof-skill-item" key={skill}>
          <div className="proof-skill-dot" />
          <div className={compact ? 'proof-inter-skill-text' : 'proof-skill-text'}>{skill}</div>
        </div>
      ))}
      {remaining > 0 && (
        <div style={{ fontSize: 11, color: '#9e9d97', marginTop: 3, paddingLeft: 13 }}>
          +{remaining} autres
        </div>
      )}
    </div>
  );
};

export const ProofFooter: React.FC<{ proof: ProofData; showCopyright?: boolean }> = ({
  proof,
  showCopyright = true,
}) => (
  <div className="proof-footer">
    <div className="proof-footer-links">
      <div className="proof-footer-main">
        ✓ Preuve authentique et vérifiable · Données de formation conservées par l&apos;émetteur
        jusqu&apos;au <strong>{proof.retentionExpiry}</strong> (obligation légale)
        <span className="proof-kin-i" tabIndex={0}>
          ⓘ
          <span className="proof-kin-tip">
            La date limite concerne la durée de conservation du dossier de formation par
            l&apos;émetteur. La preuve reste authentique et vérifiable — sans limite.
          </span>
        </span>
      </div>
      <div className="proof-footer-right">
        {proof.showRightsLink && (
          <Link to="/droits" className="proof-rights-link">
            Exercer mes droits
          </Link>
        )}
        {showCopyright && <div className="proof-copyright">© 2026 Kinship SAS</div>}
      </div>
    </div>
  </div>
);

interface ProofCardLinkProps {
  proof: ProofData;
  variant: ProofCardVariant;
  children: React.ReactNode;
  className?: string;
}

export const ProofCardLink: React.FC<ProofCardLinkProps> = ({
  proof,
  variant,
  children,
  className = '',
}) => {
  if (variant === 'full') {
    return <div className={className}>{children}</div>;
  }

  return (
    <Link
      to={getProofRoute(proof)}
      className={`proof-card-link ${className}`}
      aria-label={`Voir la preuve ${proof.badgeTitle}`}
    >
      {children}
    </Link>
  );
};

export { truncateProofNumber, getProofRoute, TRUST_LEVEL_STYLES };
