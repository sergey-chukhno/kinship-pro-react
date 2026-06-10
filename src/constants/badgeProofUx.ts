import { BadgeProofQaClass } from '../types/badgeProof';

/** Fallback header — D-BADGE-SERIES-NORMALIZATION */
export const BADGE_PROOF_HEADER_FALLBACK_COLOR = '#534AB7';

/** Labels series_scope — Zone 1 (Fondation #5) */
export const SERIES_SCOPE_LABELS: Record<string, (entityName?: string) => string> = {
  kinship_catalog: () => 'Référentiel Kinship',
  institutional: (name) => (name ? `Porté par ${name}` : 'Porté par'),
  internal_organization: (name) => (name ? `Créé par ${name}` : 'Créé par'),
  authority_validated: (name) => (name ? `Validé par ${name}` : 'Validé par'),
  marketplace_partner: (name) => (name ? `Sous licence ${name}` : 'Sous licence'),
};

/** trust_level → badge QA Zone 3 — T-TRUST-LEVEL V2 */
export const TRUST_LEVEL_QA: Record<
  string,
  { label: string; qaClass: BadgeProofQaClass; cssVar: string }
> = {
  public_authority: { label: 'Institution publique', qaClass: 'qa-accreditation-pub', cssVar: '#003D8F' },
  diploma_accreditation: { label: 'Accréditation publique', qaClass: 'qa-accreditation-pub', cssVar: '#7C3AED' },
  enhanced_external: { label: 'Reconnu et certifié par', qaClass: 'qa-externe-renf', cssVar: '#8B6200' },
  state_supervised: { label: 'Reconnu et supervisé par', qaClass: 'qa-externe-sup', cssVar: '#0D9488' },
  external_audit: { label: 'Certifié par', qaClass: 'qa-externe-renf', cssVar: '#0891B2' },
  internal_qa: { label: 'Vérifié', qaClass: 'qa-externe', cssVar: '#49B6D7' },
};

export const RETENTION_POLICY_LABELS: Record<string, string> = {
  PERMANENT: 'Conservation permanente',
  '5_YEARS': 'Conservation 5 ans',
  '10_YEARS': 'Conservation 10 ans',
  '75_YEARS': 'Conservation 75 ans',
  MAJORITY_PLUS_1: 'Conservation réglementaire',
};

export const EVIDENCE_EMPTY_LABEL = 'Non renseigné';
export const IDENTITY_MASKED_LABEL = 'Identité masquée';
/** Zone 6 — choix du porteur adulte (show_owner_name = false) */
export const IDENTITY_MASKED_SHARE_LABEL = 'Masquer mon identité sur la preuve partagée';
export const IDENTITY_MASKED_SHARE_HINT =
  'Identité masquée — Porteur adulte ayant choisi de ne pas s\'identifier.';
export const CIVIL_DATA_ERASED_LABEL = 'Données civiles effacées';
export const PROJECT_PROOF_PENDING_LABEL = 'Preuve Projet — non encore générée';
export const PRESENCE_VERIFIED_LABEL = 'Présence physique vérifiée';
export const JSON_EXPORT_DISABLED_LABEL = 'Disponible après dépôt brevet';
export const FOOTER_RETENTION_DEFAULT = 'Conservation 10 ans · Vérifiable à vie sans compte Kinship';

export function evidenceIconFromType(type?: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('video') || t.includes('mp4')) return '🎬';
  if (t.includes('image') || t.includes('png') || t.includes('jpg')) return '🖼';
  if (t.includes('pdf')) return '📄';
  return '📎';
}

export function qaFromStatusLabel(statusLabel: string): { label: string; qaClass: BadgeProofQaClass } {
  const l = statusLabel.toLowerCase();
  if (l.includes('institution publique')) return { label: 'Institution publique', qaClass: 'qa-accreditation-pub' };
  if (l.includes('accréditation')) return { label: 'Accréditation publique', qaClass: 'qa-accreditation-pub' };
  if (l.includes('reconnu et certifié')) return { label: 'Reconnu et certifié par', qaClass: 'qa-externe-renf' };
  if (l.includes('supervis')) return { label: 'Reconnu et supervisé par', qaClass: 'qa-externe-sup' };
  if (l.includes('établissement scolaire')) return { label: 'Vérifié', qaClass: 'qa-interne' };
  if (l.includes('certifié')) return { label: 'Certifié par', qaClass: 'qa-externe-renf' };
  return { label: statusLabel || 'Vérifié', qaClass: 'qa-externe' };
}
