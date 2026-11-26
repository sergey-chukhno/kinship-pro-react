import React from 'react';

/** Un seul K sur la page (règle 1.3 ⑧). */
const ProofPageSeal: React.FC<{ ink?: string }> = ({ ink = 'var(--ppg-ink)' }) => (
  <svg className="ppg-seal" width="52" height="52" viewBox="0 0 52 52" aria-hidden>
    <polygon points="26,2 50,14 50,38 26,50 2,38 2,14" fill="var(--ppg-card)" opacity="0.95" />
    <text x="26" y="32" textAnchor="middle" fontSize="16" fontWeight="700" fill={ink}>
      K
    </text>
  </svg>
);

export default ProofPageSeal;
