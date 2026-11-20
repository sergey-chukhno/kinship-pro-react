import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPublicProof } from '../../api/BadgeProofs';
import { getUserBadges } from '../../api/Badges';
import { getMockProof } from '../../data/mockProofs';
import { ProofData, ProofType } from '../../types/proof';
import ProofFullView from '../Proof/ProofFullView';
import '../Proof/Proof.css';

interface PublicProofPageProps {
  proofType: ProofType;
}

const DEMO_TOKENS = ['3K1A7M9QRT', 'masked-demo', '9A4CM8PZQR', 'presence-demo', 'demo'];
const ME_BADGES_PAGE_SIZE = 50;

/** Patrick A3 — titulaire connectée : share_token page ∈ /users/me/badges. */
async function currentUserOwnsShareToken(shareToken: string): Promise<boolean> {
  if (!localStorage.getItem('jwt_token')) return false;
  const needle = shareToken.trim();
  if (!needle) return false;

  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const res = await getUserBadges(page, ME_BADGES_PAGE_SIZE);
    const rows = Array.isArray(res.data) ? res.data : [];
    if (
      rows.some((item: { share_token?: string | null }) => String(item?.share_token ?? '').trim() === needle)
    ) {
      return true;
    }
    const metaTotal = Number(res.meta?.total_pages ?? res.meta?.totalPages ?? 1);
    totalPages = Number.isFinite(metaTotal) && metaTotal > 0 ? metaTotal : 1;
    if (rows.length < ME_BADGES_PAGE_SIZE) break;
    page += 1;
  }
  return false;
}

const PublicProofPage: React.FC<PublicProofPageProps> = ({ proofType }) => {
  const { token } = useParams<{ token: string }>();
  const [proof, setProof] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHolder, setIsHolder] = useState(false);

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
      setIsHolder(false);
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

  useEffect(() => {
    if (!token || !proof) {
      setIsHolder(false);
      return;
    }
    let cancelled = false;
    void currentUserOwnsShareToken(token)
      .then((owns) => {
        if (!cancelled) setIsHolder(owns);
      })
      .catch(() => {
        if (!cancelled) setIsHolder(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, proof]);

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
        {isHolder && (
          <Link to="/badges" className="proof-back-mes-preuves">
            ‹ Mes preuves
          </Link>
        )}
        <ProofFullView proof={proof} />
      </div>
    </div>
  );
};

export default PublicProofPage;
