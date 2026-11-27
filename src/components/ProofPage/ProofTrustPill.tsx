import React from 'react';

/** Huit libellés exacts V1.8.7 — OF certifié = corail Patrick §10. */
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

function pillClass(label: string): string {
  if (label.includes('Organisme de formation certifié')) return 'ppg-pill ppg-pill-of';
  if (label.includes('Vérifié')) return 'ppg-pill ppg-pill-verified';
  return 'ppg-pill';
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
      <span className={pillClass(label)}>{label}</span>
    </span>
  );
};

export default ProofTrustPill;
