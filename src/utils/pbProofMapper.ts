import { BadgeProofApiResponse } from '../types/badgeProofApi';
import { ProofData, TrustLevelKey } from '../types/proof';

const IDENTITY_MASKED = 'Identité masquée';
const CIVIL_ERASED = 'Données civiles effacées';

const TRUST_LEVELS: TrustLevelKey[] = [
  'INSTITUTIONAL',
  'DIPLOMA_NODE',
  'STRATEGIC_PARTNER',
  'SCHOOL',
  'CERTIFIED',
  'VERIFIED',
  'STANDARD',
];

const QA_LABELS: Record<string, string> = {
  public_authority: '⬡ Accréditation publique',
  diploma_accreditation: '⬡ Accréditation diplômante',
  enhanced_external: '⬡ Partenaire stratégique',
  state_supervised: 'Établissement scolaire',
  external_audit: 'Certifié par audit externe',
  internal_qa: 'Qualité interne vérifiée',
};

const COUNTRY_FLAGS: Record<string, string> = {
  FR: '🇫🇷',
  BE: '🇧🇪',
  CH: '🇨🇭',
  LU: '🇱🇺',
};

/** Fusionne proof_manifest + racine (format backend actuel ou legacy). */
export function normalizeBadgeProofResponse(
  raw: Record<string, unknown>,
  requestToken: string
): BadgeProofApiResponse {
  const manifest = (raw.proof_manifest ?? {}) as Record<string, unknown>;
  const merged = { ...manifest, ...raw } as Record<string, unknown>;

  return {
    ...(merged as unknown as BadgeProofApiResponse),
    proof_number: String(merged.proof_number ?? manifest.proof_number ?? ''),
    proof_type: (merged.proof_type ?? manifest.proof_type ?? 'PB') as 'PB' | 'PE',
    holder_display: String(merged.holder_display ?? manifest.holder_display ?? '—'),
    share_token: String(merged.share_token ?? requestToken),
    skills_indicated: Array.isArray(merged.skills_indicated)
      ? (merged.skills_indicated as string[])
      : Array.isArray(manifest.skills_indicated)
        ? (manifest.skills_indicated as string[])
        : [],
  };
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function formatBadgeLevel(level?: string | null): string {
  if (!level) return 'Niveau 1';
  const match = level.match(/level[_-]?(\d+)/i);
  if (match) return `Niveau ${match[1]}`;
  return level.replace(/^level_/i, 'Niveau ');
}

function formatEqfPill(api: BadgeProofApiResponse): string | null {
  if (!api.badge_eqf_level) return null;
  const framework = api.badge_eqf_framework?.trim();
  return framework ? `EQF ${api.badge_eqf_level} — ${framework}` : `EQF ${api.badge_eqf_level}`;
}

function formatAwardedDate(timestamp?: string | null): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatRetention(policy?: string | null, awardedDate?: string): string {
  if (!policy) return awardedDate ?? '—';
  const labels: Record<string, string> = {
    lifetime: 'Conservation à vie',
    standard_5y: '5 ans',
  };
  return labels[policy] ?? policy;
}

function resolveTrustLevel(api: BadgeProofApiResponse): TrustLevelKey {
  const raw = String(api.organization_trust_level ?? 'STANDARD').toUpperCase();
  return TRUST_LEVELS.includes(raw as TrustLevelKey) ? (raw as TrustLevelKey) : 'STANDARD';
}

function resolveQaLabel(api: BadgeProofApiResponse): string {
  const qaType = api.qa_type ?? api.series_authority_qa_type ?? '';
  if (qaType && QA_LABELS[qaType]) return QA_LABELS[qaType];
  const org = api.organization_name?.trim();
  return org ? `Émis par ${org}` : 'Preuve Kinship';
}

function resolveBadgeIcon(title?: string | null): string {
  if (!title?.trim()) return 'PB';
  const words = title.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
  }
  return title.slice(0, 2).toUpperCase();
}

function resolveHolderRole(badgeRole?: string | null): string {
  if (badgeRole === 'validation') return 'Validateur';
  return 'Porteur du badge';
}

function truncateHash(hash?: string | null): string | null {
  if (!hash) return null;
  return hash.length > 16 ? `${hash.slice(0, 16)}...` : hash;
}

function mapEvidenceType(type?: string | null): ProofData['evidence']['type'] {
  if (!type) return null;
  const normalized = type.toLowerCase();
  if (normalized.includes('video')) return 'video';
  if (normalized.includes('image')) return 'image';
  if (normalized.includes('pdf')) return 'pdf';
  return 'document';
}

export function mapPbProofApiToProofData(api: BadgeProofApiResponse): ProofData {
  return mapProofApiToProofData(api, 'PB');
}

export function mapPeProofApiToProofData(api: BadgeProofApiResponse): ProofData {
  return mapProofApiToProofData(api, 'PE');
}

/** Mappe la réponse publique PB/PE — holder_display et attestation_label affichés tels quels. */
export function mapProofApiToProofData(
  api: BadgeProofApiResponse,
  forcedType?: 'PB' | 'PE'
): ProofData {
  const proofType: 'PB' | 'PE' =
    forcedType ?? (api.proof_type === 'PE' ? 'PE' : 'PB');
  const holderDisplay = api.holder_display ?? '—';
  // Flags UI uniquement (avatar) — le libellé affiché reste toujours holder_display
  const holderMasked = holderDisplay === IDENTITY_MASKED;
  const holderCivilErased = holderDisplay === CIVIL_ERASED;
  const senderName = api.sender_name ?? '—';
  const senderCivilErased = senderName === CIVIL_ERASED;
  const countryCode = String(api.organization_country ?? 'FR').toUpperCase();
  const awardedDate = formatAwardedDate(api.timestamp_utc);
  const shareToken = api.share_token ?? '';
  // Bulle présence : exactement le champ servi (✓ Attestée / ✓ Vérifiée / …)
  const attestationLabel = (api.attestation_label ?? '✓ Attestée').trim() || '✓ Attestée';
  const presenceVerified =
    Boolean(api.presence_verified) ||
    /v[ée]rifi[ée]e/i.test(attestationLabel);

  return {
    shareToken,
    documentType: proofType,
    category: proofType === 'PE' ? 'evenement' : 'badge',
    proofType,
    proofNumber: api.proof_number ?? '—',
    trustLevel: resolveTrustLevel(api),
    badgeIcon: resolveBadgeIcon(api.badge_title),
    badgeTitle: api.badge_title ?? (proofType === 'PE' ? 'Événement' : 'Badge'),
    badgeLevel: formatBadgeLevel(api.badge_level),
    eqfPill: formatEqfPill(api),
    seriesPill: api.series_name ?? 'Référentiel Kinship',
    statusBubble: attestationLabel,
    awardedDate,
    projectTitle: api.project_title ?? null,
    eventTitle: api.event_title ?? null,
    holderName: holderDisplay,
    holderInitials:
      holderMasked || holderCivilErased ? '?' : initialsFromName(holderDisplay),
    holderRole: resolveHolderRole(api.badge_role),
    holderMasked: holderMasked || holderCivilErased,
    senderName,
    senderInitials: senderCivilErased ? '—' : initialsFromName(senderName),
    senderJob: api.sender_job ?? null,
    senderOrg: api.organization_name ?? null,
    senderCountryFlag: COUNTRY_FLAGS[countryCode] ?? '🏳️',
    qaLabel: resolveQaLabel(api),
    authority: null,
    senderCivilErased,
    skills: Array.isArray(api.skills_indicated) ? api.skills_indicated : [],
    eventLanguage: api.event_language ?? null,
    presenceVerified,
    presenceDate: api.presence_date ? formatAwardedDate(api.presence_date) : null,
    presenceLocation: api.presence_location ?? null,
    evidence: {
      filename: api.evidence_filename ?? null,
      type: mapEvidenceType(api.evidence_type),
      hash: truncateHash(api.evidence_hash),
    },
    senderComment: api.sender_comment ?? null,
    senderCommentLang: null,
    payloadHash: truncateHash(api.payload_hash) ?? '—',
    hashVersion: api.hash_version ?? 'sha256-v1',
    retentionExpiry: formatRetention(api.retention_policy, awardedDate),
    ppProofNumber: api.pp_proof_number ?? null,
    shareUrl: shareToken
      ? `kinshipedu.fr/${proofType.toLowerCase()}/${shareToken}`
      : `kinshipedu.fr/${proofType.toLowerCase()}`,
    showRightsLink: true,
  };
}
