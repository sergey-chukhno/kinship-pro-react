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

interface ProjectProofCardCompactProps {
  proof: ProjectProofData;
  linkTarget?: 'pik' | 'public';
}

const ProjectProofCardCompact: React.FC<ProjectProofCardCompactProps> = ({
  proof,
  linkTarget = 'pik',
}) => {
  const levelStyle = getProjectProofLevelStyle(proof.level);

  return (
    <ProjectProofCardLink
      proof={proof}
      linkTarget={linkTarget}
      className="pp-card-compact"
    >
      {levelStyle.mcBarVisible && (
        <div className={`pp-compact-mc ${levelStyle.mcBarClass}`}>
          {proof.level === 'EUMC' ? 'EU·MC' : proof.level === 'PPMC' ? 'PP·MC' : 'Rich'}
        </div>
      )}

      <div className="pp-compact-top">
        <ProjectProofSeal
          fill={levelStyle.sealFill}
          stroke={levelStyle.sealStroke}
          innerStroke={levelStyle.sealInnerStroke}
          textFill={levelStyle.sealTextFill}
          size={28}
        />
        <div>
          <div className="pp-compact-ktype" style={{ color: levelStyle.kinshipTypeColor }}>
            Preuve Projet®
          </div>
          <div className="pp-compact-kname" style={{ color: levelStyle.kinshipNameColor }}>
            Kinship
          </div>
        </div>
      </div>

      <div className="pp-compact-title-band">
        <div className="pp-compact-title">{proof.projectTitle}</div>
      </div>

      <div className="pp-compact-body">
        <div className="pp-compact-holder">
          <div className={`pp-compact-avatar ${levelStyle.avatarModifier}`}>
            {proof.holderInitials}
          </div>
          <div className="pp-compact-holder-name">{proof.holderName}</div>
        </div>
        <div className="pp-compact-org">{proof.orgName}</div>
        <div className="pp-compact-meta">
          <span className="pp-compact-date">{proof.calculatedDate}</span>
          <span className="pp-compact-role">{proof.holderRole.split(' ')[0]}</span>
        </div>
      </div>

      <div className="pp-compact-footer">
        <span className="pp-compact-num">{truncatePpNumber(proof.proofNumber, true)}</span>
        <ProjectProofChevron />
      </div>
    </ProjectProofCardLink>
  );
};

export default ProjectProofCardCompact;
