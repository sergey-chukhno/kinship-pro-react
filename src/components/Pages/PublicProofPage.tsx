import React from 'react';
import { useParams } from 'react-router-dom';
import { getMockProof } from '../../data/mockProofs';
import { ProofType } from '../../types/proof';
import ProofFullView from '../Proof/ProofFullView';
import '../Proof/Proof.css';

interface PublicProofPageProps {
  proofType: ProofType;
}

const PublicProofPage: React.FC<PublicProofPageProps> = ({ proofType }) => {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return (
      <div className="proof-page">
        <div className="proof-error">Lien invalide</div>
      </div>
    );
  }

  const proof = getMockProof(proofType, token);

  return (
    <div className="proof-page">
      <img src="/Kinship_logo.png" alt="Kinship" className="proof-page-logo" />
      <div className="proof-page-inner">
        <ProofFullView proof={proof} />
      </div>
    </div>
  );
};

export default PublicProofPage;
