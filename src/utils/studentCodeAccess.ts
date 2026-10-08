/** Ticket 57 Phase 1a — messages & helpers for student-code read-only accounts. */

export const STUDENT_CODE_NEED_VERIFIED_EMAIL =
  'Pour cela, ton compte a besoin d\'une adresse email vérifiée.';

export const STUDENT_CODE_MISMATCH =
  'Ces informations ne correspondent pas. Vérifie-les, ou demande un nouveau code à ton établissement.';

export const STUDENT_CODE_LOST_HINT =
  'Ton code est sur le papier que ton établissement t\'a donné. Si tu l\'as perdu, demande-lui : il t\'en donnera un nouveau.';

export function isReadOnlyUntilEmail(user: { read_only_until_email?: boolean } | null | undefined): boolean {
  return Boolean(user?.read_only_until_email);
}
