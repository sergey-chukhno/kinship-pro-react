import axiosClient, { axiosClientWithoutToken } from './config';
import { BadgeProofApiResponse } from '../types/badgeProofApi';
import { normalizeBadgeProofResponse, mapPbProofApiToProofData, mapPeProofApiToProofData } from '../utils/pbProofMapper';
import {
  isPbUserBadge,
  mapPbUserBadgesToProofData,
  mapUserBadgeToProofData,
} from '../utils/userBadgeProofMapper';
import { ProofData } from '../types/proof';
import { getUserBadges } from './Badges';
import { getMockProofByDocument } from '../data/mockProofs';

function unwrapProofPayload(data: unknown, token: string): BadgeProofApiResponse {
  const root = (data ?? {}) as Record<string, unknown>;
  const nested = (root.data ?? root) as Record<string, unknown>;
  return normalizeBadgeProofResponse(nested, token);
}

/** GET /api/v1/proofs/pb/:token — affichage public (sans auth) */
export async function getPublicBadgeProof(token: string): Promise<BadgeProofApiResponse> {
  const response = await axiosClientWithoutToken.get(`/api/v1/proofs/pb/${encodeURIComponent(token)}`);
  return unwrapProofPayload(response.data, token);
}

/** GET /api/v1/proofs/pe/:token — affichage public (sans auth) */
export async function getPublicEventProof(token: string): Promise<BadgeProofApiResponse> {
  const response = await axiosClientWithoutToken.get(`/api/v1/proofs/pe/${encodeURIComponent(token)}`);
  return unwrapProofPayload(response.data, token);
}

/** Charge une preuve publique PB ou PE et la mappe pour l'UI. */
export async function fetchPublicProof(
  proofType: 'PB' | 'PE',
  token: string
): Promise<ProofData> {
  const api =
    proofType === 'PE'
      ? await getPublicEventProof(token)
      : await getPublicBadgeProof(token);
  return proofType === 'PE'
    ? mapPeProofApiToProofData(api)
    : mapPbProofApiToProofData(api);
}

/** PATCH /api/v1/proofs/:id — show_owner_name (détenteur) */
export async function updateProofShowOwnerName(
  proofId: number,
  showOwnerName: boolean
): Promise<BadgeProofApiResponse> {
  const response = await axiosClient.patch(`/api/v1/proofs/${proofId}`, {
    show_owner_name: showOwnerName,
  });
  const root = (response.data ?? {}) as Record<string, unknown>;
  const nested = (root.data ?? root) as Record<string, unknown>;
  const token = String(nested.share_token ?? '');
  return unwrapProofPayload(response.data, token);
}

/** POST /api/v1/proofs/:id/revoke_share — PB uniquement (détenteur) */
export async function revokeProofShare(proofId: number): Promise<{ share_token: string; proof_number: string }> {
  const response = await axiosClient.post(`/api/v1/proofs/${proofId}/revoke_share`);
  const root = (response.data ?? {}) as Record<string, unknown>;
  const nested = (root.data ?? root) as Record<string, unknown>;
  return {
    share_token: String(nested.share_token ?? ''),
    proof_number: String(nested.proof_number ?? ''),
  };
}

/** GET /api/v1/users/me/badges — toutes les pages (badges reçus approuvés). */
export async function fetchAllReceivedUserBadges(): Promise<Record<string, unknown>[]> {
  const perPage = 50;
  let page = 1;
  let all: Record<string, unknown>[] = [];

  while (true) {
    const { data, meta } = await getUserBadges(page, perPage);
    const batch = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    all = all.concat(batch);
    const totalPages = Number(meta?.total_pages ?? 1);
    if (page >= totalPages) break;
    page += 1;
  }

  return all;
}

/** Cartes PB PIK : source unique GET /api/v1/users/me/badges (comme la cartographie). */
export async function fetchPbProofCardsFromUserBadges(): Promise<ProofData[]> {
  const userBadges = await fetchAllReceivedUserBadges();
  return mapPbUserBadgesToProofData(userBadges);
}

/** Route PIK : id numérique user_badge vs share_token public. */
export function isUserBadgeIdRouteParam(token: string): boolean {
  return /^\d+$/.test(token.trim());
}

export async function findReceivedUserBadgeByRouteParam(
  routeParam: string
): Promise<Record<string, unknown> | undefined> {
  const userBadges = await fetchAllReceivedUserBadges();

  if (isUserBadgeIdRouteParam(routeParam)) {
    return userBadges.find((badge) => String(badge.id) === routeParam.trim());
  }

  return userBadges.find((badge) => String(badge.share_token ?? '') === routeParam.trim());
}

/**
 * Détail PB PIK : résout id user_badge → share_token puis GET /api/v1/proofs/pb/:token
 */
export async function fetchPbProofDetailForPik(routeParam: string): Promise<ProofData> {
  const trimmed = routeParam.trim();

  if (isUserBadgeIdRouteParam(trimmed)) {
    const userBadge = await findReceivedUserBadgeByRouteParam(trimmed);
    if (!userBadge || !isPbUserBadge(userBadge)) {
      throw new Error('Attribution badge introuvable');
    }

    const shareToken = String(userBadge.share_token ?? '').trim();
    if (shareToken) {
      const apiProof = await getPublicBadgeProof(shareToken);
      return { ...mapPbProofApiToProofData(apiProof), showRightsLink: true };
    }

    return { ...mapUserBadgeToProofData(userBadge), showRightsLink: true };
  }

  try {
    const apiProof = await getPublicBadgeProof(trimmed);
    return { ...mapPbProofApiToProofData(apiProof), showRightsLink: true };
  } catch (error) {
    const userBadge = await findReceivedUserBadgeByRouteParam(trimmed);
    if (userBadge && isPbUserBadge(userBadge)) {
      const shareToken = String(userBadge.share_token ?? '').trim();
      if (shareToken) {
        const apiProof = await getPublicBadgeProof(shareToken);
        return { ...mapPbProofApiToProofData(apiProof), showRightsLink: true };
      }
      return { ...mapUserBadgeToProofData(userBadge), showRightsLink: true };
    }
    throw error;
  }
}

/** Repli mock uniquement pour les tokens de démo connus. */
export function getMockPbProofIfDemo(routeParam: string): ProofData | null {
  const known = getMockProofByDocument('PB', routeParam);
  const demoTokens = ['3K1A7M9QRT', 'masked-demo', 'demo'];
  if (demoTokens.includes(routeParam) || known.proofNumber.includes(routeParam.toUpperCase())) {
    return { ...known, showRightsLink: true };
  }
  return null;
}
