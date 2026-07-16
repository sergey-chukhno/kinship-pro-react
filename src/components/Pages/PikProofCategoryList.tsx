import React from 'react';
import { ProofCategory } from '../../types/proof';
import { getCategoryConfig, PROOFS_BY_CATEGORY } from '../../data/proofCategories';
import ProofCardIntermediate from '../Proof/ProofCardIntermediate';
import './Pik.css';

interface PikProofCategoryListProps {
  category: ProofCategory;
}

const PikProofCategoryList: React.FC<PikProofCategoryListProps> = ({ category }) => {
  const config = getCategoryConfig(category);
  const proofs = PROOFS_BY_CATEGORY[category];

  if (!config) {
    return <p className="pik-main-empty">Catégorie introuvable.</p>;
  }

  return (
    <div className="pik-category-list">
      <header className="pik-category-header">
        <h2>{config.label}</h2>
        <p>{config.description}</p>
      </header>

      {proofs.length === 0 ? (
        <p className="pik-main-empty">Aucune preuve pour le moment.</p>
      ) : (
        <div className="pik-category-cards">
          {proofs.map((proof) => (
            <ProofCardIntermediate
              key={`${proof.documentType}-${proof.shareToken}`}
              proof={proof}
              linkTarget="pik"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PikProofCategoryList;
