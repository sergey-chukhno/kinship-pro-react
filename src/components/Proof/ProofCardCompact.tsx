import React from 'react';
import { ProofData } from '../../types/proof';
import { truncateProofNumber } from '../../utils/proofTrustLevel';
import { ProofCardLink, ProofChevron, ProofHeader } from './ProofShared';
import './Proof.css';

interface ProofCardCompactProps {
  proof: ProofData;
}

export const ProofCardCompact: React.FC<ProofCardCompactProps> = ({ proof }) => {
  const contextTitle = proof.eventTitle ?? proof.projectTitle ?? '—';
  const holderLine = proof.senderCivilErased ? 'Données civiles effacées' : null;

  return (
    <ProofCardLink proof={proof} variant="compact" className="proof-card-compact">
      <ProofHeader proof={proof} compact />
      <div className="proof-compact-body">
        {holderLine ? (
          <div className="proof-compact-project" style={{ color: '#9e9d97', fontStyle: 'italic' }}>
            {holderLine}
          </div>
        ) : (
          <div className="proof-compact-project">{contextTitle}</div>
        )}
        {proof.senderOrg && <div className="proof-compact-org">{proof.senderOrg}</div>}
        <div className="proof-compact-meta">
          <div className="proof-compact-date">{proof.awardedDate}</div>
          <div className="proof-compact-role">{proof.holderRole.split(' ')[0]}</div>
        </div>
      </div>
      <div className="proof-compact-footer">
        <div className="proof-compact-proof-num">
          {truncateProofNumber(proof.proofNumber, true)}
        </div>
        <ProofChevron />
      </div>
    </ProofCardLink>
  );
};

export default ProofCardCompact;
