/**
 * Student roles (personal user system role). Users with these roles cannot leave schools
 * (établissements) — "Quitter" is hidden on school cards in Mon réseau and Personal settings.
 */
export const STUDENT_ROLES = ['eleve_primaire', 'collegien', 'lyceen', 'etudiant'] as const;

export function isStudentRole(role: string | undefined): boolean {
  if (!role) return false;
  return STUDENT_ROLES.includes(role as typeof STUDENT_ROLES[number]);
}
