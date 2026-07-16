import React from 'react';
import { getMockProjectProof } from '../../data/mockProjectProofs';
import { getMockParcoursProof } from '../../data/mockParcoursProofs';
import { isProofDocumentType } from '../../data/proofCategories';
import { ProofDocumentType } from '../../types/proof';
import { getMockProofByDocument } from '../../data/mockProofs';
import ProjectProofDetail from '../ProjectProof/ProjectProofDetail';
import ParcoursProofDetail from '../ParcoursProof/ParcoursProofDetail';
import ProofFullView from '../Proof/ProofFullView';
import '../Proof/Proof.css';
import '../ProjectProof/ProjectProof.css';
import '../ParcoursProof/ParcoursProof.css';

interface PikProofDetailProps {
  documentType: string;
  token: string;
}

const PikProofDetail: React.FC<PikProofDetailProps> = ({ documentType, token }) => {
  if (!isProofDocumentType(documentType)) {
    return <p className="pik-main-empty">Preuve introuvable.</p>;
  }

  const docType = documentType.toUpperCase() as ProofDocumentType;

  if (docType === 'PP') {
    const projectProof = getMockProjectProof(token);
    return (
      <div className="pik-proof-detail">
        <ProjectProofDetail proof={projectProof} showPorteurBar showRightsLink />
      </div>
    );
  }

  if (docType === 'PA') {
    const parcoursProof = getMockParcoursProof(token);
    return (
      <div className="pik-proof-detail">
        <ParcoursProofDetail proof={parcoursProof} showPorteurBar showRightsLink />
      </div>
    );
  }

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
