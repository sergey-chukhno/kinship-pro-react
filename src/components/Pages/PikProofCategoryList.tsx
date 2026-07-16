import React from 'react';
import { ProofCategory } from '../../types/proof';
import { getCategoryConfig, PROOFS_BY_CATEGORY } from '../../data/proofCategories';
import { PROJECT_PROOFS } from '../../data/mockProjectProofs';
import ProofCardIntermediate from '../Proof/ProofCardIntermediate';
import ProjectProofCardIntermediate from '../ProjectProof/ProjectProofCardIntermediate';
import '../ProjectProof/ProjectProof.css';
import './Pik.css';

interface PikProofCategoryListProps {
  category: ProofCategory;
}

const PikProofCategoryList: React.FC<PikProofCategoryListProps> = ({ category }) => {
  const config = getCategoryConfig(category);

  if (!config) {
    return <p className="pik-main-empty">Catégorie introuvable.</p>;
  }

  if (category === 'projet') {
    return (
      <div className="pik-category-list">
        <header className="pik-category-header">
          <h2>{config.label}</h2>
          <p>{config.description}</p>
        </header>

        {PROJECT_PROOFS.length === 0 ? (
          <p className="pik-main-empty">Aucune preuve pour le moment.</p>
        ) : (
          <div className="pik-category-cards">
            {PROJECT_PROOFS.map((proof) => (
              <ProjectProofCardIntermediate
                key={proof.shareToken}
                proof={proof}
                linkTarget="pik"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const proofs = PROOFS_BY_CATEGORY[category];

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
