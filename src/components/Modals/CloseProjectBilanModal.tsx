import React, { useState, useMemo } from 'react';
import './Modal.css';
import type { MLDSInformationAttributes, MldsBilanPayload } from '../../api/Projects';

export type BilanFieldKey = 'hse' | 'hv' | 'credits_pedagogiques' | 'credits_fonctionnement' | 'autres_financements' | 'expected_participants';

export interface BilanFieldData {
  newValue: string;
  comment: string;
}

export interface BilanData {
  hse: BilanFieldData;
  hv: BilanFieldData;
  credits_pedagogiques: BilanFieldData;
  credits_fonctionnement: BilanFieldData;
  autres_financements: BilanFieldData;
  expected_participants: BilanFieldData;
}

interface CloseProjectBilanModalProps {
  onClose: () => void;
  onConfirm: (bilanData: BilanData) => void;
  /** Project title for display */
  projectTitle: string;
  /** MLDS data (financial + expected_participants), aligned with MLDSInformationAttributes in api/Projects.ts */
  mldsInfo?: Pick<
    MLDSInformationAttributes,
    'financial_hse' | 'financial_hv' | 'financial_transport' | 'financial_operating' | 'financial_service' | 'expected_participants'
  > | null;
  isSubmitting?: boolean;
}

const FIELD_LABELS: Record<BilanFieldKey, string> = {
  hse: 'HSE',
  hv: 'HV',
  credits_pedagogiques: 'Crédits pédagogiques',
  credits_fonctionnement: 'Crédits de fonctionnement',
  autres_financements: 'Autres financements',
  expected_participants: 'Participants attendus',
};

/** Somme des champs price des tableaux financial_* (transport, operating, service) — aligné sur api/Projects.ts */
function sumFinancialLines(lines: Array<{ price?: string }> | null | undefined): number {
  if (!Array.isArray(lines)) return 0;
  return lines.reduce((acc, line) => acc + (Number.parseFloat(String(line.price || '0')) || 0), 0);
}

/** Build API payload for POST /api/v1/projects/:id/mlds_bilan from modal form data. */
export function buildMldsBilanPayload(bilanData: BilanData): MldsBilanPayload {
  const num = (s: string) => {
    const v = Number.parseFloat(s.trim());
    return Number.isNaN(v) ? undefined : v;
  };
  const int = (s: string) => {
    const v = Number.parseInt(s.trim(), 10);
    return Number.isNaN(v) ? undefined : v;
  };
  const comment = (s: string) => (s.trim() || undefined);
  return {
    hse: num(bilanData.hse.newValue),
    hv: num(bilanData.hv.newValue),
    financial_transport: num(bilanData.credits_fonctionnement.newValue),
    financial_transport_comment: comment(bilanData.credits_fonctionnement.comment),
    financial_service: num(bilanData.credits_pedagogiques.newValue),
    financial_service_comment: comment(bilanData.credits_pedagogiques.comment),
    financial_operating: num(bilanData.autres_financements.newValue),
    financial_operating_comment: comment(bilanData.autres_financements.comment),
    expected_participants: int(bilanData.expected_participants.newValue),
    expected_participants_comment: comment(bilanData.expected_participants.comment),
  };
}

const CloseProjectBilanModal: React.FC<CloseProjectBilanModalProps> = ({
  onClose,
  onConfirm,
  projectTitle,
  mldsInfo = null,
  isSubmitting = false,
}) => {
  const previousValues = useMemo(() => {
    // Valeurs issues de MLDSInformationAttributes (api/Projects.ts)
    // Crédits pédagogiques = financial_service | Crédits de fonctionnement = financial_transport | Autres financements = financial_operating
    const hse = mldsInfo?.financial_hse != null ? Number(mldsInfo.financial_hse) : null;
    const hv = mldsInfo?.financial_hv != null ? Number(mldsInfo.financial_hv) : null;
    const creditsPedagogiques = sumFinancialLines(mldsInfo?.financial_service ?? null);
    const creditsFonctionnement = sumFinancialLines(mldsInfo?.financial_transport ?? null);
    const autresFinancements = sumFinancialLines(mldsInfo?.financial_operating ?? null);
    const expectedParticipants = mldsInfo?.expected_participants != null ? Number(mldsInfo.expected_participants) : null;

    const formatNum = (v: number) => (Number.isNaN(v) ? '—' : v.toFixed(2));
    return {
      hse: hse != null ? `${formatNum(hse)} h` : '—',
      hv: hv != null ? `${formatNum(hv)} €` : '—',
      credits_pedagogiques: creditsPedagogiques > 0 ? `${formatNum(creditsPedagogiques)} €` : '—',
      credits_fonctionnement: creditsFonctionnement > 0 ? `${formatNum(creditsFonctionnement)} €` : '—',
      autres_financements: autresFinancements > 0 ? `${formatNum(autresFinancements)} €` : '—',
      expected_participants: expectedParticipants != null ? String(expectedParticipants) : '—',
    };
  }, [mldsInfo]);

  const [form, setForm] = useState<BilanData>({
    hse: { newValue: '', comment: '' },
    hv: { newValue: '', comment: '' },
    credits_pedagogiques: { newValue: '', comment: '' },
    credits_fonctionnement: { newValue: '', comment: '' },
    autres_financements: { newValue: '', comment: '' },
    expected_participants: { newValue: '', comment: '' },
  });

  const updateField = (key: BilanFieldKey, field: 'newValue' | 'comment', value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(form);
  };

  const keys: BilanFieldKey[] = [
    'hse',
    'hv',
    'credits_pedagogiques',
    'credits_fonctionnement',
    'autres_financements',
    'expected_participants',
  ];

  return (
    <div className="modal-overlay" onClick={() => !isSubmitting && onClose()}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <div className="modal-header">
          <h3>Bilan à la clôture du projet</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Fermer"
          >
            <i className="fas fa-times" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '1rem 1.5rem' }}>
            <p style={{ color: 'var(--text-light, #6b7280)', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
              Saisissez les valeurs de bilan pour <strong>{projectTitle}</strong>. Les valeurs précédentes sont affichées à titre indicatif.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {keys.map((key) => (
                <div
                  key={key}
                  style={{
                    padding: '1rem',
                    background: 'var(--info-bg, #f8fafc)',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #e2e8f0)',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main, #111827)' }}>
                    {FIELD_LABELS[key]}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-light, #6b7280)', marginBottom: '0.5rem' }}>
                    Valeur précédente : <strong>{previousValues[key]}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Nouvelle valeur"
                      value={form[key].newValue}
                      onChange={(e) => updateField(key, 'newValue', e.target.value)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border, #e2e8f0)',
                        fontSize: '0.95rem',
                      }}
                      disabled={isSubmitting}
                    />
                    <input
                      type="text"
                      placeholder="Expliquer les écarts si nécessaire"
                      value={form[key].comment}
                      onChange={(e) => updateField(key, 'comment', e.target.value)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border, #e2e8f0)',
                        fontSize: '0.9rem',
                      }}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ minWidth: '100px' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{
                minWidth: '160px',
                backgroundColor: '#d97706',
                borderColor: '#d97706',
              }}
            >
              {isSubmitting ? 'Clôture...' : 'Valider et clôturer le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CloseProjectBilanModal;
