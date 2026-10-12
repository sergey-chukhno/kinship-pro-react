/** Roles système élèves → toujours affichés « élève » en contexte école / enseignant. */
export const SCHOOL_STUDENT_ROLES = new Set([
  'eleve_primaire',
  'eleve',
  'collegien',
  'lyceen',
  'etudiant',
  'student',
  'school_student',
]);

export function schoolOrgRoleLabel(role: string | undefined | null): string {
  const key = String(role || 'membre');
  if (SCHOOL_STUDENT_ROLES.has(key)) return 'élève';
  const map: Record<string, string> = {
    superadmin: 'super admin',
    admin: 'admin',
    referent: 'référent',
    intervenant: 'intervenant',
    member: 'membre',
  };
  return map[key] || key.replace(/_/g, ' ');
}

/** Nombre de cochés qui ne sont pas déjà participants (pour CTA « Ajouter N élèves »). */
export function countSelectableChosen(
  selected: Iterable<string>,
  existingMemberIds: Iterable<string>
): number {
  const existing = new Set(Array.from(existingMemberIds, String));
  let n = 0;
  Array.from(selected, String).forEach((id) => {
    if (!existing.has(id)) n += 1;
  });
  return n;
}

export function addChosenStudentsCtaLabel(addableCount: number): string {
  if (addableCount === 0) return '✓ dans le projet';
  return `Ajouter ${addableCount} élève${addableCount > 1 ? 's' : ''}`;
}
