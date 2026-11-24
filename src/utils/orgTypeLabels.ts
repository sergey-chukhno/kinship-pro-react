/** Humanize school_type / company_type slugs for UI (Lot3 Patrick). */

import { normalizeRoleKey } from './roleTranslations';

const ORG_TYPE_LABELS: Record<string, string> = {
  college: 'Collège',
  lycee: 'Lycée',
  lycee_professionnel: 'Lycée professionnel',
  ecole_primaire: 'École primaire',
  primaire: 'École primaire',
  elementary: 'École primaire',
  secondary: 'Secondaire',
  university: 'Université',
  universite: 'Université',
  medico_social: 'Médico-social',
  information_et_orientation: 'Information et orientation',
  association: 'Association',
  educational_city: 'Cité éducative',
  enterprise: 'Entreprise',
  entreprise: 'Entreprise',
  foundation: 'Fondation',
  fondation: 'Fondation',
  local_authority: 'Collectivité',
  collectivite: 'Collectivité',
  metropolis: 'Métropole',
  metropole: 'Métropole',
  rectorate: 'Rectorat',
  rectorat: 'Rectorat',
  other: 'Autre',
  autre: 'Autre',
};

function beautifySlug(raw: string): string {
  const cleaned = raw.trim().replace(/[_-]+/g, ' ');
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Translate school_type / company_type / company_type.name for display.
 * Accepts slug (`medico_social`), spaced (`medico social`), or already-FR labels.
 */
export function translateOrgType(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';

  const normalized = normalizeRoleKey(trimmed);
  if (normalized && ORG_TYPE_LABELS[normalized]) {
    return ORG_TYPE_LABELS[normalized];
  }

  // Already human FR (accents / capitals, no underscore) — keep as-is
  const hasCustomFormatting = /[A-ZÀ-ÖØ-Þ]/.test(trimmed) && !trimmed.includes('_');
  if (hasCustomFormatting) return trimmed;

  return beautifySlug(trimmed) || trimmed;
}

/** Extract company_type whether API sends string or `{ name }`. */
export function companyTypeRaw(company: { company_type?: unknown } | null | undefined): string {
  const ct = company?.company_type;
  if (!ct) return '';
  if (typeof ct === 'string') return ct;
  if (typeof ct === 'object' && ct !== null && 'name' in ct) {
    const name = (ct as { name?: unknown }).name;
    return typeof name === 'string' ? name : '';
  }
  return '';
}
