import { getBadgeProofShareOrigin } from './badgeProofShareHost';

/** Extrait proof_number, token /pb/:id ou hash depuis la saisie utilisateur */
export function parseBadgeProofVerifyQuery(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed) || trimmed.includes('kinshipedu') || trimmed.includes('localhost')) {
    try {
      const origin = getBadgeProofShareOrigin();
      const url = new URL(
        trimmed.startsWith('http') ? trimmed : `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
      );
      const pb = url.pathname.match(/\/pb\/([^/]+)/);
      if (pb?.[1]) return decodeURIComponent(pb[1]);
      const proof =
        url.searchParams.get('proof') ||
        url.searchParams.get('proof_number') ||
        url.searchParams.get('hash');
      if (proof) return proof;
    } catch {
      /* fall through */
    }
  }

  const pbPath = trimmed.match(/\/pb\/([^?\s#]+)/i);
  if (pbPath?.[1]) return decodeURIComponent(pbPath[1]);

  if (trimmed.includes('/verify')) {
    try {
      const origin = getBadgeProofShareOrigin();
      const url = new URL(trimmed.startsWith('http') ? trimmed : `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`);
      const q =
        url.searchParams.get('proof') ||
        url.searchParams.get('proof_number') ||
        url.searchParams.get('hash') ||
        url.searchParams.get('q');
      if (q) return q;
    } catch {
      /* fall through */
    }
  }

  return trimmed;
}

export function isPayloadHashQuery(value: string): boolean {
  const v = value.replace(/\.\.\./g, '').trim();
  return /^[a-f0-9]{12,128}$/i.test(v);
}

export function buildVerifyPagePath(options?: {
  proofNumber?: string | null;
  payloadHash?: string | null;
  query?: string | null;
}): string {
  const params = new URLSearchParams();
  if (options?.proofNumber) params.set('proof', options.proofNumber);
  else if (options?.payloadHash) params.set('hash', options.payloadHash);
  else if (options?.query) params.set('q', options.query);
  const qs = params.toString();
  return qs ? `/verify?${qs}` : '/verify';
}
