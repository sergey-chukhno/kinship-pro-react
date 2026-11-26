import React from 'react';

/** Huit libellés exacts V1.8.7 §1.4 ⑦ — affichage tel que servi (trust_label). */
export const TRUST_PILL_LABELS = [
  'Établissement scolaire',
  '◆ Organisme de formation certifié',
  'Établissement d’enseignement supérieur',
  '⬡ Organisme certificateur RNCP',
  '✓ Organisme certificateur — répertoire spécifique',
  '⬡ Établissement accrédité par l’État — diplômes nationaux',
  '✓ Association agréée —',
  '✓ Certifié',
  '✓ Vérifié',
] as const;

interface ProofTrustPillProps {
  label: string | null;
  countryCode?: string | null;
}

const ProofTrustPill: React.FC<ProofTrustPillProps> = ({ label, countryCode }) => {
  if (!label) return null;
  return (
    <span className="ppg-pill-row">
      {countryCode ? (
        <span className="ppg-flag" title={countryCode} aria-label={countryCode}>
          {countryCode}
        </span>
      ) : null}
      <span className="ppg-pill">{label}</span>
    </span>
  );
};

export default ProofTrustPill;
