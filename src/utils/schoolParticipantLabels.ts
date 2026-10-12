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

/**
 * Libellé d’un membre école / enseignant pour la liste d’ajout projet.
 * Préfère le rôle système (role_in_system) — l’API école expose role_in_school
 * (= souvent "member") sans champ `role`, ce qui affichait à tort « membre ».
 */
export function memberSchoolOrgRoleLabel(member: {
  role?: string | null;
  role_in_system?: string | null;
  organization_role?: string | null;
  member_type?: string | null;
  user?: { role?: string | null } | null;
} | null | undefined): string {
  if (member?.member_type === 'student') {
    return schoolOrgRoleLabel('eleve');
  }
  const role =
    member?.role_in_system ||
    member?.user?.role ||
    member?.role ||
    member?.organization_role;
  return schoolOrgRoleLabel(role);
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
