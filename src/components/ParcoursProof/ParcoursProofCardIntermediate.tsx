import React from 'react';
import { ParcoursProofData } from '../../types/parcoursProof';
import { getParcoursTrustStyle, PARCOURS_GOLD } from '../../utils/parcoursProofStyle';
import ParcoursProofSeal from './ParcoursProofSeal';
import { ParcoursProofCardLink, ParcoursProofChevron } from './ParcoursProofCardShared';
import './ParcoursProof.css';

interface ParcoursProofCardIntermediateProps {
  proof: ParcoursProofData;
  linkTarget?: 'pik' | 'public';
}

const ParcoursProofCardIntermediate: React.FC<ParcoursProofCardIntermediateProps> = ({
  proof,
  linkTarget = 'pik',
}) => {
  const trust = getParcoursTrustStyle(proof.trustLevel);
  const gold = proof.hasDiploma;

  return (
    <ParcoursProofCardLink
      proof={proof}
      linkTarget={linkTarget}
      className="pa-card-intermediate"
    >
      <div
        className="pa-inter-header"
        style={{ background: trust.color }}
      >
        <div className="pa-inter-top">
          <div>
            <div
              className="pa-inter-kname"
              style={{ color: gold ? PARCOURS_GOLD : '#fff' }}
            >
              Kinship
            </div>
            <div
              className="pa-inter-ktype"
              style={{ color: gold ? 'rgba(212,175,55,0.7)' : 'rgba(255,255,255,0.6)' }}
            >
              {gold ? 'Parcours + Diplôme' : 'Preuve Parcours'}
            </div>
          </div>
          <div
            className="pa-inter-num"
            style={{ color: gold ? PARCOURS_GOLD : 'rgba(255,255,255,0.45)' }}
          >
            {proof.proofNumber}
          </div>
        </div>

        <div className="pa-inter-sceau-row">
          <ParcoursProofSeal hasDiploma={gold} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pa-inter-titre">{proof.parcoursTitle}</div>
            <div
              className="pa-inter-sous"
              style={{ color: gold ? 'rgba(212,175,55,0.7)' : 'rgba(255,255,255,0.6)' }}
            >
              {proof.subtitle}
            </div>
          </div>
        </div>
      </div>

      {gold && proof.diploma && (
        <div className="pa-inter-dip-bar">
          Diplôme inclus —{proof.diploma.barLabel}
        </div>
      )}

      <div className="pa-inter-kpis">
        <div className="pa-inter-kpi">
          <div className="pa-inter-kpi-n" style={{ color: trust.color }}>
            {proof.kpis.projects}
          </div>
          <div className="pa-inter-kpi-l">projets</div>
        </div>
        <div className="pa-inter-kpi">
          <div className="pa-inter-kpi-n" style={{ color: trust.color }}>
            {proof.kpis.stages}
          </div>
          <div className="pa-inter-kpi-l">stages</div>
        </div>
        <div className="pa-inter-kpi">
          <div className="pa-inter-kpi-n" style={{ color: trust.color }}>
            {proof.kpis.badges}
          </div>
          <div className="pa-inter-kpi-l">badges</div>
        </div>
        <div className={`pa-inter-kpi ${proof.kpis.fourthGold ? 'pa-inter-kpi-g' : ''}`}>
          <div
            className="pa-inter-kpi-n"
            style={proof.kpis.fourthGold ? undefined : { color: trust.color }}
          >
            {proof.kpis.fourthValue}
          </div>
          <div className="pa-inter-kpi-l">{proof.kpis.fourthLabel}</div>
        </div>
      </div>

      <div className="pa-inter-footer">
        <span className="pa-inter-footer-num">{proof.proofNumber}</span>
        <ParcoursProofChevron large />
      </div>
    </ParcoursProofCardLink>
  );
};

export default ParcoursProofCardIntermediate;
