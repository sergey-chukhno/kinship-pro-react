import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPeProofCardsFromUserBadges } from '../api/BadgeProofs';
import { PROOFS_BY_CATEGORY } from '../data/proofCategories';
import { ProofData } from '../types/proof';

const MOCK_EVENT_PROOFS = PROOFS_BY_CATEGORY.evenement;

interface UsePikEventProofsResult {
  proofs: ProofData[];
  isLoadingApi: boolean;
  apiError: string | null;
  reload: () => void;
}

function mergeMockAndApiProofs(apiProofs: ProofData[]): ProofData[] {
  const mockTokens = new Set(MOCK_EVENT_PROOFS.map((proof) => proof.shareToken));
  const fromApi = apiProofs.filter((proof) => !mockTokens.has(proof.shareToken));
  return [...MOCK_EVENT_PROOFS, ...fromApi];
}

export function usePikEventProofs(): UsePikEventProofsResult {
  const [apiProofs, setApiProofs] = useState<ProofData[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoadingApi(true);
      setApiError(null);

      try {
        const cards = await fetchPeProofCardsFromUserBadges();
        if (cancelled) return;
        setApiProofs(cards);
      } catch (err) {
        if (cancelled) return;
        console.error('Erreur chargement preuves événement PIK:', err);
        setApiProofs([]);
        setApiError('Synchronisation API indisponible — cartes de démonstration affichées.');
      } finally {
        if (!cancelled) {
          setIsLoadingApi(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const proofs = useMemo(() => mergeMockAndApiProofs(apiProofs), [apiProofs]);

  return { proofs, isLoadingApi, apiError, reload };
}
