import React from 'react';
import { getMockProofByDocument } from '../../data/mockProofs';
import { isProofDocumentType } from '../../data/proofCategories';
import { ProofDocumentType } from '../../types/proof';
import ProofFullView from '../Proof/ProofFullView';
import '../Proof/Proof.css';

interface PikProofDetailProps {
  documentType: string;
  token: string;
}

const PikProofDetail: React.FC<PikProofDetailProps> = ({ documentType, token }) => {
  if (!isProofDocumentType(documentType)) {
    return <p className="pik-main-empty">Preuve introuvable.</p>;
  }

  const docType = documentType.toUpperCase() as ProofDocumentType;
  const proof = {
    ...getMockProofByDocument(docType, token),
    showRightsLink: true,
  };

  return (
    <div className="pik-proof-detail">
      <ProofFullView proof={proof} />
    </div>
  );
};

export default PikProofDetail;
