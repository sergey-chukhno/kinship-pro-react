import React from 'react';
import { ProofData } from '../../types/proof';
import { TRUST_LEVEL_STYLES, truncateProofNumber } from '../../utils/proofTrustLevel';
import { ProofChevron } from '../Proof/ProofShared';
import { displayCompetenceName, tintWithWhite } from '../../constants/cartographieColors';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import CompetenceIcon, { hasCompetenceIcon } from './CompetenceIcon';
import '../Proof/Proof.css';

interface Props {
  proof: ProofData;
  axeColor: string;
}

/**
 * Carte Compétence de la cartographie. Bandeau = couleur de qui atteste,
 * famille « Compétence » en teinte claire. Contour 1,5 px dans cette même
 * couleur. Pictogramme d'axe sur pastille teintée. Niveau de confiance sous le trait.
 */
const ProofCardCarto: React.FC<Props> = ({ proof, axeColor }) => {
  const style = TRUST_LEVEL_STYLES[proof.trustLevel];
  const cardColor = style.accentColor;
  const competenceName = displayCompetenceName(proof.badgeTitle);
  const levelNum = proof.badgeLevel.match(/(\d+)/)?.[1];
  const badgeImage = hasCompetenceIcon(competenceName)
    ? undefined
    : getLocalBadgeImage(
        proof.badgeTitle.replace(/\s*[\u2013\u2014]\s*/g, ' - '),
        levelNum ? `level_${levelNum}` : undefined,
        proof.seriesPill
      );
  const contextTitle = proof.projectTitle ?? proof.eventTitle ?? '—';

  return (
    <div className="carto-proof-card" style={{ borderColor: cardColor }}>
      <div className="carto-proof-band" style={{ background: cardColor, color: tintWithWhite(cardColor, 0.72) }}>
        Compétence
      </div>
      <div className="carto-proof-body">
        <div className="carto-proof-title">{proof.badgeTitle}</div>
        {proof.senderOrgType && <div className="carto-proof-orgtype">{proof.senderOrgType}</div>}
        <hr className="carto-proof-hr" />
        <div className="carto-proof-trust">{proof.qaLabel}</div>
        <div className="carto-proof-context">
          <div className="carto-proof-icon" style={{ background: `${axeColor}20`, color: axeColor }}>
            {hasCompetenceIcon(competenceName) ? (
              <CompetenceIcon name={competenceName} size={20} color={axeColor} />
            ) : badgeImage ? (
              <img src={badgeImage} alt="" className="carto-ring-center-image" />
            ) : (
              <span className="carto-proof-icon-fallback">{proof.badgeIcon}</span>
            )}
          </div>
          <div className="carto-proof-context-text">
            <div className="carto-proof-project">{contextTitle}</div>
            {proof.senderOrg && <div className="carto-proof-org">{proof.senderOrg}</div>}
          </div>
        </div>
        <div className="carto-proof-date">{proof.awardedDate}</div>
      </div>
      <div className="carto-proof-footer">
        <span className="carto-proof-num">{truncateProofNumber(proof.proofNumber, true)}</span>
        <ProofChevron />
      </div>
    </div>
  );
};

export default ProofCardCarto;
