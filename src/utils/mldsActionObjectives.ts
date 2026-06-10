/** Options « Objectifs de l'action » — partagées création (MLDSProjectModal) et édition (ProjectManagement). */

export type MldsActionObjectiveOption = { value: string; label: string };

export const MLDS_PERSEVERANCE_ACTION_OBJECTIVES: MldsActionObjectiveOption[] = [
  {
    value: 'path_security',
    label: 'La sécurisation des parcours : liaison inter-cycles pour les élèves les plus fragiles',
  },
  {
    value: 'professional_discovery',
    label: 'La découverte des filières professionnelles',
  },
  {
    value: 'student_mobility',
    label: 'Le développement de la mobilité des élèves',
  },
  {
    value: 'cps_development',
    label: 'Le développement des CPS pour les élèves en situation ou en risque de décrochage scolaire avéré',
  },
  {
    value: 'territory_partnership',
    label:
      'Le rapprochement des établissements avec les partenaires du territoire (missions locales, associations, entreprises, etc.) afin de mettre en place des parcours personnalisés (PAFI, TDO, Avenir Pro Plus, autres)',
  },
  {
    value: 'family_links',
    label:
      'Le renforcement des liens entre les familles et les élèves en risque ou en situation de décrochage scolaire',
  },
  {
    value: 'professional_development',
    label:
      "Des actions de co-développement professionnel ou d'accompagnement d'équipes (tutorat, intervention de chercheurs, etc.)",
  },
  { value: 'other', label: 'Autre' },
];

export const MLDS_REMEDIATION_ACTION_OBJECTIVES: MldsActionObjectiveOption[] = [
  {
    value: 'professional_discovery',
    label: 'La découverte des filières professionnelles',
  },
  {
    value: 'aec_development',
    label: "Parcours d'éducation artistique et culturelle",
  },
  {
    value: 'future_path_development',
    label: "Parcours d'avenir",
  },
  {
    value: 'citizen_path_development',
    label: 'Parcours citoyen',
  },
  {
    value: 'pe_development',
    label: "Apprendre par l'éducation physique et sportive",
  },
  {
    value: 'disciplinary_courses',
    label: 'Cours disciplinaires',
  },
  {
    value: 'job_discovery',
    label: 'Découverte des métiers',
  },
  {
    value: 'training_discovery',
    label: 'Découverte des formations',
  },
  { value: 'other', label: 'Autre' },
];

export function getMldsActionObjectivesOptions(isRemediation: boolean): MldsActionObjectiveOption[] {
  return isRemediation ? MLDS_REMEDIATION_ACTION_OBJECTIVES : MLDS_PERSEVERANCE_ACTION_OBJECTIVES;
}

const ALL_OBJECTIVES = [...MLDS_PERSEVERANCE_ACTION_OBJECTIVES, ...MLDS_REMEDIATION_ACTION_OBJECTIVES];

/** Libellé affichage / export PDF ; gère aussi d'anciennes clés si besoin. */
export function getMldsActionObjectiveLabel(value: string): string {
  const fromList = ALL_OBJECTIVES.find(o => o.value === value)?.label;
  if (fromList) return fromList;

  const legacyLabels: Record<string, string> = {
    art_culture_path: "Parcours d'éducation artistique et culturelle",
    avenir_path: "Parcours d'avenir",
    citizen_path: 'Parcours citoyen',
    physical_education: "Apprendre par l'éducation physique et sportive",
    disciplinary_course: 'Cours disciplinaire',
  };
  return legacyLabels[value] ?? value;
}
