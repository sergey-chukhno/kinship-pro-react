import React from 'react';
import { LearningOutcome } from '../../data/mockFormations';
import {
  formatWorkloadHours,
  frameworkLabel,
  languageDisplay,
} from '../../data/euMcCatalog';
import './EuMcGoldSummary.css';

const PARTICIPATION_LABEL: Record<string, string> = {
  presentiel: 'Présentiel',
  distanciel: 'Distanciel',
  hybride: 'Hybride',
};

export interface EuMcGoldSummaryProps {
  outcomes: LearningOutcome[];
  participationMode?: string;
  workloadHours?: string | number | null;
  workloadEcts?: string | number | null;
  eqfLevel?: number | null;
  eqfFramework?: string | null;
  assessmentType?: string | null;
  teachingLanguages?: string[];
}

const Gold: React.FC<{ label: string; children: React.ReactNode; empty?: boolean }> = ({
  label,
  children,
  empty,
}) => (
  <div className="eug-block">
    <div className="eug-label">
      {label} <span className="eug-tag">cadre européen</span>
    </div>
    <div className={empty ? 'eug-empty' : 'eug-value'}>{children}</div>
  </div>
);

const EuMcGoldSummary: React.FC<EuMcGoldSummaryProps> = ({
  outcomes,
  participationMode,
  workloadHours,
  workloadEcts,
  eqfLevel,
  eqfFramework,
  assessmentType,
  teachingLanguages = [],
}) => {
  const hours = formatWorkloadHours(workloadHours);
  const ects = workloadEcts != null && workloadEcts !== '' ? String(Number(workloadEcts) || workloadEcts) : '';

  return (
    <div className="eug">
      <Gold label="Acquis d’apprentissage" empty={outcomes.length === 0}>
        {outcomes.length === 0 ? (
          '—'
        ) : (
          <ul className="eug-outcomes">
            {outcomes.map((outcome) => (
              <li key={outcome.id} className={outcome.kind === 'series' ? 'series' : undefined}>
                {outcome.text}
              </li>
            ))}
          </ul>
        )}
      </Gold>
      <Gold label="Mode de participation" empty={!participationMode}>
        {participationMode ? PARTICIPATION_LABEL[participationMode] || participationMode : '—'}
      </Gold>
      <div className="eug-two">
        <Gold label="Durée" empty={!hours}>
          {hours || '—'}
        </Gold>
        <Gold label="Crédits ECTS" empty={!ects}>
          {ects || '—'}
        </Gold>
      </div>
      <div className="eug-two">
        <Gold label="Niveau EQF" empty={eqfLevel == null}>
          {eqfLevel != null ? `Niveau ${eqfLevel}` : '—'}
        </Gold>
        <Gold label="Type de cadre" empty={!eqfFramework}>
          {eqfFramework ? frameworkLabel(eqfFramework) : '—'}
        </Gold>
      </div>
      <Gold label="Type d’évaluation" empty={!assessmentType}>
        {assessmentType || '—'}
      </Gold>
      <Gold label="Langue d’enseignement" empty={teachingLanguages.length === 0}>
        {teachingLanguages.length === 0 ? (
          '—'
        ) : (
          <span className="eug-langs">
            {teachingLanguages.map((code) => (
              <span key={code} className="eug-lang">
                {languageDisplay(code)}
              </span>
            ))}
          </span>
        )}
      </Gold>
    </div>
  );
};

export default EuMcGoldSummary;
