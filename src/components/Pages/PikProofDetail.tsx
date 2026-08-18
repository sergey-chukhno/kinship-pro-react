import React, { useEffect, useState } from 'react';
import { getMockProjectProof } from '../../data/mockProjectProofs';
import { getMockParcoursProof } from '../../data/mockParcoursProofs';
import { getMockFormationProof } from '../../data/mockFormationProofs';
import { isProofDocumentType } from '../../data/proofCategories';
import { ProofDocumentType, ProofData } from '../../types/proof';
import { fetchPbProofDetailForPik, fetchPeProofDetailForPik, getMockPbProofIfDemo, getMockPeProofIfDemo } from '../../api/BadgeProofs';
import { getMockProofByDocument } from '../../data/mockProofs';
import ProjectProofDetail from '../ProjectProof/ProjectProofDetail';
import ParcoursProofDetail from '../ParcoursProof/ParcoursProofDetail';
import FormationProofDetail from '../FormationProof/FormationProofDetail';
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
    if (docType !== 'PB' && docType !== 'PE') {
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
        const detail =
          docType === 'PE'
            ? await fetchPeProofDetailForPik(token)
            : await fetchPbProofDetailForPik(token);
        if (cancelled) return;
        setProof(detail);
      } catch (err) {
        if (cancelled) return;
        console.error(`Erreur chargement preuve ${docType}:`, err);
        const demo = docType === 'PE' ? getMockPeProofIfDemo(token) : getMockPbProofIfDemo(token);
        if (demo) {
          setProof(demo);
          setError(null);
        } else {
          setProof(null);
          setError(
            docType === 'PE'
              ? 'Impossible de charger cette preuve événement.'
              : 'Impossible de charger cette preuve badge.'
          );
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

  if (docType === 'PF') {
    const formationProof = getMockFormationProof(token);
    return (
      <div className="pik-proof-detail">
        <FormationProofDetail proof={formationProof} showPorteurBar showRightsLink />
      </div>
    );
  }

  if (docType === 'PB' || docType === 'PE') {
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
