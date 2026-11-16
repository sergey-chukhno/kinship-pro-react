import React, { useMemo, useState } from 'react';
import type { ProjectStep } from '../../api/ProjectSteps';
import {
  projectStepDateParts,
  projectStepTypeLabel,
  sortProjectStepsByDate,
} from '../../utils/projectStepLabels';
import './ProjectSteps.css';

export interface ProjectStepsCardProps {
  steps: ProjectStep[];
  /** creation = expand in place; overview = link opens Étapes tab; full = all rows */
  mode: 'creation' | 'overview' | 'full';
  canEdit?: boolean;
  onAdd?: () => void;
  onEdit?: (step: ProjectStep) => void;
  /** overview only — open Étapes tab */
  onSeeAll?: () => void;
}

const HELP = 'Ateliers, séances, sorties. Une compétence s’atteste pendant une étape.';

const ProjectStepsCard: React.FC<ProjectStepsCardProps> = ({
  steps,
  mode,
  canEdit = true,
  onAdd,
  onEdit,
  onSeeAll,
}) => {
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(() => sortProjectStepsByDate(steps), [steps]);
  const n = sorted.length;

  const visible = useMemo(() => {
    if (mode === 'full') return sorted;
    if (mode === 'creation') {
      if (expanded || n <= 3) return sorted;
      return sorted.slice(0, 3);
    }
    // overview — three next (already sorted ascending = upcoming-first for past+future mix)
    return sorted.slice(0, 3);
  }, [mode, sorted, expanded, n]);

  const showSeeMoreCreation = mode === 'creation' && n > 3 && !expanded;
  const showSeeAllOverview = mode === 'overview' && n > 3;

  return (
    <div className="ps-steps-card">
      <div className="ps-steps-card-h">
        <span className="ps-steps-card-t">Étapes ({n})</span>
        {canEdit && onAdd && (
          <button type="button" className="ps-steps-add" onClick={onAdd}>
            + Ajouter une étape
          </button>
        )}
      </div>
      <div className="ps-steps-card-s">{HELP}</div>

      {visible.map((step) => {
        const { month, day } = projectStepDateParts(step.date);
        return (
          <div key={step.id} className="ps-steps-row">
            <div className="ps-steps-d">
              {month}
              <b>{day}</b>
            </div>
            <span className="ps-steps-ty">{projectStepTypeLabel(step.event_type)}</span>
            <span className="ps-steps-ti">{step.title}</span>
            {step.location ? <span className="ps-steps-pl">{step.location}</span> : null}
            {canEdit && onEdit ? (
              <button
                type="button"
                className="ps-steps-ed"
                aria-label={`Modifier ${step.title}`}
                onClick={() => onEdit(step)}
              >
                ✎
              </button>
            ) : null}
          </div>
        );
      })}

      {showSeeMoreCreation && (
        <button type="button" className="ps-steps-more" onClick={() => setExpanded(true)}>
          Voir les {n} étapes →
        </button>
      )}
      {showSeeAllOverview && onSeeAll && (
        <button type="button" className="ps-steps-more" onClick={onSeeAll}>
          Voir les {n} étapes →
        </button>
      )}
    </div>
  );
};

export default ProjectStepsCard;
