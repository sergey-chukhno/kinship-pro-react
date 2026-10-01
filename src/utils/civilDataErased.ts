/**
 * RGPD anonymisation (CAS B/C/D/E/F, back : lib/civil_data_erased.rb) : une fois les données
 * civiles effacées, le back renvoie volontairement le littéral technique "CIVIL_DATA_ERASED"
 * dans full_name / first_name / last_name (UserSerializer), hors du mécanisme holder_display
 * (réservé aux attributions de badge). Sans traduction FE, ce code technique s'affiche en dur
 * partout où un nom de membre/participant est lu directement (Patrick, 01/10).
 */
export const CIVIL_DATA_ERASED_SENTINEL = 'CIVIL_DATA_ERASED';
export const CIVIL_DATA_ERASED_LABEL = 'Données civiles effacées';

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
  return fullName || `${firstName || ''} ${lastName || ''}`.trim() || fallback;
}
