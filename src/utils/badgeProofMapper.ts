import { CartographyIssuerCardData } from './cartographyIssuerCards';
import {
  BADGE_PROOF_HEADER_FALLBACK_COLOR,
  CIVIL_DATA_ERASED_LABEL,
  EVIDENCE_EMPTY_LABEL,
  FOOTER_RETENTION_DEFAULT,
  IDENTITY_MASKED_LABEL,
  PROJECT_PROOF_PENDING_LABEL,
  RETENTION_POLICY_LABELS,
  SERIES_SCOPE_LABELS,
  TRUST_LEVEL_QA,
  evidenceIconFromType,
  qaFromStatusLabel,
} from '../constants/badgeProofUx';
import { BadgeProofPerson, BadgeProofViewData, BadgeProofQaBadge } from '../types/badgeProof';
import {
  formatBadgeProofShareDisplay,
  getBadgeProofShareOrigin,
} from './badgeProofShareHost';

export interface BadgeProofMapOptions {
  currentUserId?: number | string;
  /** Vue « Ma cartographie » du porteur */
  isPersonalCartography?: boolean;
  /** Utilisateur connecté mineur (< 15 ans) — masquage imposé, toggle désactivé */
  isViewerMinor?: boolean;
}

const AVATAR_PALETTES = [
  { bg: '#E6F1FB', color: '#185FA5' },
  { bg: '#EAF3DE', color: '#27500A' },
  { bg: '#EEEDFE', color: '#534AB7' },
  { bg: '#F1EFE8', color: '#5F5E5A' },
];

function initialsFromName(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function paletteForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function truncateHash(value: string | undefined, len = 16): string | null {
  if (!value) return null;
  if (value.length <= len) return value;
  return `${value.slice(0, len)}...`;
}

const BADGE_PROOF_SHARE_ORIGIN = getBadgeProofShareOrigin();

function truncateShareDisplay(path: string, maxLen = 32): string {
  if (path.length <= maxLen) return path;
  return `${path.slice(0, maxLen)}...`;
}

/** Zone 6 — URL de partage (D-PIK-IDENTITY-TOKEN / maquette PB) */
export function buildBadgeProofShareLinks(
  raw: any,
  proofNumber?: string | null
): { shareUrl: string; shareUrlCopy: string } {
  const shareUrlRaw = raw?.share_url ?? raw?.shareUrl;
  if (shareUrlRaw) {
    let copy = String(shareUrlRaw).trim();
    if (!/^https?:\/\//i.test(copy)) {
      if (copy.startsWith('/')) {
        copy = `${BADGE_PROOF_SHARE_ORIGIN}${copy}`;
      } else if (/^kinshipedu\.fr/i.test(copy) || /^localhost/i.test(copy)) {
        copy = copy.startsWith('http') ? copy : `http://${copy}`;
        if (/^https?:\/\/kinshipedu\.fr/i.test(copy)) {
          copy = copy.replace(/^https?:\/\/[^/]+/i, BADGE_PROOF_SHARE_ORIGIN);
        }
      } else {
        copy = `${BADGE_PROOF_SHARE_ORIGIN}/pb/${copy.replace(/^\/?pb\/?/i, '')}`;
      }
    }
    const display = copy.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    return {
      shareUrl: truncateShareDisplay(display),
      shareUrlCopy: copy,
    };
  }

  const token =
    raw?.share_token ??
    raw?.public_share_token ??
    raw?.identity_token ??
    raw?.proof_share_token;

  if (token) {
    const copy = `${BADGE_PROOF_SHARE_ORIGIN}/pb/${token}`;
    return {
      shareUrl: truncateShareDisplay(formatBadgeProofShareDisplay(`pb/${token}`)),
      shareUrlCopy: copy,
    };
  }

  if (proofNumber) {
    const parts = String(proofNumber).split(/[·.]/).filter(Boolean);
    const slug = parts[parts.length - 1];
    if (slug) {
      const copy = `${BADGE_PROOF_SHARE_ORIGIN}/pb/${slug}`;
      return {
        shareUrl: truncateShareDisplay(formatBadgeProofShareDisplay(`pb/${slug}`)),
        shareUrlCopy: copy,
      };
    }
  }

  if (raw?.id != null) {
    const copy = `${BADGE_PROOF_SHARE_ORIGIN}/pb/${raw.id}`;
    return {
      shareUrl: formatBadgeProofShareDisplay(`pb/${raw.id}`),
      shareUrlCopy: copy,
    };
  }

  return {
    shareUrl: `${formatBadgeProofShareDisplay('pb')}/…`,
    shareUrlCopy: `${BADGE_PROOF_SHARE_ORIGIN}/pb`,
  };
}

function formatProofDate(raw: any): string {
  const assignedAt = raw?.assigned_at ?? raw?.created_at;
  if (!assignedAt) return '—';
  return new Date(assignedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function badgeAcronymFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map((w) => w[0]).join('').slice(0, 3).toUpperCase();
  return name.slice(0, 3).toUpperCase();
}

function buildLevelPill(badge: any): string | null {
  const level = badge?.level_at_assign ?? badge?.level;
  if (!level) return null;
  const levelNum = String(level).replace('level_', '');
  let pill = `Niveau ${levelNum}`;
  const eqf = badge?.eqf_level_at_assign ?? badge?.eqf_level;
  if (eqf != null && eqf !== '') pill += ` · EQF ${eqf}`;
  return pill;
}

function buildSeriesPill(raw: any, badge: any): string | null {
  const scope = raw?.series_scope_at_assign ?? badge?.series_scope ?? 'kinship_catalog';
  const seriesName = raw?.series_name_at_assign ?? badge?.series ?? '';
  const entityName =
    raw?.series_owner_entity_name_at_assign ??
    raw?.series_authority_entity_name_at_assign ??
    raw?.series_creator_entity_name_at_assign;
  const scopeFn = SERIES_SCOPE_LABELS[scope] ?? SERIES_SCOPE_LABELS.kinship_catalog;
  const scopeLabel = scopeFn(entityName);
  const suffix = seriesName && !scopeLabel.includes(seriesName) ? ` · ${seriesName}` : '';
  return `${scopeLabel}${suffix}`.trim() || null;
}

function buildContextItems(raw: any): BadgeProofViewData['contextItems'] {
  const items: BadgeProofViewData['contextItems'] = [];
  const eventTitle = raw?.event_title_at_assign ?? raw?.event?.title;
  const projectTitle = raw?.project_title_at_assign ?? raw?.project?.title;

  if (eventTitle) {
    items.push({ label: 'Événement', value: eventTitle });
  }
  if (projectTitle) {
    items.push({ label: 'Projet', value: projectTitle });
  }
  const domaine = raw?.domaine_engagement ?? raw?.domaineEngagement;
  if (domaine) {
    const domainLabels: Record<string, string> = {
      professionnel: 'Activité professionnelle',
      scolaire: 'Cadre scolaire',
      associatif: 'Cadre associatif ou sportif',
      experience: 'Expérience professionnelle',
    };
    items.push({
      label: 'Domaine',
      value: domainLabels[String(domaine).toLowerCase()] ?? String(domaine),
    });
  }
  items.push({ label: 'Date', value: formatProofDate(raw) });
  return items;
}

function resolveQaBadge(raw: any, fallbackLabel?: string): BadgeProofQaBadge {
  const qaType = raw?.qa_type_at_assign ?? raw?.organization?.qa_type;
  const framework = raw?.quality_framework_at_assign ?? raw?.organization?.quality_framework;
  if (qaType && TRUST_LEVEL_QA[qaType]) {
    const t = TRUST_LEVEL_QA[qaType];
    return { label: t.label, qaClass: t.qaClass, qualityFramework: framework || undefined };
  }
  const fromLabel = qaFromStatusLabel(fallbackLabel || 'Vérifié');
  return { label: fromLabel.label, qaClass: fromLabel.qaClass, qualityFramework: framework || undefined };
}

function buildRetentionText(raw: any, dateLabel: string): string {
  const policy = raw?.retention_policy ?? '10_YEARS';
  const label = RETENTION_POLICY_LABELS[policy] ?? RETENTION_POLICY_LABELS['10_YEARS'];
  const sector = raw?.sector_context ?? raw?.retention_sector;
  const frozen = raw?.retention_expiry_at ?? raw?.assigned_at;
  if (policy === 'PERMANENT') {
    return sector ? `${label} — secteur ${sector}` : label;
  }
  const frozenStr = frozen
    ? ` · figée au ${new Date(frozen).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : dateLabel !== '—'
      ? ` · figée au ${dateLabel}`
      : '';
  return `${label}${sector ? ` — secteur ${sector}` : ''}${frozenStr}`;
}

function buildReceiver(raw: any, showOwner: boolean): BadgeProofPerson {
  const isMinor = raw?.receiver?.is_minor ?? raw?.is_minor;
  const fullName = raw?.receiver_display_label_at_award ?? raw?.receiver?.full_name ?? 'Porteur';
  const palette = paletteForName(fullName);
  const roleSubtitle = raw?.role_in_project ?? 'Participant au projet';

  if (!showOwner) {
    return {
      initials: '?',
      name: IDENTITY_MASKED_LABEL,
      subtitle: roleSubtitle,
      avatarBg: '#F1EFE8',
      avatarColor: '#5F5E5A',
      masked: true,
    };
  }

  let displayName = fullName;
  if (isMinor && raw?.external_view) {
    const parts = fullName.split(/\s+/);
    displayName = parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : fullName;
  }

  return {
    initials: initialsFromName(displayName),
    name: displayName,
    subtitle: roleSubtitle,
    avatarBg: palette.bg,
    avatarColor: palette.color,
    masked: false,
  };
}

/** Porteur adulte sur « Ma cartographie » peut choisir show_owner_name (Fondation #2). */
function canPorteurControlVisibility(options?: BadgeProofMapOptions): boolean {
  return Boolean(options?.isPersonalCartography && !options?.isViewerMinor);
}

export function applyShowOwnerNameToView(
  view: BadgeProofViewData,
  showOwnerName: boolean
): BadgeProofViewData {
  return {
    ...view,
    showOwnerName,
    receiver: showOwnerName
      ? { ...view.receiverUnmasked, masked: false }
      : {
          initials: '?',
          name: IDENTITY_MASKED_LABEL,
          subtitle: view.receiverUnmasked.subtitle,
          avatarBg: '#F1EFE8',
          avatarColor: '#5F5E5A',
          masked: true,
        },
  };
}

function buildSender(raw: any): {
  sender: BadgeProofViewData['sender'];
  senderCivilErased: boolean;
  hideOrganizationName: boolean;
  orgName: string | null;
} {
  const civilErased =
    raw?.sender_name_at_assign === 'CIVIL_DATA_ERASED' ||
    raw?.sender?.civil_data_erased === true;
  const independentTeacher =
    raw?.sender_organization_type_at_assign === 'IndependentTeacher' ||
    raw?.organization?.type === 'IndependentTeacher';

  if (civilErased) {
    return {
      senderCivilErased: true,
      hideOrganizationName: true,
      orgName: null,
      sender: {
        initials: '?',
        name: CIVIL_DATA_ERASED_LABEL,
        subtitle: '',
        avatarBg: '#F1EFE8',
        avatarColor: '#5F5E5A',
      },
    };
  }

  const senderName = raw?.sender_name_at_assign ?? raw?.sender?.full_name ?? 'Émetteur';
  const palette = paletteForName(senderName);
  const orgName =
    raw?.sender_organization_name_at_assign ??
    raw?.organization?.name ??
    raw?.sender?.organization_name ??
    null;

  return {
    senderCivilErased: false,
    hideOrganizationName: independentTeacher,
    orgName: independentTeacher ? null : orgName,
    sender: {
      initials: initialsFromName(senderName),
      name: senderName,
      subtitle: raw?.sender_job_at_assign ?? raw?.sender?.job ?? '',
      avatarBg: palette.bg,
      avatarColor: palette.color,
    },
  };
}

function buildOptionC(raw: any): BadgeProofViewData['optionC'] {
  const authorityName = raw?.series_authority_entity_name_at_assign ?? raw?.authority_entity_name;
  const authorityQaType = raw?.series_authority_qa_type_at_assign ?? raw?.series_authority_qa_type;
  if (!authorityName) return null;

  const issuerOrg =
    raw?.sender_organization_name_at_assign ?? raw?.organization?.name ?? 'Émetteur';
  const issuerQa = resolveQaBadge(raw);
  let authorityQa: BadgeProofQaBadge = {
    label: 'Accréditation publique',
    qaClass: 'qa-accreditation-pub',
  };
  if (authorityQaType && TRUST_LEVEL_QA[authorityQaType]) {
    const t = TRUST_LEVEL_QA[authorityQaType];
    authorityQa = { label: `Accrédité par`, qaClass: t.qaClass, qualityFramework: authorityName };
  }

  return {
    issuedByOrg: issuerOrg,
    issuedByQa: issuerQa,
    accreditedByOrg: authorityName,
    accreditedByQa: authorityQa,
  };
}

export function mapRawToBadgeProofView(
  raw: any,
  issuerCard?: Pick<CartographyIssuerCardData, 'color' | 'statusLabel' | 'acronym' | 'subtitle'>,
  options?: BadgeProofMapOptions
): BadgeProofViewData {
  const badge = raw?.badge || {};
  const senderBlock = buildSender(raw);
  const qaBadge = resolveQaBadge(raw, issuerCard?.statusLabel);
  const documents = raw?.documents || [];
  const firstDoc = documents[0];
  const evidenceFilename =
    raw?.evidence_filename_at_assign ?? firstDoc?.filename ?? firstDoc?.name;
  const participationMode = raw?.participation_mode ?? raw?.project?.participation_mode;
  const skillsRaw: string[] = raw?.skills_indicated ?? raw?.skillsIndicated ?? [];
  const expertises = (badge.expertises || [])
    .map((e: any) => (typeof e === 'string' ? e : e?.name))
    .filter(Boolean);
  const skills = skillsRaw.length > 0 ? skillsRaw : expertises;
  const dateLabel = formatProofDate(raw);

  const headerColor =
    raw?.badge_series_color_at_assign ??
    badge?.badge_color ??
    badge?.series_color ??
    issuerCard?.color ??
    BADGE_PROOF_HEADER_FALLBACK_COLOR;

  const zone4OnSite = participationMode === 'on_site';
  const ppProof = raw?.pp_proof_number ?? raw?.project_proof_number;
  const proofNumber = raw?.proof_number ?? raw?.proofNumber ?? null;
  const shareLinks = buildBadgeProofShareLinks(raw, proofNumber);
  const showOwnerName = options?.isViewerMinor
    ? false
    : (raw?.show_owner_name ?? raw?.receiver?.show_owner_name) !== false;
  const receiverUnmasked = buildReceiver(raw, true);
  const receiver = buildReceiver(raw, showOwnerName);
  const canControlOwnerVisibility = canPorteurControlVisibility(options);

  return {
    headerColor,
    badgeAcronym: badgeAcronymFromName(badge.name || 'Badge'),
    badgeTitle: raw?.badge_label_at_assign ?? badge.name ?? 'Badge',
    levelPill: buildLevelPill(badge),
    seriesPill: buildSeriesPill(raw, badge),
    eqfFrameworkPill: badge?.eqf_framework_at_assign ?? badge?.eqf_framework ?? null,
    proofNumber,
    contextItems: buildContextItems(raw),
    receiver,
    receiverUnmasked,
    showOwnerName,
    canControlOwnerVisibility,
    userBadgeId: raw?.id ?? null,
    senderCivilErased: senderBlock.senderCivilErased,
    sender: senderBlock.sender,
    hideOrganizationName: senderBlock.hideOrganizationName,
    orgName: senderBlock.orgName,
    countryFlag:
      raw?.sender_organization_country_at_assign === 'FR' ||
      !raw?.sender_organization_country_at_assign
        ? '🇫🇷'
        : raw.sender_organization_country_at_assign,
    qaBadge,
    optionC: buildOptionC(raw),
    zone4Mode: zone4OnSite ? 'presence' : 'skills',
    skills: zone4OnSite ? [] : skills,
    presenceDate: zone4OnSite
      ? formatProofDate({ assigned_at: raw?.event_date_at_assign ?? raw?.event?.date })
      : undefined,
    presenceLocation: zone4OnSite ? raw?.events?.location ?? raw?.event?.location : undefined,
    evidenceEmpty: !evidenceFilename,
    evidenceName: evidenceFilename || EVIDENCE_EMPTY_LABEL,
    evidenceHash: truncateHash(
      raw?.evidence_hash_at_assign ?? firstDoc?.hash ?? firstDoc?.evidence_hash
    ),
    evidenceIcon: evidenceIconFromType(
      raw?.evidence_type_at_assign ?? firstDoc?.content_type ?? firstDoc?.type
    ),
    comment: raw?.sender_comment_at_assign ?? raw?.comment ?? null,
    commentLanguage: raw?.sender_comment_language_at_assign ?? (raw?.comment ? 'FR' : null),
    payloadHash: truncateHash(raw?.payload_hash ?? raw?.payloadHash),
    hashVersion: raw?.hash_version ?? raw?.hashVersion ?? 'sha256-v1',
    retentionText: buildRetentionText(raw, dateLabel),
    projectProofPending: !ppProof,
    projectProofNumber: ppProof ?? null,
    shareUrl: shareLinks.shareUrl,
    shareUrlCopy: shareLinks.shareUrlCopy,
    footerRetentionNote: FOOTER_RETENTION_DEFAULT,
    jsonExportDisabled: raw?.json_export_enabled === false || raw?.json_export_enabled == null,
  };
}

export function mapExampleIssuerCardToBadgeProof(
  card: CartographyIssuerCardData,
  options?: BadgeProofMapOptions
): BadgeProofViewData {
  const qa = qaFromStatusLabel(card.statusLabel);
  const receiverUnmasked = {
    initials: 'LD',
    name: 'Lucas Dupont',
    subtitle: 'Participant au projet',
    avatarBg: '#E6F1FB',
    avatarColor: '#185FA5',
    masked: false as const,
  };
  const base: BadgeProofViewData = {
    headerColor: card.color === '#B8E4F7' ? BADGE_PROOF_HEADER_FALLBACK_COLOR : card.color,
    badgeAcronym: card.acronym.replace('\n', ' ').slice(0, 3),
    badgeTitle: card.title,
    levelPill: 'Niveau 1',
    seriesPill: 'Référentiel Kinship',
    eqfFrameworkPill: null,
    proofNumber: `PB·${new Date().getFullYear()}·FR·${card.id.replace('example-', '').toUpperCase()}`,
    contextItems: [
      { label: 'Projet', value: 'Projet Kinship' },
      { label: 'Date', value: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) },
    ],
    receiver: receiverUnmasked,
    receiverUnmasked,
    showOwnerName: true,
    canControlOwnerVisibility: canPorteurControlVisibility(options),
    userBadgeId: card.id.startsWith('example-') ? null : card.id,
    senderCivilErased: false,
    sender: {
      initials: initialsFromName(card.subtitle),
      name: 'Référent',
      subtitle: card.subtitle,
      avatarBg: '#EAF3DE',
      avatarColor: '#27500A',
    },
    hideOrganizationName: false,
    orgName: card.subtitle,
    countryFlag: '🇫🇷',
    qaBadge: { label: qa.label, qaClass: qa.qaClass },
    optionC: null,
    zone4Mode: 'skills',
    skills: [`Compétence validée — ${card.title}`],
    evidenceEmpty: true,
    evidenceName: EVIDENCE_EMPTY_LABEL,
    evidenceHash: null,
    evidenceIcon: '📎',
    comment: `Attribution du badge « ${card.title} » par ${card.subtitle}.`,
    commentLanguage: 'FR',
    payloadHash: '9114e6a1d7b4c2f8...',
    hashVersion: 'sha256-v1',
    retentionText: 'Conservation 10 ans',
    projectProofPending: true,
    projectProofNumber: null,
    shareUrl: truncateShareDisplay(formatBadgeProofShareDisplay(`pb/${card.id}`)),
    shareUrlCopy: `${BADGE_PROOF_SHARE_ORIGIN}/pb/${card.id}`,
    footerRetentionNote: FOOTER_RETENTION_DEFAULT,
    jsonExportDisabled: true,
  };

  if (card.id === 'example-6') {
    return {
      ...base,
      headerColor: '#534AB7',
      badgeAcronym: 'COM',
      badgeTitle: 'Communication',
      levelPill: 'Niveau 1 · EQF 3',
      seriesPill: 'Référentiel Kinship · Compétences citoyennes',
      proofNumber: 'PB·2026·FR·3K1A8M2P9X',
      contextItems: [
        { label: 'Projet', value: 'Atelier musique — Got Talent?' },
        { label: 'Domaine', value: 'Expression artistique' },
        { label: 'Date', value: '25 jan. 2026' },
      ],
      sender: {
        initials: 'VT',
        name: 'Virginie Torrenti',
        subtitle: 'Facilitatrice en intelligence collective',
        avatarBg: '#EAF3DE',
        avatarColor: '#27500A',
      },
      orgName: 'Jeunesse Villeneuvoise',
      qaBadge: {
        label: 'Reconnu et supervisé par',
        qaClass: 'qa-externe-sup',
        qualityFramework: 'Éducation Nationale',
      },
      skills: [
        "Parle et argumente à l'oral de façon claire et organisée",
        'Écoute et prend en compte ses interlocuteurs',
        "Adapte son discours selon le contexte et l'audience",
      ],
      evidenceEmpty: false,
      evidenceName: 'presentation_got_talent.mp4',
      evidenceHash: 'c7a3f91e8b2d4f60a...',
      evidenceIcon: '🎬',
      comment:
        'Lucas a présenté son projet devant 40 personnes avec une clarté remarquable. Sa capacité à structurer son discours est au niveau attendu pour ce badge.',
      retentionText: 'Conservation : 10 ans — secteur Éducation Nationale · figée au 25 jan. 2026',
      shareUrl: truncateShareDisplay(formatBadgeProofShareDisplay('pb/3K1A-uvCkm9xQr2')),
      shareUrlCopy: `${BADGE_PROOF_SHARE_ORIGIN}/pb/3K1A-uvCkm9xQr2`,
    };
  }

  return base;
}

export function resolveBadgeProofFromIssuerCard(
  card: CartographyIssuerCardData,
  rawItems: any[],
  options?: BadgeProofMapOptions
): BadgeProofViewData | null {
  if (card.id.startsWith('example-')) {
    return mapExampleIssuerCardToBadgeProof(card, options);
  }
  const raw = rawItems.find((r) => String(r.id) === String(card.id));
  if (!raw && card.badgeKey) {
    const [name, level] = card.badgeKey.split('|');
    const fallback = rawItems.find((r) => {
      const lvl = r?.badge?.level?.replace('level_', '');
      return r?.badge?.name === name && (`Niveau ${lvl}` === level || r?.badge?.level === level);
    });
    if (fallback) return mapRawToBadgeProofView(fallback, card, options);
  }
  if (raw) return mapRawToBadgeProofView(raw, card, options);
  return null;
}
