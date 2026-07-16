import React from 'react';
import { PARCOURS_GOLD } from '../../utils/parcoursProofStyle';

interface ParcoursProofSealProps {
  hasDiploma: boolean;
  size?: number;
}

const ParcoursProofSeal: React.FC<ParcoursProofSealProps> = ({ hasDiploma, size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" style={{ flexShrink: 0 }} aria-hidden="true">
    {hasDiploma ? (
      <>
        <polygon
          points="28,2 54,15 54,41 28,54 2,41 2,15"
          fill="none"
          stroke={PARCOURS_GOLD}
          strokeWidth="3"
        />
        <polygon
          points="28,6 50,17 50,39 28,50 6,39 6,17"
          fill={PARCOURS_GOLD}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1"
        />
        <polygon
          points="28,11 45,20 45,36 28,45 11,36 11,20"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
        />
      </>
    ) : (
      <>
        <polygon
          points="28,2 54,15 54,41 28,54 2,41 2,15"
          fill="rgba(255,255,255,0.1)"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="3"
        />
        <polygon
          points="28,11 45,20 45,36 28,45 11,36 11,20"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
      </>
    )}
    <text x="28" y="33" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff">
      K
    </text>
  </svg>
);

export default ParcoursProofSeal;
