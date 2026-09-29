import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicProof } from '../../api/BadgeProofs';
import { getMockProof } from '../../data/mockProofs';
import { ProofData, ProofType } from '../../types/proof';
import ProofFullView from '../Proof/ProofFullView';
import '../Proof/Proof.css';

interface PublicProofPageProps {
  proofType: ProofType;
}

const DEMO_TOKENS = ['3K1A7M9QRT', 'masked-demo', '9A4CM8PZQR', 'presence-demo', 'demo'];

const PublicProofPage: React.FC<PublicProofPageProps> = ({ proofType }) => {
  const { token } = useParams<{ token: string }>();
  const [proof, setProof] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Lien invalide');
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublicProof(proofType, token);
        if (!cancelled) setProof(data);
      } catch {
        // Repli mock uniquement pour les tokens de démo connus
        if (DEMO_TOKENS.includes(token)) {
          if (!cancelled) setProof(getMockProof(proofType, token));
        } else if (!cancelled) {
          setError('Preuve introuvable');
          setProof(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [proofType, token]);

  if (!token) {
    return (
      <div className="proof-page">
        <div className="proof-error">Lien invalide</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="proof-page">
        <img src="/Kinship_logo.png" alt="Kinship" className="proof-page-logo" />
        <div className="proof-error">Chargement de la preuve…</div>
      </div>
    );
  }

  if (error || !proof) {
    return (
      <div className="proof-page">
        <img src="/Kinship_logo.png" alt="Kinship" className="proof-page-logo" />
        <div className="proof-error">{error ?? 'Preuve introuvable'}</div>
      </div>
    );
  }

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
