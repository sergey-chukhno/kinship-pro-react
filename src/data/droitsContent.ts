export const MOCK_VALID_PIK = '3F7K–92MX–Q8ZR–1DPW–K4NB–X6TJ';

export const PIK_RATE_LIMIT = 5;

export type DroitsRightId =
  | 'copy'
  | 'rectify'
  | 'mask'
  | 'export'
  | 'delete'
  | 'dpo';

export interface DroitsRightCard {
  id: DroitsRightId;
  icon: string;
  iconBg: string;
  title: string;
  descriptionLocked: string;
  descriptionUnlocked: string;
  alwaysActive?: boolean;
}

export const DROITS_RIGHTS: DroitsRightCard[] = [
  {
    id: 'copy',
    icon: '👁️',
    iconBg: '#EEF4FF',
    title: 'Recevoir une copie de mes données',
    descriptionLocked: 'Obtenir une copie des données vous concernant — Art. 15 RGPD',
    descriptionUnlocked:
      '→ la copie se prépare → Télécharger : vos données + la liste de vos preuves (avec leurs numéros) + le lien Notice RGPD (informations de traitement) — Art. 15',
  },
  {
    id: 'rectify',
    icon: '✏️',
    iconBg: '#F0FDF4',
    title: 'Rectifier mes données',
    descriptionLocked: 'Corriger des données personnelles inexactes — Art. 16 RGPD',
    descriptionUnlocked:
      '→ instructions : « Écrivez à dpo@kinshipedu.fr en décrivant la donnée inexacte et la correction souhaitée. Pour une correction d\'état civil, joignez un justificatif à votre email. Réponse sous 1 mois. » — Art. 16',
  },
  {
    id: 'mask',
    icon: '🙈',
    iconBg: '#F5F3FF',
    title: 'Masquer mon nom sur mes preuves',
    descriptionLocked:
      'Retirer définitivement votre nom d\'une de vos preuves ou de toutes — Art. 21 RGPD',
    descriptionUnlocked:
      '→ choix : UNE preuve (numéro — « il figure sur la preuve et dans votre copie de données ») ou TOUTES → confirmation : « Votre nom n\'apparaîtra plus. La preuve reste consultable et vérifiable — pour l\'organisme émetteur comme pour les autres participants du projet — mais elle ne vous nomme plus. Définitif : votre nom ne pourra jamais y être ré-affiché. Exécution dans 72 h — annulable d\'ici là, ici, avec votre clé. » → accusé daté — Art. 21',
  },
  {
    id: 'export',
    icon: '📦',
    iconBg: '#FFFBEB',
    title: 'Exporter mes données',
    descriptionLocked:
      'Télécharger vos données et vos preuves dans un format réutilisable (JSON) — Art. 20 RGPD',
    descriptionUnlocked:
      '→ le paquet JSON complet du titulaire → Télécharger. Servi toujours : le réglage public json_export_enabled ne s\'applique jamais au titulaire — Art. 20',
  },
  {
    id: 'delete',
    icon: '🗑️',
    iconBg: '#FEF2F2',
    title: 'Supprimer mes données civiles',
    descriptionLocked:
      'Effacer définitivement vos données personnelles (anonymisation) — irréversible — Art. 17 RGPD',
    descriptionUnlocked:
      '→ re-saisie de la clé → confirmation : « Vos données personnelles seront définitivement effacées : anonymisation, irréversible. Vos preuves ne vous seront plus reliées — votre nom n\'y apparaîtra plus et vous n\'y aurez plus accès en tant que titulaire. Elles restent consultables et vérifiables, anonymes, pour les organismes émetteurs et les autres participants. Exécution dans 72 h — annulable d\'ici là, ici, avec votre clé. » → accusé daté — Art. 17',
  },
  {
    id: 'dpo',
    icon: '✉️',
    iconBg: '#EEF4FF',
    title: 'Contacter le délégué à la protection des données',
    descriptionLocked:
      'Pour toute autre demande : limitation du traitement (Art. 18), droits d\'un mineur dont vous êtes le représentant légal, clé PIK perdue, ou toute question sur vos données.',
    descriptionUnlocked:
      '→ « Écrivez à dpo@kinshipedu.fr (adresse en texte — jamais de lien cliquable) en décrivant votre demande. Selon le cas, un justificatif pourra être demandé (identité, qualité de représentant légal). Réponse sous 1 mois. » La voie DPO reste TOUJOURS disponible, y compris pour les actions des cartes.',
    alwaysActive: true,
  },
];

export const MASK_CONFIRM_TEXT =
  "Votre nom n'apparaîtra plus. La preuve reste consultable et vérifiable — pour l'organisme émetteur comme pour les autres participants du projet — mais elle ne vous nomme plus. Définitif : votre nom ne pourra jamais y être ré-affiché. Exécution dans 72 h — annulable d'ici là, ici, avec votre clé.";

export const DELETE_CONFIRM_TEXT =
  "Vos données personnelles seront définitivement effacées : anonymisation, irréversible. Vos preuves ne vous seront plus reliées — votre nom n'y apparaîtra plus et vous n'y aurez plus accès en tant que titulaire. Elles restent consultables et vérifiables, anonymes, pour les organismes émetteurs et les autres participants. Exécution dans 72 h — annulable d'ici là, ici, avec votre clé.";

export const RECTIFY_INSTRUCTIONS =
  'Écrivez à dpo@kinshipedu.fr en décrivant la donnée inexacte et la correction souhaitée. Pour une correction d\'état civil, joignez un justificatif à votre email. Réponse sous 1 mois.';

export const DPO_INSTRUCTIONS =
  'Écrivez à dpo@kinshipedu.fr en décrivant votre demande. Selon le cas, un justificatif pourra être demandé (identité, qualité de représentant légal). Réponse sous 1 mois.';

export function normalizePik(value: string): string {
  return value.replace(/\s/g, '').replace(/[–—−]/g, '-');
}

export function isValidPik(value: string, expectedToken?: string | null): boolean {
  if (expectedToken) {
    return normalizePik(value) === normalizePik(expectedToken);
  }
  return normalizePik(value) === normalizePik(MOCK_VALID_PIK);
}

/** Format acté : « 16/07 à 14:32 » */
export function formatDroitsClock(d: Date = new Date()): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} à ${hours}:${minutes}`;
}

export function formatExecutionDate(from: Date = new Date()): { registered: string; execution: string } {
  const exec = new Date(from.getTime() + 72 * 60 * 60 * 1000);
  return { registered: formatDroitsClock(from), execution: formatDroitsClock(exec) };
}

export function formatReceiptMessage(from: Date = new Date()): string {
  const { registered, execution } = formatExecutionDate(from);
  return `✓ Demande enregistrée le ${registered} — exécution le ${execution}. Annulable d'ici là, ici, avec votre clé.`;
}
