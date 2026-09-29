import React from 'react';
import { ProofData } from '../../types/proof';
import { TRUST_LEVEL_STYLES, truncateProofNumber, getProofSurtitle } from '../../utils/proofTrustLevel';
import { ProofChevron } from '../Proof/ProofShared';
import { displayCompetenceName } from '../../constants/cartographieColors';
import CompetenceIcon, { hasCompetenceIcon } from './CompetenceIcon';
import '../Proof/Proof.css';

interface Props {
  proof: ProofData;
  axeColor: string;
}

/**
 * Carte « Preuve Kinship » pour la cartographie — maquette fournie par Fatima
 * (25/09) : bande fine (surtitre seul), titre en clair, sous-titre = type
 * d'organisme réel, pictogramme de la compétence, projet + organisme, date,
 * numéro de preuve. Variante propre à la cartographie (ne touche pas
 * ProofCardCompact/ProofCardIntermediate, utilisés ailleurs dans l'appli) —
 * réutilise volontairement les classes de couleur par niveau de confiance de
 * Proof.css pour rester cohérente avec le reste du système de preuves.
 */
const ProofCardCarto: React.FC<Props> = ({ proof, axeColor }) => {
  const style = TRUST_LEVEL_STYLES[proof.trustLevel];
  const competenceName = displayCompetenceName(proof.badgeTitle);
  const contextTitle = proof.projectTitle ?? proof.eventTitle ?? '—';

  return (
    <div className="carto-proof-card">
      <div className={`carto-proof-band ${style.headerClass}`}>{getProofSurtitle(proof)}</div>
      <div className="carto-proof-body">
        <div className="carto-proof-title">{proof.badgeTitle}</div>
        {proof.senderOrgType && <div className="carto-proof-orgtype">{proof.senderOrgType}</div>}
        <hr className="carto-proof-hr" />
        <div className="carto-proof-context">
          <div className="carto-proof-icon" style={{ background: `${axeColor}20` }}>
            {hasCompetenceIcon(competenceName) ? (
              <CompetenceIcon name={competenceName} size={20} />
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
