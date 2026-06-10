import { BadgeProofVerifyStep } from '../types/badgeProofVerify';

/** T-VERIFY-PROTOCOL V1.0.2 — 6 étapes (KIN_PROOF_SPEC V1.2 §4) */
export const BADGE_PROOF_VERIFY_STEPS: BadgeProofVerifyStep[] = [
  {
    num: 1,
    label: 'Collecter',
    description:
      'Récupération des badges du projet avec payload_hash non NULL depuis user_badges',
  },
  {
    num: 2,
    label: 'Trier',
    description:
      'Tri canonique 4 niveaux : receiver_id → org_id → timestamp_utc → payload_hash (comparaison pure byte-par-byte)',
  },
  {
    num: 3,
    label: 'Concaténer',
    description: 'Concaténation des payload_hash séparés par U+2502 (box drawings light vertical)',
  },
  {
    num: 4,
    label: 'Hacher',
    description: 'SHA-256 de la concaténation encodée UTF-8 · algorithme sha256-v1',
  },
  {
    num: 5,
    label: 'Comparer',
    description: 'Résultat comparé à projects.attestation_hash stocké en base',
  },
  {
    num: 6,
    label: 'Conclure',
    description: 'Identiques → preuve authentique · Différents → anomalie détectée',
  },
];

export const VERIFY_PAGE_EYEBROW = 'Vérification de preuve';
export const VERIFY_PAGE_TITLE = 'Authentifier une preuve badge';
export const VERIFY_PAGE_SUBTITLE =
  'Saisissez un numéro de preuve, une URL de partage ou un hash pour vérifier son authenticité.';
/** Remplacé à l’affichage par getBadgeProofVerifyDisplayPath() — conservé pour compat. */
export const VERIFY_PAGE_URL_LABEL = 'localhost:3001/verify';
export const VERIFY_INPUT_PLACEHOLDER =
  "PB·2026·FR·3K1A8M2P9X  ou  coller l'URL de partage  ou  payload_hash";

export const VERIFY_SUCCESS_TITLE = 'Preuve authentique';
export const VERIFY_ANOMALY_TITLE = 'Anomalie détectée';
export const VERIFY_NOT_FOUND_TITLE = 'Preuve introuvable';

export const VERIFY_ANOMALY_SUBTITLE =
  'Anomalie détectée — contacter Kinship pour obtenir de l’aide.';
export const VERIFY_NOT_FOUND_SUBTITLE =
  'Aucune preuve ne correspond à cette référence. Vérifiez le numéro, l’URL ou le hash.';
