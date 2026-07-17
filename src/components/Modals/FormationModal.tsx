import React, { useState } from 'react';
import { FinancementType, FormationStatus } from '../../data/mockFormations';
import './Modal.css';
import './FormationModal.css';

export interface FormationFormData {
  title: string;
  description: string;
  projectKind: 'formation';
  financement: FinancementType | '';
  isEuMcDeclared: boolean;
  startDate: string;
  endDate: string;
  attendanceSurveyOptIn: boolean;
}

interface FormationModalProps {
  onClose: () => void;
  onSave: (data: FormationFormData) => void;
  /** Prefill for edit / duplication */
  initialData?: Partial<FormationFormData> | null;
  /** Mode édition (Brouillons / À venir) */
  isEdit?: boolean;
  /** Statut courant — adapte le sous-titre et le CTA */
  status?: FormationStatus;
}

const FINANCEMENT_OPTIONS: FinancementType[] = [
  'CPF',
  'OPCO',
  'Entreprise',
  'Associative',
  'Autre',
];

const FormationModal: React.FC<FormationModalProps> = ({
  onClose,
  onSave,
  initialData,
  isEdit = false,
  status,
}) => {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [financement, setFinancement] = useState<FinancementType | ''>(
    initialData?.financement ?? ''
  );
  const [isEuMcDeclared, setIsEuMcDeclared] = useState(
    initialData?.isEuMcDeclared ?? false
  );
  const [startDate, setStartDate] = useState(initialData?.startDate ?? '');
  const [endDate, setEndDate] = useState(initialData?.endDate ?? '');
  const [attendanceSurveyOptIn, setAttendanceSurveyOptIn] = useState(
    initialData?.attendanceSurveyOptIn ?? false
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Le titre de la formation est obligatoire.');
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setError('La date de fin doit être postérieure à la date de début.');
      return;
    }
    setError(null);
    onSave({
      title: trimmed,
      description: description.trim(),
      projectKind: 'formation',
      financement,
      isEuMcDeclared,
      startDate,
      endDate,
      attendanceSurveyOptIn,
    });
  };

  const titleText = isEdit ? 'Modifier la formation' : 'Créer une formation';
  const subtitle = isEdit
    ? status === 'coming'
      ? 'Formation programmée — les modifications sont enregistrées immédiatement.'
      : 'Brouillon — visible par vous seul jusqu’à activation.'
    : 'La formation naît en brouillon — visible par vous seul jusqu’à activation.';
  const submitLabel = isEdit
    ? 'Enregistrer les modifications'
    : 'Enregistrer en brouillon';

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content formation-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="formation-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="formation-modal-title">{titleText}</h2>
            <p className="modal-subtitle">{subtitle}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        <form id="formationForm" onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="form-group">
              <label htmlFor="formation-title" className="required">
                Titre
              </label>
              <input
                id="formation-title"
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Titre professionnel ECM — session 3"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="formation-description">Description</label>
              <textarea
                id="formation-description"
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Objectifs, public, modalités…"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="formation-kind">Type de projet</label>
              <select
                id="formation-kind"
                className="form-select"
                value="formation"
                disabled
                aria-readonly="true"
              >
                <option value="formation">Formation</option>
              </select>
              <p className="form-hint">
                Type présélectionné — une formation = un projet (project_kind = formation).
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="formation-financement">Financement</label>
              <select
                id="formation-financement"
                className="form-select"
                value={financement}
                onChange={(e) =>
                  setFinancement(e.target.value as FinancementType | '')
                }
              >
                <option value="">Non déclaré</option>
                {FINANCEMENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="form-hint">
                CPF · OPCO · Entreprise · Associative · Autre — aucun badge si non déclaré.
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="formation-start">Date de début</label>
                <input
                  id="formation-start"
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="formation-end">Date de fin</label>
                <input
                  id="formation-end"
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="formation-modal-checks">
              <label className="formation-modal-check">
                <input
                  type="checkbox"
                  checked={isEuMcDeclared}
                  onChange={(e) => setIsEuMcDeclared(e.target.checked)}
                />
                <span>
                  <strong>MC UE déclarée</strong>
                  <span className="form-hint">
                    Déclare le niveau Microcertificat UE — à la clôture, le numéro pourra être MC·UE·
                    plutôt que PF·.
                  </span>
                </span>
              </label>

              <label className="formation-modal-check">
                <input
                  type="checkbox"
                  checked={attendanceSurveyOptIn}
                  onChange={(e) => setAttendanceSurveyOptIn(e.target.checked)}
                />
                <span>
                  <strong>Vérification d&apos;assiduité Kinship</strong>
                  <span className="form-hint">
                    Opt-in commercial (sondage indépendant) — jamais « surveillance ». Statut repris
                    au rapport PF.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormationModal;
