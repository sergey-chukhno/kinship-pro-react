const ROLE_TRANSLATIONS: Record<string, string> = {
  admin: 'Admin',
  admins: 'Admin',
  superadmin: 'Superadmin',
  referent: 'Référent',
  referants: 'Référent',
  referant: 'Référent',
  referents: 'Référent',
  member: 'Membre',
  members: 'Membre',
  intervenant: 'Intervenant',
  intervenants: 'Intervenant',
  staff: 'Personnel',
  employee: 'Salarié',
  employees: 'Salarié',
  parent: 'Parent',
  grand_parent: 'Grand-parent',
  grandparent: 'Grand-parent',
  children: 'Enfant',
  child: 'Enfant',
  tutor: 'Tuteur',
  mentor: 'Mentor',
  coach: 'Coach',
  participant: 'Participant',
  charge_de_mission: 'Chargé(e) de mission',
  voluntary: 'Volontaire',
  volunteers: 'Volontaire',
  volunteer: 'Volontaire',
  volontaires: 'Volontaire',
  volontaires_engages: 'Volontaire',
  volontaires_implication: 'Volontaire',
  benevole: 'Bénévole',
  benevoles: 'Bénévole',
  benevolat: 'Bénévole',
  eleve: 'Élève',
  eleves: 'Élève',
  eleve_primaire: 'Élève du primaire',
  collegien: 'Collégien',
  lyceen: 'Lycéen',
  etudiant: 'Étudiant',
  student: 'Élève',
  students: 'Élève',
  school_student: 'Élève',
  teacher: 'Enseignant',
  school_teacher: 'Enseignant',
  primary_school_teacher: 'Enseignant du primaire',
  secondary_school_teacher: 'Professeur de collège/lycée',
  education_rectorate_personnel: 'Personnel du rectorat',
  administrative_staff: 'Personnel administratif',
  cpe_student_life: "Conseiller Principal d'Education (CPE)",
  directeur_ecole: "Directeur d'Ecole",
  directeur_d_ecole: "Directeur d'Ecole",
  directeur_academique: 'Directeur Académique',
  directeur_academie: 'Directeur Académique',
  principal: 'Principal',
  proviseur: 'Proviseur',
  responsable_academique: 'Responsable Académique',
  responsable_academic: 'Responsable Académique',
  responsable_academy: 'Responsable Académique',
  president_association: "Président d'Association",
  association_president: "Président d'Association",
  president_fondation: "Président de Fondation",
  foundation_president: "Président de Fondation",
  directeur_organisation: "Directeur d'Organisation",
  directeur_entreprise: "Directeur d'Entreprise",
  enterprise_director: "Directeur d'Entreprise",
  company_director: "Directeur d'Entreprise",
  responsable_rh_formation_secteur: "Responsable RH / Formation / Secteur",
  responsable_rh: 'Responsable RH',
  responsable_ressources_humaines: 'Responsable RH',
  responsable_etablissement: "Responsable d'établissement",
  responsable_etablissements: "Responsable d'établissement",
  responsable_de_programme: 'Responsable de programme',
  responsable_programme: 'Responsable de programme',
  responsable: 'Responsable',
  other: 'Autre',
  autre: 'Autre',
  other_teacher: 'Enseignant',
  other_school_admin: 'Responsable d\'établissement',
  other_company_admin: 'Responsable d\'entreprise',
  other_personal_user: 'Autre',

};

export const normalizeRoleKey = (role: string) =>
  role
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const beautifyRoleLabel = (role: string) => {
  const trimmed = role.trim();
  if (!trimmed) return 'Membre';
  const hasCustomFormatting = /[A-ZÀ-ÖØ-Þ]/.test(trimmed) && !trimmed.includes('_');
  if (hasCustomFormatting) return trimmed;
  const cleaned = trimmed.replace(/[_-]+/g, ' ');
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Membre';
};

export const translateRole = (role?: string | null) => {
  if (!role) return 'Membre';
  const normalized = normalizeRoleKey(role);
  if (normalized && ROLE_TRANSLATIONS[normalized]) {
    return ROLE_TRANSLATIONS[normalized];
  }
  return beautifyRoleLabel(role);
};

export const translateRoles = (roles: (string | null | undefined)[] = []) => {
  const translated = roles.map(translateRole);
  return translated.filter((value, index) => value && translated.indexOf(value) === index);
};


