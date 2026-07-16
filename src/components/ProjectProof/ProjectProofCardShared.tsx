import React from 'react';
import { Link } from 'react-router-dom';
import { ProjectProofData } from '../../types/projectProof';
import { getProjectProofLevelStyle } from '../../utils/projectProofLevel';
import './ProjectProof.css';

export function getProjectProofHref(
  token: string,
  linkTarget: 'pik' | 'public' = 'pik'
): string {
  return linkTarget === 'pik' ? `/pik/preuve/pp/${token}` : `/pp/${token}`;
}

interface ProjectProofCardLinkProps {
  proof: ProjectProofData;
  linkTarget?: 'pik' | 'public';
  className: string;
  children: React.ReactNode;
}

export const ProjectProofCardLink: React.FC<ProjectProofCardLinkProps> = ({
  proof,
  linkTarget = 'pik',
  className,
  children,
}) => {
  const levelStyle = getProjectProofLevelStyle(proof.level);

  return (
    <Link
      to={getProjectProofHref(proof.shareToken, linkTarget)}
      className={`pp-card-link ${className}`}
      style={levelStyle.cardBorder ? { border: levelStyle.cardBorder } : undefined}
    >
      {children}
    </Link>
  );
};

export const ProjectProofChevron: React.FC<{ large?: boolean }> = ({ large }) => (
  <span className={`pp-chevron ${large ? 'pp-chevron-lg' : ''}`} aria-hidden="true">
    <svg width={large ? 10 : 8} height={large ? 10 : 8} viewBox="0 0 24 24" fill="none">
      <path d="M9 18l6-6-6-6" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  </span>
);

export function truncatePpNumber(num: string, short = false): string {
  if (!short) return num;
  const parts = num.split('·');
  if (parts.length >= 4) return `${parts[0]}·${parts[1]}·…·${parts[parts.length - 1].slice(-4)}`;
  return num.length > 18 ? `${num.slice(0, 14)}…` : num;
}
