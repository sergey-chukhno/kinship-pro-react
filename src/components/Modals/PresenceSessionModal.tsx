import React, { useState } from 'react';
import './Modal.css';
import './PresenceSessionModal.css';

export interface PresenceSessionFormData {
  label: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;
  openNow: boolean;
}

interface PresenceSessionModalProps {
  onClose: () => void;
  onSave: (data: PresenceSessionFormData) => void;
  formationTitle?: string;
}

const SLOT_PRESETS = ['Matinée', 'Après-midi', 'Soirée', 'Journée'] as const;

function formatTimeRange(start: string, end: string): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(':');
    if (!h) return t;
    return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatSessionDateLabel(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    const [y, m, day] = iso.split('-');
    return `${day}/${m}/${y}`;
  }
}

export { formatTimeRange };

const PresenceSessionModal: React.FC<PresenceSessionModalProps> = ({
  onClose,
  onSave,
  formationTitle,
}) => {
  const [preset, setPreset] = useState<string>('Matinée');
  const [customLabel, setCustomLabel] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:30');
  const [openNow, setOpenNow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePresetChange = (value: string) => {
    setPreset(value);
    if (value === 'Matinée') {
      setStartTime('09:00');
      setEndTime('12:30');
    } else if (value === 'Après-midi') {
      setStartTime('14:00');
      setEndTime('17:00');
    } else if (value === 'Soirée') {
      setStartTime('18:00');
      setEndTime('21:00');
    } else if (value === 'Journée') {
      setStartTime('09:00');
      setEndTime('17:00');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const label =
      preset === 'Autre' ? customLabel.trim() : preset;
    if (!label) {
      setError('Le libellé de la session est obligatoire.');
      return;
    }
    if (!date) {
      setError('La date est obligatoire.');
      return;
    }
    if (!startTime || !endTime) {
      setError('Les horaires sont obligatoires.');
      return;
    }
    if (endTime <= startTime) {
      setError('L’heure de fin doit être après l’heure de début.');
      return;
    }
    setError(null);
    onSave({ label, date, startTime, endTime, openNow });
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content presence-session-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="presence-session-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="presence-session-modal-title">Créer une session de présence</h2>
            <p className="modal-subtitle">
              {formationTitle
                ? `Créneau pour « ${formationTitle} » — le code sera projetable à l’ouverture.`
                : 'Définissez le créneau. La session s’ouvre manuellement (jamais automatiquement).'}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="form-group">
              <label htmlFor="ps-preset" className="required">
                Créneau
              </label>
              <select
                id="ps-preset"
                className="form-select"
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                {SLOT_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value="Autre">Autre…</option>
              </select>
            </div>

            {preset === 'Autre' && (
              <div className="form-group">
                <label htmlFor="ps-label" className="required">
                  Libellé
                </label>
                <input
                  id="ps-label"
                  type="text"
                  className="form-input"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Ex. Atelier pratique"
                  autoFocus
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="ps-date" className="required">
                Date
              </label>
              <input
                id="ps-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="ps-start" className="required">
                  Début
                </label>
                <input
                  id="ps-start"
                  type="time"
                  className="form-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="ps-end" className="required">
                  Fin
                </label>
                <input
                  id="ps-end"
                  type="time"
                  className="form-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={openNow}
                onChange={(e) => setOpenNow(e.target.checked)}
              />
              <span>Ouvrir la session de présence immédiatement après création</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Créer la session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PresenceSessionModal;
