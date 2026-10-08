/**
 * RGPD anonymisation (CAS B/C/D/E/F, back : lib/civil_data_erased.rb).
 * Le back stocke le littéral technique "CIVIL_DATA_ERASED" (CivilDataErased::LABEL).
 * Sur les surfaces Famille A, ProofGenerator.holder_display est censé servir déjà
 * « Données civiles effacées » — mais toute lecture FE d’un nom / holder_display doit
 * aussi traduire le littéral (défense en profondeur ; jamais d’affichage brut — Patrick).
 *
 * Note: User#full_name / receiver_display_label_for_award joignent first+last →
 * "CIVIL_DATA_ERASED CIVIL_DATA_ERASED" quand les deux champs portent le sentinelle.
 * On détecte donc toute occurrence du sentinelle, pas seulement l’égalité stricte.
 */
export const CIVIL_DATA_ERASED_SENTINEL = 'CIVIL_DATA_ERASED';
export const CIVIL_DATA_ERASED_LABEL = 'Données civiles effacées';

/** True if value is (or contains) the technical civil-data sentinel. */
export function isCivilDataErased(value?: string | null): boolean {
  if (typeof value !== 'string') return false;
  return value.includes(CIVIL_DATA_ERASED_SENTINEL);
}

/**
 * Traduit un libellé d’affichage (holder_display, name, etc.) : jamais le littéral technique.
 */
export function displayCivilLabel(
  value?: string | null,
  fallback: string = '—'
): string {
  if (isCivilDataErased(value)) return CIVIL_DATA_ERASED_LABEL;
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed) return trimmed;
  return isCivilDataErased(fallback) ? CIVIL_DATA_ERASED_LABEL : fallback;
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
    isCivilDataErased(fullName) ||
    isCivilDataErased(firstName) ||
    isCivilDataErased(lastName)
  ) {
    return CIVIL_DATA_ERASED_LABEL;
  }
  const composed = fullName || `${firstName || ''} ${lastName || ''}`.trim();
  if (isCivilDataErased(composed)) return CIVIL_DATA_ERASED_LABEL;
  if (composed) return composed;
  return isCivilDataErased(fallback) ? CIVIL_DATA_ERASED_LABEL : fallback;
}
