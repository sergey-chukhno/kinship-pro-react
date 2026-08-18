import React from 'react';
import { Link } from 'react-router-dom';
import { FormationProofData } from '../../types/formationProof';
import { getFormationProofLevelStyle } from '../../utils/formationProofLevel';
import ProjectProofSeal from '../ProjectProof/ProjectProofSeal';
import { ProjectProofChevron, truncatePpNumber } from '../ProjectProof/ProjectProofCardShared';
import '../ProjectProof/ProjectProof.css';

export function getFormationProofHref(
  token: string,
  linkTarget: 'pik' | 'public' = 'pik'
): string {
  return linkTarget === 'pik' ? `/pik/preuve/pf/${token}` : `/pf/${token}`;
}

interface FormationProofCardIntermediateProps {
  proof: FormationProofData;
  linkTarget?: 'pik' | 'public';
}

const FormationProofCardIntermediate: React.FC<FormationProofCardIntermediateProps> = ({
  proof,
  linkTarget = 'pik',
}) => {
  const levelStyle = getFormationProofLevelStyle(proof.level);

  return (
    <Link
      to={getFormationProofHref(proof.shareToken, linkTarget)}
      className="pp-card-link pp-card-intermediate"
      style={levelStyle.cardBorder ? { border: levelStyle.cardBorder } : undefined}
    >
      {levelStyle.mcBarVisible && (
        <div className={`pp-inter-mc ${levelStyle.mcBarClass}`}>
          <span className="pp-inter-mc-title">{levelStyle.mcTitle}</span>
          <span className="pp-inter-mc-sub">{levelStyle.mcSub}</span>
        </div>
      )}

      <div className="pp-inter-official">
        <div className="pp-inter-official-left">
          <ProjectProofSeal
            fill={levelStyle.sealFill}
            stroke={levelStyle.sealStroke}
            innerStroke={levelStyle.sealInnerStroke}
            textFill={levelStyle.sealTextFill}
            size={36}
          />
          <div>
            <div className="pp-inter-kname" style={{ color: levelStyle.kinshipNameColor }}>
              Kinship
            </div>
            <div className="pp-inter-ktype" style={{ color: levelStyle.kinshipTypeColor }}>
              Preuve Formation®
            </div>
          </div>
        </div>
        <div
          className="pp-inter-num"
          style={{ color: levelStyle.proofNumColor, fontWeight: levelStyle.proofNumWeight }}
        >
          {truncatePpNumber(proof.proofNumber)}
        </div>
      </div>

      <div className="pp-inter-title-band">
        <div className="pp-inter-title">{proof.formationTitle}</div>
        <div className="pp-inter-meta">
          {proof.dateRange} · {proof.kpis.hours} · {proof.modality}
        </div>
      </div>

      <div className="pp-inter-identity">
        <div className={`pp-inter-avatar ${levelStyle.avatarModifier}`}>{proof.holderInitials}</div>
        <div>
          <div className={`pp-inter-id-name ${levelStyle.idNameAccent ? 'pp-id-name-gold' : ''}`}>
            {proof.holderName}
          </div>
          <div className="pp-inter-id-role">{proof.holderRole}</div>
        </div>
        <div className="pp-inter-org">{proof.orgName}</div>
      </div>

      <div className="pp-inter-status">
        <span className="pp-dot" />
        <span className="pp-inter-status-text">Preuve Formation® active</span>
      </div>

      <div className="pp-inter-kpis">
        <div className="pp-inter-kpi">
          <div className="pp-inter-kpi-n">{proof.kpis.participants}</div>
          <div className="pp-inter-kpi-l">Participants</div>
        </div>
        <div className="pp-inter-kpi">
          <div className="pp-inter-kpi-n">{proof.kpis.sessions}</div>
          <div className="pp-inter-kpi-l">Séances</div>
        </div>
        <div className="pp-inter-kpi">
          <div className="pp-inter-kpi-n">{proof.kpis.proofs}</div>
          <div className="pp-inter-kpi-l">Preuves</div>
        </div>
      </div>

      <div className="pp-inter-footer">
        <span className="pp-inter-footer-num">{proof.proofNumber}</span>
        <ProjectProofChevron large />
      </div>
    </Link>
  );
};

export default FormationProofCardIntermediate;
