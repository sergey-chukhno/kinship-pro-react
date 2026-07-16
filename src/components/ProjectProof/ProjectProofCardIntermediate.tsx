import React from 'react';
import { ProjectProofData } from '../../types/projectProof';
import { getProjectProofLevelStyle } from '../../utils/projectProofLevel';
import ProjectProofSeal from './ProjectProofSeal';
import {
  ProjectProofCardLink,
  ProjectProofChevron,
  truncatePpNumber,
} from './ProjectProofCardShared';
import './ProjectProof.css';

interface ProjectProofCardIntermediateProps {
  proof: ProjectProofData;
  linkTarget?: 'pik' | 'public';
}

const ProjectProofCardIntermediate: React.FC<ProjectProofCardIntermediateProps> = ({
  proof,
  linkTarget = 'pik',
}) => {
  const levelStyle = getProjectProofLevelStyle(proof.level);

  return (
    <ProjectProofCardLink
      proof={proof}
      linkTarget={linkTarget}
      className="pp-card-intermediate"
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
              Preuve Projet®
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
        <div className="pp-inter-title">{proof.projectTitle}</div>
        <div className="pp-inter-meta">
          {proof.dateRange} · {proof.location}
        </div>
      </div>

      <div className="pp-inter-identity">
        <div className={`pp-inter-avatar ${levelStyle.avatarModifier}`}>
          {proof.holderInitials}
        </div>
        <div>
          <div
            className={`pp-inter-id-name ${levelStyle.idNameAccent ? 'pp-id-name-gold' : ''}`}
          >
            {proof.holderName}
          </div>
          <div className="pp-inter-id-role">{proof.holderRole}</div>
        </div>
        <div className="pp-inter-org">{proof.orgName}</div>
      </div>

      <div className="pp-inter-status">
        <span className="pp-dot" />
        <span className="pp-inter-status-text">Preuve Projet® active</span>
      </div>

      <div className="pp-inter-kpis">
        <div className="pp-inter-kpi">
          <div className="pp-inter-kpi-n">{proof.kpis.participants}</div>
          <div className="pp-inter-kpi-l">Participants</div>
        </div>
        <div className="pp-inter-kpi">
          <div className="pp-inter-kpi-n">{proof.kpis.coAttestants}</div>
          <div className="pp-inter-kpi-l">Co-att.</div>
        </div>
        <div className="pp-inter-kpi">
          <div className="pp-inter-kpi-n">{proof.kpis.badges}</div>
          <div className="pp-inter-kpi-l">Badges</div>
        </div>
      </div>

      <div className="pp-inter-footer">
        <span className="pp-inter-footer-num">{proof.proofNumber}</span>
        <ProjectProofChevron large />
      </div>
    </ProjectProofCardLink>
  );
};

export default ProjectProofCardIntermediate;
