import { axiosClientWithoutToken } from './config';
import { BADGE_PROOF_VERIFY_STEPS } from '../constants/badgeProofVerify';
import { BadgeProofVerifyResult, BadgeProofVerifyStatus } from '../types/badgeProofVerify';
import { isPayloadHashQuery, parseBadgeProofVerifyQuery } from '../utils/badgeProofVerifyQuery';

function formatVerifiedAt(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapApiToResult(data: any, verifiedAt: string): BadgeProofVerifyResult {
  const authentic = data?.authentic === true || data?.status === 'authentic' || data?.verified === true;
  const anomaly = data?.authentic === false || data?.status === 'anomaly';
  const status: BadgeProofVerifyStatus = authentic
    ? 'authentic'
    : anomaly
      ? 'anomaly'
      : 'not_found';

  const summary = [
    { label: 'Numéro de preuve', value: data?.proof_number ?? data?.proofNumber ?? '—', mono: true },
    { label: 'Badge', value: data?.badge_label ?? data?.badge ?? '—' },
    { label: 'Porteur', value: data?.receiver_label ?? data?.receiver ?? '—' },
    {
      label: 'Émetteur',
      value: data?.issuer_label ?? data?.issuer ?? data?.organization_name ?? '—',
    },
    { label: "Date d'attribution", value: data?.assigned_at_label ?? data?.assigned_at ?? '—' },
    {
      label: 'Assurance qualité',
      value: data?.quality_assurance_label ?? data?.quality_assurance ?? '—',
    },
  ];

  return {
    status,
    verifiedAt,
    subtitle:
      data?.message ??
      (status === 'authentic'
        ? `Les badges n'ont pas été modifiés depuis la clôture. Vérification effectuée le ${verifiedAt}.`
        : status === 'anomaly'
          ? 'Anomalie détectée — contacter Kinship.'
          : 'Aucune preuve ne correspond à cette référence.'),
    summary,
    steps: BADGE_PROOF_VERIFY_STEPS,
  };
}

/** Démo maquette — en attendant l’endpoint backend stable */
function getDemoVerifyResult(query: string): BadgeProofVerifyResult | null {
  const verifiedAt = formatVerifiedAt();
  const upper = query.toUpperCase();
  const demoProof = 'PB·2026·FR·3K1A8M2P9X';
  const demoToken = '3K1A8M2P9X';
  const demoHashPrefix = '9114e6a1';

  const isDemoProof =
    upper === demoProof.toUpperCase() ||
    upper === demoToken ||
    query === demoToken ||
    query.startsWith(demoHashPrefix);

  if (isDemoProof) {
    return {
      status: 'authentic',
      verifiedAt,
      subtitle: `Les badges n'ont pas été modifiés depuis la clôture. Vérification effectuée le ${verifiedAt}.`,
      summary: [
        { label: 'Numéro de preuve', value: demoProof, mono: true },
        { label: 'Badge', value: 'Communication · Niveau 1' },
        { label: 'Porteur', value: 'Lucas Dupont' },
        { label: 'Émetteur', value: 'Jeunesse Villeneuvoise · 🇫🇷' },
        { label: "Date d'attribution", value: '25 janvier 2026' },
        { label: 'Assurance qualité', value: 'Reconnu et supervisé par Éducation Nationale' },
      ],
      steps: BADGE_PROOF_VERIFY_STEPS,
    };
  }

  if (query.length >= 4 && !isPayloadHashQuery(query)) {
    return {
      status: 'not_found',
      verifiedAt,
      subtitle: 'Aucune preuve ne correspond à cette référence. Vérifiez le numéro ou l’URL.',
      summary: [],
      steps: BADGE_PROOF_VERIFY_STEPS,
    };
  }

  if (isPayloadHashQuery(query) && !query.startsWith(demoHashPrefix)) {
    return {
      status: 'anomaly',
      verifiedAt,
      subtitle: 'Anomalie détectée — contacter Kinship.',
      summary: [],
      steps: BADGE_PROOF_VERIFY_STEPS,
    };
  }

  return null;
}

/**
 * Vérification publique d’une preuve badge (sans compte).
 * POST /api/v1/badges/proofs/verify — repli démo si indisponible.
 */
export async function verifyBadgeProof(input: string): Promise<BadgeProofVerifyResult> {
  const query = parseBadgeProofVerifyQuery(input);
  if (!query) {
    throw new Error('Saisissez un numéro de preuve, une URL ou un hash.');
  }

  const verifiedAt = formatVerifiedAt();
  const body: Record<string, string> = { query };
  if (isPayloadHashQuery(query)) {
    body.payload_hash = query;
  }

  try {
    const response = await axiosClientWithoutToken.post('/api/v1/badges/proofs/verify', body);
    return mapApiToResult(response.data, verifiedAt);
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 404 || status === 501 || status === 405 || !err?.response) {
      const demo = getDemoVerifyResult(query);
      if (demo) return demo;
    }
    if (err?.response?.data) {
      return mapApiToResult(err.response.data, verifiedAt);
    }
    throw err;
  }
}
