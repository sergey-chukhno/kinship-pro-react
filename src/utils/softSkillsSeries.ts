/**
 * Soft Skills (Compétences transversales) — pictos EXPORTS_S8 + axe colors (Patrick 06/11).
 * SVG under public/badges_competences_transversales/ (currentColor).
 */

export const SOFT_SKILLS_AXE_COLORS: Record<
  'relationnel' | 'personnel' | 'methode' | 'creation',
  string
> = {
  relationnel: '#FF616F',
  personnel: '#F0A03C',
  methode: '#48A78D',
  creation: '#783A7F',
};

type SoftSkillKey =
  | 'communication'
  | 'cooperation'
  | 'sociabilite'
  | 'adaptabilite'
  | 'engagement'
  | 'esprit_critique'
  | 'formation'
  | 'gestion_de_projet'
  | 'organisation_operationnelle'
  | 'creativite'
  | 'informatique_numerique';

/** Keys are accent-stripped + lowercased (see normalizeSoftSkillName). */
const SOFT_SKILL_BY_NAME: Record<string, SoftSkillKey> = {
  communication: 'communication',
  cooperation: 'cooperation',
  sociabilite: 'sociabilite',
  adaptabilite: 'adaptabilite',
  engagement: 'engagement',
  'esprit critique': 'esprit_critique',
  formation: 'formation',
  'gestion de projet': 'gestion_de_projet',
  'organisation operationnelle': 'organisation_operationnelle',
  creativite: 'creativite',
  'informatique & numerique': 'informatique_numerique',
  'informatique et numerique': 'informatique_numerique',
  'informatique numerique': 'informatique_numerique',
  // Catalog / tree title on staging (Patrick smoke 06/11) — not "Informatique & …"
  'information numerique': 'informatique_numerique',
  'information & numerique': 'informatique_numerique',
  'information et numerique': 'informatique_numerique',
};

const SOFT_SKILL_AXE: Record<SoftSkillKey, keyof typeof SOFT_SKILLS_AXE_COLORS> = {
  communication: 'relationnel',
  cooperation: 'relationnel',
  sociabilite: 'relationnel',
  adaptabilite: 'personnel',
  engagement: 'personnel',
  esprit_critique: 'methode',
  formation: 'methode',
  gestion_de_projet: 'methode',
  organisation_operationnelle: 'methode',
  creativite: 'creation',
  informatique_numerique: 'creation',
};

function normalizeSoftSkillName(name?: string | null): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function getSoftSkillKeyFromName(name?: string | null): SoftSkillKey | undefined {
  const n = normalizeSoftSkillName(name);
  if (!n) return undefined;
  return SOFT_SKILL_BY_NAME[n] || SOFT_SKILL_BY_NAME[n.replace(/&/g, 'et')];
}

export function getSoftSkillsLocalPicto(name?: string | null): string | undefined {
  const key = getSoftSkillKeyFromName(name);
  return key ? `/badges_competences_transversales/${key}.svg` : undefined;
}

export function getSoftSkillsAxeColor(name?: string | null): string | undefined {
  const key = getSoftSkillKeyFromName(name);
  if (!key) return undefined;
  return SOFT_SKILLS_AXE_COLORS[SOFT_SKILL_AXE[key]];
}
