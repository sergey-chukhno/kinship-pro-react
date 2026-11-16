import React, { useMemo, useState } from 'react';
import type { ProjectStep, ProjectStepEventType, ProjectStepPayload } from '../../api/ProjectSteps';
import {
  createProjectStep,
  deleteProjectStep,
  updateProjectStep,
} from '../../api/ProjectSteps';
import {
  PROJECT_STEP_DURATION_OPTIONS,
  PROJECT_STEP_TYPE_OPTIONS,
  defaultProjectStepType,
  projectStepDateInputValue,
  projectStepTimeInputValue,
} from '../../utils/projectStepLabels';
import { useToast } from '../../hooks/useToast';
import './ProjectSteps.css';

export interface ProjectStepFormModalProps {
  projectId: number;
  projectTitle?: string;
  projectKind?: string | null;
  step?: ProjectStep | null;
  onClose: () => void;
  onSaved: () => void;
}

function apiErrorKey(err: unknown): string {
  const e = err as { response?: { data?: { error?: string; message?: string } } };
  return e?.response?.data?.error || e?.response?.data?.message || '';
}

const ProjectStepFormModal: React.FC<ProjectStepFormModalProps> = ({
  projectId,
  projectTitle,
  projectKind,
  step,
  onClose,
  onSaved,
}) => {
  const { showSuccess, showError } = useToast();
  const isEdit = Boolean(step?.id);
  const hasProofs = (step?.proofs_count ?? 0) > 0;
  const locationLocked = Boolean(step?.location?.trim());

  const [title, setTitle] = useState(step?.title || '');
  const [eventType, setEventType] = useState<ProjectStepEventType>(
    (step?.event_type as ProjectStepEventType) || defaultProjectStepType(projectKind)
  );
  const [date, setDate] = useState(projectStepDateInputValue(step?.date));
  const [time, setTime] = useState(projectStepTimeInputValue(step?.time));
  const [duration, setDuration] = useState(
    String(step?.duration_minutes && step.duration_minutes > 0 ? step.duration_minutes : 60)
  );
  const [location, setLocation] = useState(step?.location || '');
  const [description, setDescription] = useState(step?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Patrick — confirmation Kinship (pas window.confirm navigateur). */
  const [retireConfirmOpen, setRetireConfirmOpen] = useState(false);

  const canSubmit = useMemo(() => {
    if (hasProofs && isEdit) {
      // title/date locked — still allow type/heure/durée/description/location-if-empty
      return true;
    }
    return Boolean(title.trim() && date && time);
  }, [title, date, time, hasProofs, isEdit]);

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    if (!title.trim() || !date || !time) {
      setError('Titre, date et heure sont obligatoires.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit && step) {
        // BE UpdateStep : title/date/time/description gelés dès qu'une preuve porte l'étape.
        const payload: Partial<ProjectStepPayload> = {
          event_type: eventType,
          duration_minutes: Number(duration) || undefined,
        };
        if (!hasProofs) {
          payload.title = title.trim();
          payload.date = date;
          payload.time = time;
          payload.description = description.trim() || undefined;
        }
        if (!locationLocked) {
          payload.location = location.trim() || undefined;
        }
        await updateProjectStep(step.id, payload);
        showSuccess('Étape enregistrée');
      } else {
        const payload: ProjectStepPayload = {
          title: title.trim(),
          date,
          time,
          event_type: eventType,
          duration_minutes: Number(duration) || undefined,
          location: location.trim() || undefined,
          description: description.trim() || undefined,
        };
        await createProjectStep(projectId, payload);
        showSuccess('Étape ajoutée');
      }
      onSaved();
      onClose();
    } catch (err) {
      const key = apiErrorKey(err);
      if (key === 'location_immutable') {
        setError('Le lieu ne peut plus être modifié.');
      } else if (key === 'event_has_proofs') {
        setError('Une preuve porte déjà cette étape — titre et date ne sont plus modifiables.');
      } else if (key === 'time_required' || key === 'date_required' || key === 'title_required') {
        setError('Titre, date et heure sont obligatoires.');
      } else {
        setError(key || 'Enregistrement impossible.');
      }
      showError('Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const confirmRetire = async () => {
    if (!step || hasProofs || saving) return;
    setSaving(true);
    setError(null);
    try {
      await deleteProjectStep(step.id);
      showSuccess('Étape retirée');
      setRetireConfirmOpen(false);
      onSaved();
      onClose();
    } catch (err) {
      const key = apiErrorKey(err);
      if (key === 'event_has_proofs') {
        setError('Impossible de retirer : une preuve porte déjà cette étape.');
      } else {
        setError(key || 'Retrait impossible.');
      }
      showError('Retrait impossible');
      setRetireConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="ps-step-modal-overlay"
      onClick={() => {
        if (retireConfirmOpen) return;
        onClose();
      }}
      role="presentation"
    >
      <div
        className="ps-step-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ps-step-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ps-step-modal-mt" id="ps-step-form-title">
          {isEdit ? 'Modifier l’étape' : 'Ajouter une étape'}
        </div>
        <div className="ps-step-modal-ms">
          Une étape du projet « {projectTitle || 'Projet'} ».
        </div>

        <div className="ps-step-f">
          <label>
            Titre de l’étape <span className="ob">✱</span>
          </label>
          {hasProofs ? (
            <div className="ps-step-in ro">{title}</div>
          ) : (
            <input
              className="ps-step-in"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          )}
        </div>

        <div className="ps-step-f">
          <label>Type</label>
          <div className="ps-step-chips" role="group" aria-label="Type d’étape">
            {PROJECT_STEP_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`ps-step-chip ${eventType === opt.value ? 'on' : ''}`}
                onClick={() => setEventType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ps-step-two">
          <div className="ps-step-f">
            <label>
              Date <span className="ob">✱</span>
            </label>
            {hasProofs ? (
              <div className="ps-step-in ro">{date}</div>
            ) : (
              <input
                type="date"
                className="ps-step-in"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            )}
          </div>
          <div className="ps-step-f">
            <label>
              Heure <span className="ob">✱</span>
            </label>
            {hasProofs ? (
              <div className="ps-step-in ro">{time || '—'}</div>
            ) : (
              <input
                type="time"
                className="ps-step-in"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            )}
          </div>
          <div className="ps-step-f">
            <label>Durée</label>
            <select
              className="ps-step-in"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              {PROJECT_STEP_DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ps-step-f">
          <label>Lieu</label>
          {locationLocked ? (
            <div className="ps-step-in ro">{location}</div>
          ) : (
            <input
              className="ps-step-in"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex. : Salle 2, maison de quartier"
            />
          )}
        </div>

        <div className="ps-step-f">
          <label>Description</label>
          {hasProofs ? (
            <div className="ps-step-in ta ro">{description || '—'}</div>
          ) : (
            <textarea
              className="ps-step-in ta"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ce que l’étape couvre…"
            />
          )}
        </div>

        {error && <div className="ps-step-err">{error}</div>}

        <div className="ps-step-mf">
          {isEdit && !hasProofs && (
            <button
              type="button"
              className="ps-step-retirer"
              onClick={() => setRetireConfirmOpen(true)}
              disabled={saving}
            >
              Retirer l’étape
            </button>
          )}
          <button type="button" className="ps-step-btn neutre" onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button
            type="button"
            className="ps-step-btn ambre"
            onClick={() => void handleSubmit()}
            disabled={saving || !canSubmit}
          >
            {isEdit ? 'Enregistrer' : 'Ajouter l’étape'}
          </button>
        </div>
      </div>

      {retireConfirmOpen && (
        <div
          className="ps-step-confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ps-step-retire-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ps-step-confirm">
            <div className="ps-step-confirm-title" id="ps-step-retire-title">
              Retirer l’étape ?
            </div>
            <p className="ps-step-confirm-body">
              « {title.trim() || step?.title || 'Cette étape'} » sera retirée du projet.
            </p>
            <div className="ps-step-confirm-actions">
              <button
                type="button"
                className="ps-step-btn neutre"
                onClick={() => setRetireConfirmOpen(false)}
                disabled={saving}
              >
                Garder l’étape
              </button>
              <button
                type="button"
                className="ps-step-btn danger"
                onClick={() => void confirmRetire()}
                disabled={saving}
              >
                Retirer l’étape
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectStepFormModal;
