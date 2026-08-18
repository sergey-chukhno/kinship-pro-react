import React, { useEffect, useState } from 'react';
import { getMockProjectProof } from '../../data/mockProjectProofs';
import { getMockParcoursProof } from '../../data/mockParcoursProofs';
import { isProofDocumentType } from '../../data/proofCategories';
import { ProofDocumentType, ProofData } from '../../types/proof';
import { getMockProofByDocument } from '../../data/mockProofs';
import { fetchPbProofDetailForPik, getMockPbProofIfDemo } from '../../api/BadgeProofs';
import ProjectProofDetail from '../ProjectProof/ProjectProofDetail';
import ParcoursProofDetail from '../ParcoursProof/ParcoursProofDetail';
import ProofFullView from '../Proof/ProofFullView';
import '../Proof/Proof.css';
import '../ProjectProof/ProjectProof.css';
import '../ParcoursProof/ParcoursProof.css';
import './Pik.css';

interface PikProofDetailProps {
  documentType: string;
  token: string;
}

const PikProofDetail: React.FC<PikProofDetailProps> = ({ documentType, token }) => {
  const [proof, setProof] = useState<ProofData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidType = isProofDocumentType(documentType);
  const docType = isValidType ? (documentType.toUpperCase() as ProofDocumentType) : null;

  useEffect(() => {
    if (docType !== 'PB') {
      setProof(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const detail = await fetchPbProofDetailForPik(token);
        if (cancelled) return;
        setProof(detail);
      } catch (err) {
        if (cancelled) return;
        console.error('Erreur chargement preuve PB:', err);
        const demo = getMockPbProofIfDemo(token);
        if (demo) {
          setProof(demo);
          setError(null);
        } else {
          setProof(null);
          setError('Impossible de charger cette preuve badge.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [docType, token]);

  if (!isValidType || !docType) {
    return <p className="pik-main-empty">Preuve introuvable.</p>;
  }

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

  if (docType === 'PB') {
    if (isLoading) {
      return <p className="pik-main-loading">Chargement de la preuve…</p>;
    }

    if (error || !proof) {
      return <p className="pik-main-empty">{error ?? 'Preuve introuvable.'}</p>;
    }

    return (
      <div className="pik-proof-detail">
        <ProofFullView proof={proof} />
      </div>
    );
  }

  const fallbackProof = {
    ...getMockProofByDocument(docType, token),
    showRightsLink: true,
  };

  return (
    <div className="pik-proof-detail">
      <ProofFullView proof={fallbackProof} />
    </div>
  );
};

export default PikProofDetail;
