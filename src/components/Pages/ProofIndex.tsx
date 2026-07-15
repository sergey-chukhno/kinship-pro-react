import React from 'react';
import { SAMPLE_PROOFS } from '../../data/mockProofs';
import ProofCardCompact from '../Proof/ProofCardCompact';
import ProofCardIntermediate from '../Proof/ProofCardIntermediate';
import '../Proof/Proof.css';
import './ProofIndex.css';

const ProofIndex: React.FC = () => {
  return (
    <div className="proof-page proof-index">
      <img src="/Kinship_logo.png" alt="Kinship" className="proof-page-logo" />

      <header className="proof-index-header">
        <h1>Preuves Kinship</h1>
        <p>
          Aperçu des cartes (fausses données). Cliquez sur une carte pour ouvrir la preuve en
          pleine page.
        </p>
      </header>

      <section className="proof-index-section">
        <h2 className="proof-index-section-title">Format compact · 160 px</h2>
        <p className="proof-index-section-desc">Listes et cartographie personnelle</p>
        <div className="proof-index-cards proof-index-cards-compact">
          {SAMPLE_PROOFS.map((proof) => (
            <ProofCardCompact key={`compact-${proof.proofType}-${proof.shareToken}`} proof={proof} />
          ))}
        </div>
      </section>

      <section className="proof-index-section">
        <h2 className="proof-index-section-title">Format intermédiaire · 320 px</h2>
        <p className="proof-index-section-desc">Dashboard et partage</p>
        <div className="proof-index-cards proof-index-cards-intermediate">
          {SAMPLE_PROOFS.map((proof) => (
            <ProofCardIntermediate
              key={`inter-${proof.proofType}-${proof.shareToken}`}
              proof={proof}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default ProofIndex;
