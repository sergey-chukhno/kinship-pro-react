export type FormationStatus = 'draft' | 'coming' | 'in_progress' | 'ended' | 'archived';
export type FinancementType = 'CPF' | 'OPCO' | 'Entreprise' | 'Associative' | 'Autre';

export interface FormationCard {
  id: string;
  title: string;
  status: FormationStatus;
  financement?: FinancementType;
  isEuMcDeclared?: boolean;
  meta: string;
  identitiesToVerify?: number;
  endDateOverdue?: boolean;
  proofNumber?: string;
  hasProof?: boolean;
  selected?: boolean;
  archivedYear?: number;
}

export const MOCK_OF_ORG = {
  id: 'of-demo',
  name: 'Centre AFPA Nice',
  qualiopiValidUntil: '12/03/2027',
  lastVerified: '17/07/2026 06:00',
};

export const MOCK_FORMATIONS: FormationCard[] = [
  {
    id: 'f1',
    title: 'Remise à niveau numérique — parcours 2027',
    status: 'draft',
    financement: 'Autre',
    meta: 'créée le 12/07/2026 · jamais activée · visible par vous seul',
  },
  {
    id: 'f2',
    title: 'Titre professionnel ECM — session 2',
    status: 'coming',
    financement: 'CPF',
    meta: 'du 05/01 au 10/04/2027 · 12 inscrits · démarrage automatique le 05/01',
    identitiesToVerify: 3,
  },
  {
    id: 'f3',
    title: 'Titre professionnel ECM',
    status: 'in_progress',
    financement: 'CPF',
    isEuMcDeclared: true,
    meta: 'du 14/09 au 18/12/2026 · 17 participants · prochaine séance : Matinée, 9h00',
    identitiesToVerify: 3,
  },
  {
    id: 'f4',
    title: 'Remise à niveau — savoirs de base',
    status: 'in_progress',
    financement: 'OPCO',
    meta: 'du 01/06 au 30/06/2026 · 9 participants · date de fin dépassée — à clôturer depuis la fiche',
    endDateOverdue: true,
  },
  {
    id: 'f5',
    title: 'BAFA approfondissement',
    status: 'ended',
    financement: 'Associative',
    meta: 'clôturée le 28/06/2026 · 21 participants · PF·2026·FR·8Q2MV3JX · accès nominatif jusqu’au 28/06/2031 · 2 partages actifs',
    proofNumber: 'PF·2026·FR·8Q2MV3JX',
    hasProof: true,
    selected: true,
  },
  {
    id: 'f6',
    title: 'CléA numérique — cohorte printemps',
    status: 'ended',
    financement: 'OPCO',
    isEuMcDeclared: true,
    meta: 'clôturée le 30/06/2026 · 14 participants · MC·UE·2026·FR·7K4NX2QM · accès nominatif jusqu’au 30/06/2031 · 1 partage actif',
    proofNumber: 'MC·UE·2026·FR·7K4NX2QM',
    hasProof: true,
    selected: true,
  },
  {
    id: 'f7',
    title: 'Atelier découverte métiers',
    status: 'ended',
    financement: 'Entreprise',
    meta: 'clôturée le 15/06/2026 · 6 participants · clôturée sans preuve (aucun badge attribué)',
    hasProof: false,
  },
  {
    id: 'f8',
    title: 'Titre professionnel ECM — session 0 (pilote)',
    status: 'archived',
    financement: 'CPF',
    meta: 'archivée le 02/07/2026 · PF·2026·FR·2W8KQ4TN · accès nominatif jusqu’au 15/05/2031',
    proofNumber: 'PF·2026·FR·2W8KQ4TN',
    hasProof: true,
    archivedYear: 2026,
  },
  {
    id: 'f9',
    title: 'Remise à niveau — savoirs de base 2025',
    status: 'archived',
    financement: 'OPCO',
    meta: 'archivée le 10/01/2026 · PF·2025·FR·6J3MZ8RW · accès nominatif jusqu’au 20/12/2030 · 1 partage actif',
    proofNumber: 'PF·2025·FR·6J3MZ8RW',
    hasProof: true,
    archivedYear: 2025,
  },
];
