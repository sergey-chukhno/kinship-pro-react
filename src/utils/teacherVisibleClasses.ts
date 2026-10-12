/**
 * Helpers for Patrick « Choix de la classe enseignant »:
 * sort Référent → équipe pédagogique → others; count missing participants.
 */

export type TeacherVisibleClass = {
  id: string | number;
  name?: string;
  level?: string;
  students_count?: number;
  is_referent?: boolean;
  is_creator?: boolean;
  is_pedagogical_team?: boolean;
  in_my_classes?: boolean;
};

export function isClassReferent(cls: TeacherVisibleClass): boolean {
  return Boolean(cls.is_referent || cls.is_creator);
}

/** Référent first, then pedagogical team, then the rest (stable by name). */
export function sortTeacherVisibleClasses<T extends TeacherVisibleClass>(classes: T[]): T[] {
  return [...classes].sort((a, b) => {
    const rank = (c: TeacherVisibleClass) => {
      if (isClassReferent(c)) return 0;
      if (c.is_pedagogical_team) return 1;
      return 2;
    };
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return String(a.name || '').localeCompare(String(b.name || ''), 'fr');
  });
}

/** How many students are not yet in the project participants set. */
export function countMissingParticipants(
  studentIds: Array<string | number>,
  existingParticipantIds: Array<string | number>
): number {
  const existing = new Set(existingParticipantIds.map(id => id.toString()));
  return studentIds.filter(id => !existing.has(id.toString())).length;
}
