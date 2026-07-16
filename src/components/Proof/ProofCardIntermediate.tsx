import React from 'react';
import { ProofData } from '../../types/proof';
import { TRUST_LEVEL_STYLES } from '../../utils/proofTrustLevel';
import { ProofCardLink, ProofChevron, ProofHeader, ProofSkillsList } from './ProofShared';
import './Proof.css';

interface ProofCardIntermediateProps {
  proof: ProofData;
  linkTarget?: 'public' | 'pik';
}

export const ProofCardIntermediate: React.FC<ProofCardIntermediateProps> = ({
  proof,
  linkTarget = 'public',
}) => {
  const style = TRUST_LEVEL_STYLES[proof.trustLevel];
  const contextLabel =
    proof.documentType === 'PE' || proof.eventTitle ? 'Événement' : 'Projet';
  const contextTitle = proof.eventTitle ?? proof.projectTitle ?? '—';
  const holderDisplay = proof.holderMasked
    ? 'Identité masquée'
    : proof.senderCivilErased
      ? 'Données civiles effacées'
      : proof.holderName;

  const roleShort = proof.holderRole.includes('Co-responsable')
    ? 'Co-responsable'
    : proof.holderRole.split(' ')[0];

  return (
    <ProofCardLink
      proof={proof}
      variant="intermediate"
      className="proof-card-intermediate"
      linkTarget={linkTarget}
    >
      <ProofHeader proof={proof} intermediate />
      <div className="proof-inter-porteur">
        <div className="proof-porteur-row">
          <div
            className={`proof-avatar ${proof.holderMasked ? 'proof-avatar-masked' : ''}`}
            style={proof.holderMasked ? undefined : style.avatarStyle}
          >
            {proof.holderInitials}
          </div>
          <div>
            <div className="proof-inter-porteur-name">{holderDisplay}</div>
            <span className="proof-inter-role-pill">{roleShort}</span>
          </div>
        </div>
      </div>
      <div
        className="proof-inter-context"
        style={{ background: `${style.accentColor}10`, color: style.accentColor }}
      >
        <div className="proof-inter-ctx-label">{contextLabel}</div>
        <div className="proof-inter-ctx-value">{contextTitle}</div>
        {proof.senderOrg && <div className="proof-inter-ctx-sub">{proof.senderOrg}</div>}
      </div>
      <div className="proof-inter-skills">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div className="proof-zone-label" style={{ marginBottom: 0 }}>
            Compétences validées
          </div>
          {proof.eventLanguage && (
            <>
              <span>{proof.eventLanguage.split(' ')[0]}</span>
              <span style={{ fontSize: 9, color: '#9e9d97' }}>
                {proof.eventLanguage.replace(/^[^\s]+\s/, '')}
              </span>
            </>
          )}
        </div>
        <ProofSkillsList proof={proof} compact maxItems={3} />
      </div>
      <div className="proof-inter-footer">
        <div className="proof-compact-proof-num" style={{ fontSize: 10 }}>
          {proof.proofNumber}
        </div>
        <ProofChevron large />
      </div>
      <div className="proof-inter-copyright">© 2026 Kinship SAS</div>
    </ProofCardLink>
  );
};

export default ProofCardIntermediate;
