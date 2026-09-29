// Libellé « quality_framework » — grille des pièces justificatives V1.0.4 (28/09, section G,
// décisions Patrick Saoula). quality_framework est la pièce qualité de l'ORGANISME émetteur,
// gelée à l'attribution (UserBadge#quality_framework_at_assign) — à ne pas confondre avec
// qa_type / series_authority_qa_type, qui porte sur l'autorité de la SÉRIE (axe différent).
// Partagé entre pbProofMapper.ts (page publique /pb/:token) et userBadgeProofMapper.ts
// (organization.quality_framework, exposé depuis le 29/09 par UserBadge#organization_display_hash
// sur /users/me/badges et les listes schools/teachers/companies — confirmé par Sergey).
// Règle V1.0.4 ③ : le mot « Qualiopi » ne doit jamais apparaître sur une preuve.
const QUALITY_FRAMEWORK_LABELS: Record<string, string> = {
  qualiopi: '◆ Organisme de formation certifié',
  rncp: '⬡ Organisme certificateur — répertoire national des certifications professionnelles',
  accreditation: '⬡ Établissement accrédité par l\'État — diplômes nationaux',
  rs: '✓ Organisme certificateur — répertoire spécifique',
  uai: 'Établissement scolaire',
  rna: '✓ Vérifié',
  siret: '✓ Vérifié',
  bleu_contract: '✓ Vérifié',
};

export interface QualityFrameworkLabelInput {
  qualityFramework?: string | null;
  organizationTrustLevel?: string | null;
  organizationName?: string | null;
}

/**
 * quality_framework porte soit un code connu de la grille V1.0.4, soit — pour un agrément saisi
 * à la main validé par un seul Super Admin (niveau CERTIFIED) — directement le texte de
 * l'agrément tel qu'enregistré (agreement_label). Il reste NULL pour un agrément « double
 * validation » (INSTITUTIONAL — le libellé se dérive alors du trust_level de l'organisme) et
 * pour STANDARD/VERIFIED sans code nommé.
 */
export function resolveQualityFrameworkLabel({
  qualityFramework,
  organizationTrustLevel,
  organizationName,
}: QualityFrameworkLabelInput): string {
  const framework = qualityFramework?.trim();
  if (framework) {
    if (QUALITY_FRAMEWORK_LABELS[framework]) return QUALITY_FRAMEWORK_LABELS[framework];
    return `✓ Association agréée — ${framework}`;
  }
  if (String(organizationTrustLevel ?? '').toUpperCase() === 'INSTITUTIONAL') {
    return '✦ Institution publique';
  }
  const org = organizationName?.trim();
  return org ? `Émis par ${org}` : 'Preuve Kinship';
}
