import { ProofData, TrustLevelKey } from '../types/proof';

const TRUST_LEVELS: TrustLevelKey[] = [
  'INSTITUTIONAL',
  'DIPLOMA_NODE',
  'STRATEGIC_PARTNER',
  'SCHOOL',
  'CERTIFIED',
  'VERIFIED',
  'STANDARD',
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function resolveBadgeIcon(title: string): string {
  const words = title.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
  }
  return title.slice(0, 2).toUpperCase() || 'PB';
}

function formatBadgeLevel(level?: string | null): string {
  if (!level) return 'Niveau 1';
  const match = level.match(/level[_-]?(\d+)/i);
  if (match) return `Niveau ${match[1]}`;
  return level.replace(/^level_/i, 'Niveau ');
}

function formatAwardedDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function resolveTrustLevel(raw?: string | null): TrustLevelKey {
  const level = String(raw ?? 'STANDARD').toUpperCase();
  return TRUST_LEVELS.includes(level as TrustLevelKey) ? (level as TrustLevelKey) : 'STANDARD';
}

function mapEvidenceType(contentType?: string | null): ProofData['evidence']['type'] {
  if (!contentType) return null;
  const normalized = contentType.toLowerCase();
  if (normalized.includes('video')) return 'video';
  if (normalized.includes('image')) return 'image';
  if (normalized.includes('pdf')) return 'pdf';
  return 'document';
}

/** Attributions PB : pas d'événement rattaché (PE exclus). */
export function isPbUserBadge(userBadge: Record<string, unknown>): boolean {
  if (isPeUserBadge(userBadge)) return false;

  const proofType = userBadge.proof_type as string | undefined;
  if (proofType === 'PB') return true;

  return true;
}

/** Attributions PE : événement rattaché ou proof_type PE. */
export function isPeUserBadge(userBadge: Record<string, unknown>): boolean {
  const proofType = userBadge.proof_type as string | undefined;
  if (proofType === 'PE') return true;
  if (proofType === 'PB') return false;

  if (userBadge.event) return true;

  const proofNumber = String(userBadge.proof_number ?? '');
  return proofNumber.startsWith('PE');
}

export function mapUserBadgeToProofData(userBadge: Record<string, unknown>): ProofData {
  const badge = (userBadge.badge ?? {}) as Record<string, unknown>;
  const receiver = (userBadge.receiver ?? {}) as Record<string, unknown>;
  const sender = (userBadge.sender ?? {}) as Record<string, unknown>;
  const organization = (userBadge.organization ?? {}) as Record<string, unknown>;
  const project = (userBadge.project ?? {}) as Record<string, unknown>;
  const documents = Array.isArray(userBadge.documents) ? userBadge.documents : [];
  const firstDoc = (documents[0] ?? {}) as Record<string, unknown>;

  const badgeTitle = String(badge.name ?? 'Badge');
  const holderName = String(receiver.full_name ?? '—');
  const senderName = String(sender.full_name ?? '—');
  const shareTokenRaw = String(userBadge.share_token ?? '').trim();
  const shareToken = shareTokenRaw || String(userBadge.id ?? '');
  const proofNumber = String(userBadge.proof_number ?? `PB·${userBadge.id ?? '—'}`);
  const awardedDate = formatAwardedDate(
    (userBadge.assigned_at as string | undefined) ?? (userBadge.created_at as string | undefined)
  );

  return {
    shareToken,
    documentType: 'PB',
    category: 'badge',
    proofType: 'PB',
    proofNumber,
    trustLevel: resolveTrustLevel(organization.trust_level as string | undefined),
    badgeIcon: resolveBadgeIcon(badgeTitle),
    badgeTitle,
    badgeLevel: formatBadgeLevel(badge.level as string | undefined),
    eqfPill: null,
    seriesPill: String(badge.series ?? 'Référentiel Kinship'),
    statusBubble: '✓ Attestée',
    awardedDate,
    projectTitle: project.title ? String(project.title) : null,
    eventTitle: null,
    holderName,
    holderInitials: initialsFromName(holderName),
    holderRole: 'Porteur du badge',
    holderMasked: false,
    senderName,
    senderInitials: initialsFromName(senderName),
    senderJob: sender.job ? String(sender.job) : null,
    senderOrg: organization.name ? String(organization.name) : null,
    senderCountryFlag: '🇫🇷',
    qaLabel: organization.name ? String(organization.name) : 'Preuve Kinship',
    authority: null,
    senderCivilErased: false,
    skills: Array.isArray(userBadge.skills_indicated)
      ? (userBadge.skills_indicated as string[])
      : [],
    eventLanguage: null,
    presenceVerified: false,
    presenceDate: null,
    presenceLocation: null,
    evidence: {
      filename: firstDoc.name ? String(firstDoc.name) : null,
      type: mapEvidenceType(firstDoc.type as string | undefined),
      hash: null,
    },
    senderComment: userBadge.comment ? String(userBadge.comment) : null,
    senderCommentLang: null,
    payloadHash: '—',
    hashVersion: 'sha256-v1',
    retentionExpiry: awardedDate,
    ppProofNumber: null,
    shareUrl: shareToken ? `kinshipedu.fr/pb/${shareToken}` : 'kinshipedu.fr/pb',
    showRightsLink: true,
  };
}

export function mapPbUserBadgesToProofData(userBadges: Record<string, unknown>[]): ProofData[] {
  return userBadges.filter(isPbUserBadge).map(mapUserBadgeToProofData);
}

export function mapUserBadgeToPeProofData(userBadge: Record<string, unknown>): ProofData {
  const base = mapUserBadgeToProofData(userBadge);
  const event = (userBadge.event ?? {}) as Record<string, unknown>;
  const eventTitle = event.title ? String(event.title) : null;
  const eventLocation = event.location ? String(event.location) : null;
  const eventDate = event.date ? formatAwardedDate(String(event.date)) : null;
  const shareTokenRaw = String(userBadge.share_token ?? '').trim();
  const shareToken = shareTokenRaw || String(userBadge.id ?? '');
  const proofNumber = String(userBadge.proof_number ?? `PE·${userBadge.id ?? '—'}`);

  return {
    ...base,
    documentType: 'PE',
    category: 'evenement',
    proofType: 'PE',
    proofNumber,
    eventTitle,
    presenceDate: eventDate,
    presenceLocation: eventLocation,
    shareUrl: shareToken ? `kinshipedu.fr/pe/${shareToken}` : 'kinshipedu.fr/pe',
  };
}

export function mapPeUserBadgesToProofData(userBadges: Record<string, unknown>[]): ProofData[] {
  return userBadges.filter(isPeUserBadge).map(mapUserBadgeToPeProofData);
}
