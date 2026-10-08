import React from 'react';
import { usePikEventProofs } from '../../hooks/usePikEventProofs';
import ProofCardIntermediate from '../Proof/ProofCardIntermediate';
import './Pik.css';

interface PikEventProofListProps {
  title: string;
  description: string;
}

const PikEventProofList: React.FC<PikEventProofListProps> = ({ title, description }) => {
  const { proofs, isLoadingApi, apiError, reload } = usePikEventProofs();

  return (
    <div className="pik-category-list">
      <header className="pik-category-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>

      {isLoadingApi && (
        <p className="pik-main-loading pik-api-sync-hint">Synchronisation avec l&apos;API…</p>
      )}

      {!isLoadingApi && apiError && (
        <div className="pik-main-error pik-api-sync-hint">
          <p>{apiError}</p>
          <button type="button" className="pik-retry-btn" onClick={reload}>
            Réessayer la synchronisation
          </button>
        </div>
      )}

      <div className="pik-category-cards">
        {proofs.map((proof) => (
          <ProofCardIntermediate
            key={`${proof.documentType}-${proof.shareToken}`}
            proof={proof}
            linkTarget="pik"
          />
        ))}
      </div>
    </div>
  );
};

export default PikEventProofList;
