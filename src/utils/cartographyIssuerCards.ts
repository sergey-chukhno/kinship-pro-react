import { CartographyIssuerCardProps } from '../components/Badges/CartographyIssuerCard';

export type CartographyIssuerCardData = CartographyIssuerCardProps & {
  id: string;
  /** Clé name|level pour retrouver le badge au clic */
  badgeKey?: string;
};

const CARD_COLOR_PALETTE: Array<{ color: string; lightAcronymText?: boolean }> = [
  { color: '#1B3A6B' },
  { color: '#7B5EA7' },
  { color: '#8B6914' },
  { color: '#1A5C56' },
  { color: '#2A9D8F' },
  { color: '#B8E4F7', lightAcronymText: true },
];

/** Exemples visuels (maquette) — affichés si aucune donnée API */
export const CARTOGRAPHY_ISSUER_EXAMPLE_CARDS: CartographyIssuerCardData[] = [
  {
    id: 'example-1',
    acronym: 'RECT\nNICE',
    title: 'Leadership éducatif',
    subtitle: 'Rectorat de Nice',
    statusLabel: 'Institution publique',
    color: '#1B3A6B',
  },
  {
    id: 'example-2',
    acronym: 'UCA',
    title: 'Droit européen',
    subtitle: 'Université Côte d\'Azur',
    statusLabel: 'Accréditation publique',
    color: '#7B5EA7',
  },
  {
    id: 'example-3',
    acronym: 'DPC',
    title: 'Gestion de la douleur',
    subtitle: 'OF DPC agréé',
    statusLabel: 'Reconnu et certifié',
    color: '#8B6914',
  },
  {
    id: 'example-4',
    acronym: 'LVH',
    title: 'Mathématiques niv. 2',
    subtitle: 'Lycée Victor Hugo',
    statusLabel: 'Établissement scolaire',
    color: '#1A5C56',
  },
  {
    id: 'example-5',
    acronym: 'MJC',
    title: 'Animation jeunesse',
    subtitle: 'MJC agréée JEP',
    statusLabel: 'Certifié',
    color: '#2A9D8F',
  },
  {
    id: 'example-6',
    acronym: 'JV',
    title: 'Communication',
    subtitle: 'Jeunesse Villeneuvoise',
    statusLabel: 'Vérifié',
    color: '#B8E4F7',
    lightAcronymText: true,
  },
];

function buildAcronym(text: string, maxLen = 8): string {
  if (!text?.trim()) return '—';
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const fromInitials = words.map((w) => w[0]).join('').toUpperCase();
    if (fromInitials.length <= maxLen) return fromInitials;
  }
  return trimmed.slice(0, maxLen).toUpperCase();
}

function getOrganizationStatusLabel(org: { type?: string; name?: string } | null | undefined): string {
  const type = (org?.type || '').toLowerCase();
  const name = (org?.name || '').toLowerCase();

  if (name.includes('rectorat') || type.includes('rectorat')) return 'Institution publique';
  if (name.includes('université') || name.includes('universite')) return 'Accréditation publique';
  if (name.includes('dpc') || name.includes('of ')) return 'Reconnu et certifié';
  if (type === 'schools' || type === 'school') return 'Établissement scolaire';
  if (name.includes('mjc')) return 'Certifié';
  if (type === 'companies' || type === 'company') return 'Vérifié';

  return 'Vérifié';
}

function getOrganizationName(raw: any): string {
  const org = raw?.organization;
  if (org?.name) return org.name;
  if (raw?.sender?.organization_name) return raw.sender.organization_name;
  if (raw?.project?.primary_organization_name) return raw.project.primary_organization_name;
  if (raw?.project?.organization_name) return raw.project.organization_name;
  return 'Organisation';
}

/**
 * Construit les cartes émetteur à partir des attributions API (user_badge).
 */
export function buildCartographyIssuerCardsFromRaw(
  rawItems: any[],
  options?: { includeExamplesWhenEmpty?: boolean }
): CartographyIssuerCardData[] {
  if (!rawItems?.length) {
    if (options?.includeExamplesWhenEmpty === false) return [];
    return CARTOGRAPHY_ISSUER_EXAMPLE_CARDS;
  }

  const seen = new Set<string>();
  const cards: CartographyIssuerCardData[] = [];

  rawItems.forEach((raw, index) => {
    const badge = raw?.badge || {};
    const title = badge.name || 'Badge';
    const level = badge.level ? badge.level.replace('level_', '') : '1';
    const orgName = getOrganizationName(raw);
    const key = `${title}|Niveau ${level}|${orgName}`;

    if (seen.has(key)) return;
    seen.add(key);

    const palette = CARD_COLOR_PALETTE[cards.length % CARD_COLOR_PALETTE.length];
    const org = raw?.organization;

    cards.push({
      id: String(raw.id ?? key),
      badgeKey: `${title}|Niveau ${level}`,
      acronym: buildAcronym(orgName),
      title,
      subtitle: orgName,
      statusLabel: getOrganizationStatusLabel(org),
      color: palette.color,
      lightAcronymText: palette.lightAcronymText,
    });
  });

  return cards;
}
