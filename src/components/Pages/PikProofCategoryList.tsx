import React from 'react';
import { ProofCategory } from '../../types/proof';
import { getCategoryConfig } from '../../data/proofCategories';
import { PROJECT_PROOFS } from '../../data/mockProjectProofs';
import { PARCOURS_PROOFS } from '../../data/mockParcoursProofs';
import { FORMATION_PROOFS } from '../../data/mockFormationProofs';
import ProjectProofCardIntermediate from '../ProjectProof/ProjectProofCardIntermediate';
import ParcoursProofCardIntermediate from '../ParcoursProof/ParcoursProofCardIntermediate';
import FormationProofCardIntermediate from '../FormationProof/FormationProofCardIntermediate';
import PikBadgeProofList from './PikBadgeProofList';
import PikEventProofList from './PikEventProofList';
import '../ProjectProof/ProjectProof.css';
import '../ParcoursProof/ParcoursProof.css';
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

  if (category === 'parcours') {
    const hasAny = FORMATION_PROOFS.length > 0 || PARCOURS_PROOFS.length > 0;

    return (
      <div className="pik-category-list">
        <header className="pik-category-header">
          <h2>{config.label}</h2>
          <p>{config.description}</p>
        </header>

        {!hasAny ? (
          <p className="pik-main-empty">Aucune preuve pour le moment.</p>
        ) : (
          <>
            {FORMATION_PROOFS.length > 0 && (
              <section className="pik-pp-section">
                <h3 className="pik-pp-section-title">Preuves formation (PF)</h3>
                <div className="pik-category-cards">
                  {FORMATION_PROOFS.map((proof) => (
                    <FormationProofCardIntermediate
                      key={proof.shareToken}
                      proof={proof}
                      linkTarget="pik"
                    />
                  ))}
                </div>
              </section>
            )}

            {PARCOURS_PROOFS.length > 0 && (
              <section className="pik-pp-section">
                <h3 className="pik-pp-section-title">Preuves parcours (PA)</h3>
                <div className="pik-category-cards">
                  {PARCOURS_PROOFS.map((proof) => (
                    <ParcoursProofCardIntermediate
                      key={proof.shareToken}
                      proof={proof}
                      linkTarget="pik"
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    );
  }

  if (category === 'badge') {
    return (
      <PikBadgeProofList title={config.label} description={config.description} />
    );
  }

  return (
    <PikEventProofList title={config.label} description={config.description} />
  );
};

export default PikProofCategoryList;
