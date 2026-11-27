import React from 'react';

/**
 * Sceau hexagonal — K en tracé SVG (pas une lettre tapée).
 * Un seul K sur la page (règle 1.3 ⑧).
 */
const K_PATH =
  'M28 22h14v24.5L62 22h16L54.5 52 80 82H63.5L42 56.5V82H28V22z';

const ProofPageSeal: React.FC<{ variant?: 'hero' | 'band' }> = ({ variant = 'hero' }) => {
  const size = variant === 'hero' ? 104 : 22;
  const fill = variant === 'hero' ? 'var(--ppg-hero-on)' : 'var(--ppg-ink)';
  return (
    <svg
      className={variant === 'hero' ? 'ppg-seal' : 'ppg-band-k'}
      width={size}
      height={size}
      viewBox="0 0 104 104"
      aria-hidden
    >
      {variant === 'hero' ? (
        <polygon points="52,4 100,28 100,76 52,100 4,76 4,28" fill="var(--ppg-seal-plate)" />
      ) : (
        <rect width="104" height="104" rx="28" fill="var(--ppg-card)" />
      )}
      <path d={K_PATH} fill={fill} />
    </svg>
  );
};

export default ProofPageSeal;
