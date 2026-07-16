import React from 'react';
import { Link } from 'react-router-dom';
import { ParcoursProofData } from '../../types/parcoursProof';
import './ParcoursProof.css';

export function getParcoursProofHref(
  token: string,
  linkTarget: 'pik' | 'public' = 'pik'
): string {
  return linkTarget === 'pik' ? `/pik/preuve/pa/${token}` : `/pa/${token}`;
}

interface ParcoursProofCardLinkProps {
  proof: ParcoursProofData;
  linkTarget?: 'pik' | 'public';
  className: string;
  children: React.ReactNode;
}

export const ParcoursProofCardLink: React.FC<ParcoursProofCardLinkProps> = ({
  proof,
  linkTarget = 'pik',
  className,
  children,
}) => (
  <Link
    to={getParcoursProofHref(proof.shareToken, linkTarget)}
    className={`pa-card-link ${className}`}
  >
    {children}
  </Link>
);

export const ParcoursProofChevron: React.FC<{ large?: boolean }> = ({ large }) => (
  <span className={`pa-chevron ${large ? 'pa-chevron-lg' : ''}`} aria-hidden="true">
    <svg width={large ? 10 : 8} height={large ? 10 : 8} viewBox="0 0 24 24" fill="none">
      <path d="M9 18l6-6-6-6" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  </span>
);
