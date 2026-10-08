/**
 * RGPD anonymisation (CAS B/C/D/E/F, back : lib/civil_data_erased.rb).
 * Le back stocke le littéral technique "CIVIL_DATA_ERASED" (CivilDataErased::LABEL).
 * Sur les surfaces Famille A, ProofGenerator.holder_display est censé servir déjà
 * « Données civiles effacées » — mais toute lecture FE d’un nom / holder_display doit
 * aussi traduire le littéral (défense en profondeur ; jamais d’affichage brut — Patrick).
 */
export const CIVIL_DATA_ERASED_SENTINEL = 'CIVIL_DATA_ERASED';
export const CIVIL_DATA_ERASED_LABEL = 'Données civiles effacées';

/**
 * Traduit un libellé d’affichage (holder_display, name, etc.) : jamais le littéral technique.
 */
export function displayCivilLabel(
  value?: string | null,
  fallback: string = '—'
): string {
  if (value === CIVIL_DATA_ERASED_SENTINEL) return CIVIL_DATA_ERASED_LABEL;
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed) return trimmed;
  return fallback === CIVIL_DATA_ERASED_SENTINEL ? CIVIL_DATA_ERASED_LABEL : fallback;
}

/**
 * Résout le nom affichable d'une personne à partir de full_name / first_name / last_name,
 * en traduisant le littéral technique en "Données civiles effacées" quel que soit le champ
 * qui le porte (il peut n'apparaître que sur l'un des trois selon le point d'API).
 */
export function displayPersonName(
  fullName?: string | null,
  firstName?: string | null,
  lastName?: string | null,
  fallback: string = 'Inconnu'
): string {
  if (
    fullName === CIVIL_DATA_ERASED_SENTINEL ||
    firstName === CIVIL_DATA_ERASED_SENTINEL ||
    lastName === CIVIL_DATA_ERASED_SENTINEL
  ) {
    return CIVIL_DATA_ERASED_LABEL;
  }
  const composed = fullName || `${firstName || ''} ${lastName || ''}`.trim();
  if (composed) return composed;
  return fallback === CIVIL_DATA_ERASED_SENTINEL ? CIVIL_DATA_ERASED_LABEL : fallback;
}
