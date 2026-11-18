/** Copy helpers — clôture / certificat (Patrick : dates FR, unités, accords). */

const MONTHS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** ISO YYYY-MM-DD (ou datetime) → 17/10/2026 */
export function formatDateShortFr(iso?: string): string {
  if (!iso) return '—';
  const day = String(iso).includes('T') ? String(iso).slice(0, 10) : String(iso).slice(0, 10);
  const [y, m, d] = day.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Map stable API error codes (V15) → FR. Empty string if unknown (caller uses fallback). */
export function formationEndCloseErrorMessage(code: unknown, fallback: string): string {
  switch (String(code || '')) {
    case 'not_in_progress':
      return 'La session n’est pas en cours.';
    case 'not_formation':
      return 'Cette action concerne une session de formation.';
    case 'not_responsible_trainer':
      return 'Seul le formateur responsable peut déclarer la fin.';
    case 'can_close_directly':
      return 'Votre rôle peut clôturer directement — pas de déclaration de fin.';
    case 'already_declared':
      return 'La fin de session est déjà déclarée.';
    case 'no_active_declaration':
      return 'Aucune fin de session déclarée.';
    case 'already_ended':
      return 'La session est déjà clôturée.';
    case 'closure_forbidden_for_role':
      return 'Vous n’êtes pas autorisé à clôturer cette session.';
    default:
      return fallback;
  }
}

/** ISO → 17 octobre 2026 */
export function formatDateLongFr(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_FR[m - 1]} ${y}`;
}

/** « du 17 octobre 2026 au 23 octobre 2026 » */
export function formatDateRangeLongFr(startIso?: string, endIso?: string): string {
  return `du ${formatDateLongFr(startIso)} au ${formatDateLongFr(endIso)}`;
}

/** « 21 » ou « 21 h » → « 21 heures » */
export function formatDurationHoursLabel(raw?: string): string {
  if (!raw || !String(raw).trim()) return '';
  const s = String(raw).trim();
  if (/heure/i.test(s)) return s;
  const n = s.replace(/,/g, '.').replace(/[^\d.]/g, '');
  if (!n) return s;
  const num = Number(n);
  if (Number.isNaN(num)) return s;
  return num <= 1 ? `${stripTrailingZero(n)} heure` : `${stripTrailingZero(n)} heures`;
}

function stripTrailingZero(n: string): string {
  return n.replace(/\.0+$/, '');
}

export function proofLabel(count: number, mc: boolean): string {
  if (mc) {
    return count <= 1 ? `${count} microcertification` : `${count} microcertifications`;
  }
  return count <= 1 ? `${count} preuve de formation` : `${count} preuves de formation`;
}

export function invalidParticipantSentence(
  count: number,
  names: string[],
  mc: boolean
): string {
  const what = mc ? 'microcertification' : 'preuve de formation';
  if (count <= 1) {
    return `1 participant non validé ne recevra pas de ${what} : ${names.join(', ')}.`;
  }
  return `${count} participants non validés ne recevront pas de ${what} : ${names.join(', ')}.`;
}

export function printCertificatesLabel(count: number): string {
  return count <= 1 ? 'Imprimer le certificat' : `Imprimer les ${count} certificats`;
}

/** Accès nominatif 6 ans après clôture (maquette P4.6). */
export function nominativeAccessUntil(closedAtIso?: string): string {
  if (!closedAtIso) return '—';
  const [y, m, d] = closedAtIso.split('-').map(Number);
  if (!y || !m || !d) return '—';
  return formatDateShortFr(`${y + 6}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
}

/** Ensure middot form even if stored with hyphens. */
export function formatProofCodeDisplay(code?: string): string {
  if (!code) return 'PF·····';
  return code.replace(/-/g, '·');
}
