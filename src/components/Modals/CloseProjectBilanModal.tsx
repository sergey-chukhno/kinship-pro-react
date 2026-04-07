import React, { useEffect, useMemo, useState } from 'react';
import './Modal.css';
import { getMldsServiceLinesFromMldsInfo, type MLDSInformationAttributes, type MldsBilanPayload } from '../../api/Projects';
import { hvLineHours } from '../../utils/mldsHvLines';

export interface BilanData {
  hse: string;
  hse_comment: string;
  financial_rate: string;
  financial_rate_comment: string;
  expected_participants: string;
  expected_participants_comment: string;
  financial_transport_comment: string;
  financial_operating_comment: string;
  financial_service_comment: string;
  financial_transport: Array<{ transport_name: string; price: string; comment: string }>;
  financial_operating: Array<{ operating_name: string; price: string; comment: string }>;
  financial_service: Array<{ service_name: string; price: string; hours: string; comment: string }>;
  financial_hv_lines: Array<{ teacher_name: string; hour: string; comment: string }>;
  financial_autres_financements: Array<{ autres_name: string; price: string; comment: string }>;
}

interface CloseProjectBilanModalProps {
  onClose: () => void;
  onConfirm: (bilanData: BilanData) => void;
  projectTitle: string;
  mldsInfo?: Pick<
    MLDSInformationAttributes,
    | 'financial_hse'
    | 'financial_rate'
    | 'financial_hv'
    | 'financial_transport'
    | 'financial_operating'
    | 'financial_service'
    | 'financial_hv_lines'
    | 'financial_autres_financements'
    | 'expected_participants'
  > | null;
  isSubmitting?: boolean;
}

const lineTransport = (): BilanData['financial_transport'][number] => ({
  transport_name: '',
  price: '',
  comment: ''
});
const lineOperating = (): BilanData['financial_operating'][number] => ({
  operating_name: '',
  price: '',
  comment: ''
});
const lineService = (): BilanData['financial_service'][number] => ({
  service_name: '',
  price: '',
  hours: '',
  comment: ''
});
const lineHv = (): BilanData['financial_hv_lines'][number] => ({
  teacher_name: '',
  hour: '',
  comment: ''
});
const lineAutres = (): BilanData['financial_autres_financements'][number] => ({
  autres_name: '',
  price: '',
  comment: ''
});

function readLineComment(raw: unknown): string {
  if (raw == null) return '';
  return String(raw);
}

function bilanDataFromMlds(mlds: CloseProjectBilanModalProps['mldsInfo']): BilanData {
  const empty: BilanData = {
    hse: '',
    hse_comment: '',
    financial_rate: '',
    financial_rate_comment: '',
    expected_participants: '',
    expected_participants_comment: '',
    financial_transport_comment: '',
    financial_operating_comment: '',
    financial_service_comment: '',
    financial_transport: [lineTransport()],
    financial_operating: [lineOperating()],
    financial_service: [lineService()],
    financial_hv_lines: [lineHv()],
    financial_autres_financements: [lineAutres()]
  };

  if (!mlds) return empty;

  const transport =
    Array.isArray(mlds.financial_transport) && mlds.financial_transport.length > 0
      ? mlds.financial_transport.map(l => ({
          transport_name: String(l.transport_name ?? ''),
          price: l.price != null ? String(l.price) : '',
          comment: readLineComment((l as { comment?: unknown }).comment)
        }))
      : [lineTransport()];

  const operating =
    Array.isArray(mlds.financial_operating) && mlds.financial_operating.length > 0
      ? mlds.financial_operating.map(l => ({
          operating_name: String(l.operating_name ?? ''),
          price: l.price != null ? String(l.price) : '',
          comment: readLineComment((l as { comment?: unknown }).comment)
        }))
      : [lineOperating()];

  const serviceRows = getMldsServiceLinesFromMldsInfo(mlds);
  const service =
    serviceRows.length > 0
      ? serviceRows.map(l => ({
          service_name: String(l.service_name ?? ''),
          price: l.price != null ? String(l.price) : '',
          hours: l.hours != null && l.hours !== '' ? String(l.hours) : '',
          comment: readLineComment(l.comment)
        }))
      : [lineService()];

  const autres =
    Array.isArray(mlds.financial_autres_financements) && mlds.financial_autres_financements.length > 0
      ? mlds.financial_autres_financements.map(l => ({
          autres_name: String(l.autres_name ?? ''),
          price: l.price != null ? String(l.price) : '',
          comment: readLineComment((l as { comment?: unknown }).comment)
        }))
      : [lineAutres()];

  let hvLines: BilanData['financial_hv_lines'];
  if (Array.isArray(mlds.financial_hv_lines) && mlds.financial_hv_lines.length > 0) {
    hvLines = mlds.financial_hv_lines.map(l => ({
      teacher_name: String(l.teacher_name ?? ''),
      hour:
        l.hour != null && String(l.hour) !== ''
          ? String(l.hour)
          : (l as { price?: string }).price != null
            ? String((l as { price?: string }).price)
            : '',
      comment: readLineComment((l as { comment?: unknown }).comment)
    }));
  } else if (mlds.financial_hv != null && Number(mlds.financial_hv) > 0) {
    hvLines = [{ teacher_name: '', hour: String(mlds.financial_hv), comment: '' }];
  } else {
    hvLines = [lineHv()];
  }

  return {
    hse: mlds.financial_hse != null ? String(mlds.financial_hse) : '',
    hse_comment: '',
    financial_rate: mlds.financial_rate != null ? String(mlds.financial_rate) : '',
    financial_rate_comment: '',
    expected_participants:
      mlds.expected_participants != null && mlds.expected_participants !== undefined
        ? String(mlds.expected_participants)
        : '',
    expected_participants_comment: '',
    financial_transport_comment: '',
    financial_operating_comment: '',
    financial_service_comment: '',
    financial_transport: transport,
    financial_operating: operating,
    financial_service: service,
    financial_hv_lines: hvLines,
    financial_autres_financements: autres
  };
}

/** Commentaire ligne : chaîne vide → `null` dans le JSON (comme l’API). */
function payloadLineComment(s: string): string | null {
  const t = s != null ? String(s).trim() : '';
  return t === '' ? null : t;
}

/** Données demande initiale : utilisées si le formulaire est vide ou ligne « commentaire seul ». */
export type MldsBilanBaseInfo = Pick<
  MLDSInformationAttributes,
  | 'financial_hse'
  | 'financial_rate'
  | 'financial_hv'
  | 'financial_transport'
  | 'financial_operating'
  | 'financial_service'
  | 'financial_hv_lines'
  | 'financial_autres_financements'
  | 'expected_participants'
> | null;

/** POST /api/v1/projects/:id/mlds_bilan */
export function buildMldsBilanPayload(bilanData: BilanData, baseMlds?: MldsBilanBaseInfo): MldsBilanPayload {
  const num = (s: string): number | null => {
    if (s == null || String(s).trim() === '') return null;
    const v = Number.parseFloat(String(s).trim());
    return Number.isNaN(v) ? null : v;
  };
  const int = (s: string): number | null => {
    if (s == null || String(s).trim() === '') return null;
    const v = Number.parseInt(String(s).trim(), 10);
    return Number.isNaN(v) ? null : v;
  };
  const numFromBase = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    const n = Number.parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  };
  const intFromBase = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    const n = typeof v === 'number' ? Math.trunc(v) : Number.parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : null;
  };
  const globalComment = (s: string): string | null | undefined => {
    const t = s != null ? String(s).trim() : '';
    if (t === '') return undefined;
    return t;
  };

  const transport = bilanData.financial_transport
    .map((r, i) => {
      const b = baseMlds?.financial_transport?.[i];
      const transport_name = r.transport_name.trim() || (b?.transport_name != null ? String(b.transport_name) : '');
      const price = r.price.trim() || (b?.price != null ? String(b.price) : '');
      return { transport_name, price, comment: r.comment };
    })
    .filter(r => r.transport_name !== '' || r.price !== '' || r.comment.trim() !== '')
    .map(r => ({
      transport_name: r.transport_name.trim(),
      price: r.price.trim() || '0',
      comment: payloadLineComment(r.comment) as string | null
    }));

  const operating = bilanData.financial_operating
    .map((r, i) => {
      const b = baseMlds?.financial_operating?.[i];
      const operating_name = r.operating_name.trim() || (b?.operating_name != null ? String(b.operating_name) : '');
      const price = r.price.trim() || (b?.price != null ? String(b.price) : '');
      return { operating_name, price, comment: r.comment };
    })
    .filter(r => r.operating_name !== '' || r.price !== '' || r.comment.trim() !== '')
    .map(r => ({
      operating_name: r.operating_name.trim(),
      price: r.price.trim() || '0',
      comment: payloadLineComment(r.comment) as string | null
    }));

  const baseServiceLines = baseMlds ? getMldsServiceLinesFromMldsInfo(baseMlds) : [];

  const service = bilanData.financial_service
    .map((r, i) => {
      const b = baseServiceLines[i];
      const service_name = r.service_name.trim() || (b?.service_name != null ? String(b.service_name) : '');
      const price = r.price.trim() || (b?.price != null ? String(b.price) : '');
      const hours =
        r.hours.trim() ||
        (b?.hours != null && String(b.hours) !== '' ? String(b.hours) : '');
      return { service_name, price, hours, comment: r.comment };
    })
    .filter(r => r.service_name !== '' || r.price !== '' || r.hours !== '' || r.comment.trim() !== '')
    .map(r => ({
      service_name: r.service_name.trim(),
      price: r.price.trim() || '0',
      ...(r.hours.trim() ? { hours: r.hours.trim() } : {}),
      comment: payloadLineComment(r.comment) as string | null
    }));

  const hvLines = bilanData.financial_hv_lines
    .map((r, i) => {
      const b = baseMlds?.financial_hv_lines?.[i];
      let teacher_name = r.teacher_name.trim();
      if (!teacher_name && b?.teacher_name != null) teacher_name = String(b.teacher_name);
      let hour = r.hour.trim();
      if (!hour && b) {
        const bl = b as { hour?: string; price?: string };
        hour =
          bl.hour != null && String(bl.hour) !== ''
            ? String(bl.hour)
            : bl.price != null
              ? String(bl.price)
              : '';
      }
      if (!hour && baseMlds?.financial_hv != null && bilanData.financial_hv_lines.length === 1 && i === 0) {
        hour = String(baseMlds.financial_hv);
      }
      return { teacher_name, hour, comment: r.comment };
    })
    .filter(r => r.teacher_name !== '' || r.hour !== '' || r.comment.trim() !== '')
    .map(r => ({
      teacher_name: r.teacher_name.trim(),
      hour: r.hour.trim() || '0',
      comment: payloadLineComment(r.comment) as string | null
    }));

  const autres = bilanData.financial_autres_financements
    .map((r, i) => {
      const b = baseMlds?.financial_autres_financements?.[i];
      const autres_name = r.autres_name.trim() || (b?.autres_name != null ? String(b.autres_name) : '');
      const price = r.price.trim() || (b?.price != null ? String(b.price) : '');
      return { autres_name, price, comment: r.comment };
    })
    .filter(r => r.autres_name !== '' || r.price !== '' || r.comment.trim() !== '')
    .map(r => ({
      autres_name: r.autres_name.trim(),
      price: r.price.trim() || '0',
      comment: payloadLineComment(r.comment) as string | null
    }));

  const payload: MldsBilanPayload = {};
  const hse = num(bilanData.hse) ?? numFromBase(baseMlds?.financial_hse);
  const rate = num(bilanData.financial_rate) ?? numFromBase(baseMlds?.financial_rate);
  const exp = int(bilanData.expected_participants) ?? intFromBase(baseMlds?.expected_participants);

  if (hse != null) payload.hse = hse;
  const hc = globalComment(bilanData.hse_comment);
  if (hc !== undefined) payload.hse_comment = hc;

  if (rate != null) payload.financial_rate = rate;
  const frc = globalComment(bilanData.financial_rate_comment);
  if (frc !== undefined) payload.financial_rate_comment = frc;

  if (exp != null) payload.expected_participants = exp;
  const epc = globalComment(bilanData.expected_participants_comment);
  if (epc !== undefined) payload.expected_participants_comment = epc;

  const ftc = globalComment(bilanData.financial_transport_comment);
  if (ftc !== undefined) payload.financial_transport_comment = ftc;
  const foc = globalComment(bilanData.financial_operating_comment);
  if (foc !== undefined) payload.financial_operating_comment = foc;
  const fsc = globalComment(bilanData.financial_service_comment);
  if (fsc !== undefined) payload.financial_service_comment = fsc;

  if (transport.length > 0) payload.financial_transport = transport;
  if (operating.length > 0) payload.financial_operating = operating;
  if (service.length > 0) payload.financial_service = service;
  if (hvLines.length > 0) payload.financial_hv_lines = hvLines;
  if (autres.length > 0) payload.financial_autres_financements = autres;

  return payload;
}

const inputStyle: React.CSSProperties = {
  padding: '0.45rem 0.6rem',
  borderRadius: '6px',
  border: '1px solid var(--border, #e2e8f0)',
  fontSize: '0.9rem',
  width: '100%',
  boxSizing: 'border-box'
};

const commentInputStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: '2.5rem',
  resize: 'vertical' as const
};

const CloseProjectBilanModal: React.FC<CloseProjectBilanModalProps> = ({
  onClose,
  onConfirm,
  projectTitle,
  mldsInfo = null,
  isSubmitting = false
}) => {
  const initial = useMemo(() => bilanDataFromMlds(mldsInfo), [mldsInfo]);
  const [form, setForm] = useState<BilanData>(initial);

  useEffect(() => {
    setForm(bilanDataFromMlds(mldsInfo));
  }, [mldsInfo]);

  const previousValues = useMemo(() => {
    const m = mldsInfo;
    const formatNum = (v: number) => (Number.isNaN(v) ? '—' : v.toFixed(2));
    const sumPrices = (lines: Array<{ price?: string | number }> | null | undefined) =>
      Array.isArray(lines) ? lines.reduce((acc, l) => acc + (Number.parseFloat(String(l.price || '0')) || 0), 0) : 0;

    const serviceLinesForSum = getMldsServiceLinesFromMldsInfo(m);

    const hse = m?.financial_hse != null ? Number(m.financial_hse) : null;
    const hvScalar = m?.financial_hv != null ? Number(m.financial_hv) : null;
    const rate = m?.financial_rate != null ? Number(m.financial_rate) : null;
    const hvLines = Array.isArray(m?.financial_hv_lines) ? m!.financial_hv_lines! : [];
    const hvHoursFromLines = hvLines.length > 0 ? hvLines.reduce((s, l) => s + hvLineHours(l), 0) : null;
    const exp =
      m?.expected_participants != null && m.expected_participants !== undefined
        ? String(m.expected_participants)
        : '—';

    return {
      hse: hse != null ? `${formatNum(hse)} h` : '—',
      hv:
        hvHoursFromLines != null && hvHoursFromLines > 0
          ? `${formatNum(hvHoursFromLines)} h (détail)`
          : hvScalar != null
            ? `${formatNum(hvScalar)} h`
            : '—',
      financial_rate: rate != null ? `${formatNum(rate)} €/h` : '—',
      expected_participants: exp,
      transport: sumPrices(m?.financial_transport ?? null) > 0 ? `${formatNum(sumPrices(m?.financial_transport ?? null))} €` : '—',
      operating: sumPrices(m?.financial_operating ?? null) > 0 ? `${formatNum(sumPrices(m?.financial_operating ?? null))} €` : '—',
      service: sumPrices(serviceLinesForSum) > 0 ? `${formatNum(sumPrices(serviceLinesForSum))} €` : '—',
      autres:
        sumPrices((m as { financial_autres_financements?: Array<{ price?: string }> })?.financial_autres_financements ?? null) > 0
          ? `${formatNum(sumPrices((m as { financial_autres_financements?: Array<{ price?: string }> })?.financial_autres_financements ?? null))} €`
          : '—'
    };
  }, [mldsInfo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(form);
  };

  const setRow = <K extends keyof BilanData>(key: K, value: BilanData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="modal-overlay" onClick={() => !isSubmitting && onClose()}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '760px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <h3>Bilan à la clôture du projet</h3>
          <button type="button" className="modal-close" onClick={onClose} disabled={isSubmitting} aria-label="Fermer">
            <i className="fas fa-times" />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <div className="modal-body" style={{ padding: '1rem 1.5rem', overflowY: 'auto' }}>
            <p style={{ color: 'var(--text-light, #6b7280)', marginBottom: '1rem', fontSize: '0.95rem' }}>
              Saisissez les montants, commentaires globaux et commentaires par ligne pour <strong>{projectTitle}</strong>. Les valeurs de la
              demande initiale sont rappelées à titre indicatif.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <section style={sectionStyle}>
                <h4 style={h4Style}>HSE et taux</h4>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Demande initiale — HSE : <strong>{previousValues.hse}</strong> · HV : <strong>{previousValues.hv}</strong> · Taux :{' '}
                  <strong>{previousValues.financial_rate}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label>
                    <span style={labelStyle}>HSE (h)</span>
                    <input
                      type="text"
                      value={form.hse}
                      onChange={e => setForm(f => ({ ...f, hse: e.target.value }))}
                      style={inputStyle}
                      disabled={isSubmitting}
                      placeholder="ex. 1500.5"
                    />
                  </label>
                  <label>
                    <span style={labelStyle}>Taux horaire (€/h)</span>
                    <input
                      type="text"
                      value={form.financial_rate}
                      disabled={true}
                      className="!cursor-not-allowed !opacity-50"
                      onChange={e => setForm(f => ({ ...f, financial_rate: e.target.value }))}
                      style={inputStyle}
                      // disabled={isSubmitting}
                      placeholder="ex. 50.75"
                    />
                  </label>
                </div>
                <label style={{ display: 'block', marginTop: '0.65rem' }}>
                  <span style={labelStyle}>Commentaire global HSE</span>
                  <textarea
                    value={form.hse_comment}
                    onChange={e => setForm(f => ({ ...f, hse_comment: e.target.value }))}
                    style={commentInputStyle}
                    disabled={isSubmitting}
                    placeholder="Commentaire global HSE"
                    rows={2}
                  />
                </label>
                {/* <label style={{ display: 'block', marginTop: '0.5rem' }}>
                  <span style={labelStyle}>Commentaire sur le taux</span>
                  <textarea
                    value={form.financial_rate_comment}
                    onChange={e => setForm(f => ({ ...f, financial_rate_comment: e.target.value }))}
                    style={commentInputStyle}
                    disabled={isSubmitting}
                    placeholder="Commentaire sur le taux"
                    rows={2}
                  />
                </label> */}
              </section>

              <section style={sectionStyle}>
                <h4 style={h4Style}>Effectifs</h4>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Prévision demande initiale : <strong>{previousValues.expected_participants}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'start' }}>
                  <label>
                    <span style={labelStyle}>Participants (bilan)</span>
                    <input
                      type="text"
                      value={form.expected_participants}
                      onChange={e => setForm(f => ({ ...f, expected_participants: e.target.value }))}
                      style={inputStyle}
                      disabled={isSubmitting}
                      placeholder="ex. 120"
                    />
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    <span style={labelStyle}>Commentaire effectifs</span>
                    <textarea
                      value={form.expected_participants_comment}
                      onChange={e => setForm(f => ({ ...f, expected_participants_comment: e.target.value }))}
                      style={commentInputStyle}
                      disabled={isSubmitting}
                      placeholder="Effectif réel ou commentaire"
                      rows={2}
                    />
                  </label>
                </div>
              </section>

              <section style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ ...h4Style, margin: 0 }}>Heures par enseignant (HV)</h4>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setRow('financial_hv_lines', [...form.financial_hv_lines, lineHv()])}
                    disabled={isSubmitting}
                  >
                    + Ligne
                  </button>
                </div>
                {form.financial_hv_lines.map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: '0.75rem',
                      padding: '0.65rem',
                      background: '#fff',
                      borderRadius: '8px',
                      border: '1px solid var(--border, #e2e8f0)'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 88px 36px', gap: '0.5rem', marginBottom: '0.45rem' }}>
                      <input
                        placeholder="Nom enseignant"
                        value={row.teacher_name}
                        onChange={e => {
                          const next = [...form.financial_hv_lines];
                          next[idx] = { ...row, teacher_name: e.target.value };
                          setRow('financial_hv_lines', next);
                        }}
                        style={inputStyle}
                        disabled={isSubmitting}
                      />
                      <input
                        placeholder="h"
                        value={row.hour}
                        onChange={e => {
                          const next = [...form.financial_hv_lines];
                          next[idx] = { ...row, hour: e.target.value };
                          setRow('financial_hv_lines', next);
                        }}
                        style={inputStyle}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="hover:bg-red-400 hover:text-white"
                        style={{ 
                          padding: 0,
                          borderRadius: 10,
                          border: '1px solid red',
                          
                         }}
                        onClick={() =>
                          setRow(
                            'financial_hv_lines',
                            form.financial_hv_lines.length > 1 ? form.financial_hv_lines.filter((_, i) => i !== idx) : [lineHv()]
                          )
                        }
                        disabled={isSubmitting}
                        aria-label="Retirer la ligne"
                      >
                        ×
                      </button>
                    </div>
                    <label style={{ display: 'block' }}>
                      <span style={{ ...labelStyle, fontSize: '0.7rem' }}>Commentaire ligne</span>
                      <textarea
                        value={row.comment}
                        onChange={e => {
                          const next = [...form.financial_hv_lines];
                          next[idx] = { ...row, comment: e.target.value };
                          setRow('financial_hv_lines', next);
                        }}
                        style={{ ...commentInputStyle, minHeight: '2rem' }}
                        disabled={isSubmitting}
                        placeholder="ex. Heures réalisées sur le trimestre"
                        rows={2}
                      />
                    </label>
                  </div>
                ))}
              </section>

              <RepeatableMoneyBlock
                title="Frais de transport"
                summary={previousValues.transport}
                globalComment={form.financial_transport_comment}
                onGlobalComment={v => setForm(f => ({ ...f, financial_transport_comment: v }))}
                globalCommentPlaceholder="Commentaire global transport"
                rows={form.financial_transport}
                isSubmitting={isSubmitting}
                onChange={rows => setRow('financial_transport', rows)}
                nameKey="transport_name"
                placeholderName="Intitulé (ex. Bus)"
                emptyRow={lineTransport}
              />

              <RepeatableMoneyBlock
                title="Frais de fonctionnement"
                summary={previousValues.operating}
                globalComment={form.financial_operating_comment}
                onGlobalComment={v => setForm(f => ({ ...f, financial_operating_comment: v }))}
                globalCommentPlaceholder="Commentaire global fonctionnement"
                rows={form.financial_operating}
                isSubmitting={isSubmitting}
                onChange={rows => setRow('financial_operating', rows)}
                nameKey="operating_name"
                placeholderName="Intitulé (ex. Photocopies)"
                emptyRow={lineOperating}
              />

              <section style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ ...h4Style, margin: 0 }}>Prestataires</h4>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setRow('financial_service', [...form.financial_service, lineService()])}
                    disabled={isSubmitting}
                  >
                    + Ligne
                  </button>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Demande initiale (total prestataires) : <strong>{previousValues.service}</strong>
                </div>
                <label style={{ display: 'block', marginBottom: '0.65rem' }}>
                  <span style={labelStyle}>Commentaire global prestations</span>
                  <textarea
                    value={form.financial_service_comment}
                    onChange={e => setForm(f => ({ ...f, financial_service_comment: e.target.value }))}
                    style={commentInputStyle}
                    disabled={isSubmitting}
                    placeholder="Commentaire global prestations"
                    rows={2}
                  />
                </label>
                {form.financial_service.map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: '0.75rem',
                      padding: '0.65rem',
                      background: '#fff',
                      borderRadius: '8px',
                      border: '1px solid var(--border, #e2e8f0)'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 36px', gap: '0.5rem', marginBottom: '0.45rem' }}>
                      <input
                        placeholder="Prestataire"
                        value={row.service_name}
                        onChange={e => {
                          const next = [...form.financial_service];
                          next[idx] = { ...row, service_name: e.target.value };
                          setRow('financial_service', next);
                        }}
                        style={inputStyle}
                        disabled={isSubmitting}
                      />
                      <input
                        placeholder="€"
                        value={row.price}
                        onChange={e => {
                          const next = [...form.financial_service];
                          next[idx] = { ...row, price: e.target.value };
                          setRow('financial_service', next);
                        }}
                        style={inputStyle}
                        disabled={isSubmitting}
                      />
                      <input
                        placeholder="h"
                        value={row.hours}
                        onChange={e => {
                          const next = [...form.financial_service];
                          next[idx] = { ...row, hours: e.target.value };
                          setRow('financial_service', next);
                        }}
                        style={inputStyle}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="hover:bg-red-400 hover:text-white"
                        style={{ 
                          padding: 0,
                          borderRadius: 10,
                          border: '1px solid red',
                          
                         }}
                        onClick={() =>
                          setRow(
                            'financial_service',
                            form.financial_service.length > 1 ? form.financial_service.filter((_, i) => i !== idx) : [lineService()]
                          )
                        }
                        disabled={isSubmitting}
                        aria-label="Retirer"
                      >
                        ×
                      </button>
                    </div>
                    <label style={{ display: 'block' }}>
                      <span style={{ ...labelStyle, fontSize: '0.7rem' }}>Commentaire ligne</span>
                      <textarea
                        value={row.comment}
                        onChange={e => {
                          const next = [...form.financial_service];
                          next[idx] = { ...row, comment: e.target.value };
                          setRow('financial_service', next);
                        }}
                        style={{ ...commentInputStyle, minHeight: '2rem' }}
                        disabled={isSubmitting}
                        placeholder="ex. Accompagnement pédagogique"
                        rows={2}
                      />
                    </label>
                  </div>
                ))}
              </section>

              <RepeatableMoneyBlock
                title="Autres financements"
                summary={previousValues.autres}
                rows={form.financial_autres_financements}
                isSubmitting={isSubmitting}
                onChange={rows => setRow('financial_autres_financements', rows)}
                nameKey="autres_name"
                placeholderName="Intitulé (ex. Subvention)"
                emptyRow={lineAutres}
              />
            </div>
          </div>
          <div
            className="modal-footer"
            style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}
          >
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting} style={{ minWidth: '100px' }}>
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ minWidth: '160px', backgroundColor: '#d97706', borderColor: '#d97706' }}
            >
              {isSubmitting ? 'Clôture...' : 'Valider et clôturer le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const sectionStyle: React.CSSProperties = {
  padding: '1rem',
  background: 'var(--info-bg, #f8fafc)',
  borderRadius: '8px',
  border: '1px solid var(--border, #e2e8f0)'
};

const h4Style: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 600,
  color: 'var(--text-main, #111827)',
  marginBottom: '0.35rem'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#64748b',
  marginBottom: '0.25rem'
};

type MoneyRow = { price: string; comment: string } & Record<string, string>;

function RepeatableMoneyBlock<Row extends MoneyRow>({
  title,
  summary,
  rows,
  isSubmitting,
  onChange,
  nameKey,
  placeholderName,
  emptyRow,
  globalComment,
  onGlobalComment,
  globalCommentPlaceholder
}: {
  title: string;
  summary: string;
  rows: Row[];
  isSubmitting: boolean;
  onChange: (rows: Row[]) => void;
  nameKey: keyof Row;
  placeholderName: string;
  emptyRow: () => Row;
  globalComment?: string;
  onGlobalComment?: (v: string) => void;
  globalCommentPlaceholder?: string;
}) {
  const showGlobal = onGlobalComment != null;

  return (
    <section style={sectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h4 style={{ ...h4Style, margin: 0 }}>{title}</h4>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange([...rows, emptyRow()])} disabled={isSubmitting}>
          + Ligne
        </button>
      </div>
      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
        Demande initiale (total) : <strong>{summary}</strong>
      </div>
      {showGlobal && (
        <label style={{ display: 'block', marginBottom: '0.65rem' }}>
          <span style={labelStyle}>{globalCommentPlaceholder ?? 'Commentaire global'}</span>
          <textarea
            value={globalComment ?? ''}
            onChange={e => onGlobalComment!(e.target.value)}
            style={{
              padding: '0.45rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--border, #e2e8f0)',
              fontSize: '0.9rem',
              width: '100%',
              boxSizing: 'border-box',
              minHeight: '2.5rem',
              resize: 'vertical' as const
            }}
            disabled={isSubmitting}
            placeholder={globalCommentPlaceholder}
            rows={2}
          />
        </label>
      )}
      {rows.map((row, idx) => (
        <div
          key={idx}
          style={{
            marginBottom: '0.65rem',
            padding: '0.55rem',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid var(--border, #e2e8f0)'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 36px', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <input
              placeholder={placeholderName}
              value={String(row[nameKey] ?? '')}
              onChange={e => {
                const next = [...rows];
                next[idx] = { ...row, [nameKey]: e.target.value } as Row;
                onChange(next);
              }}
              style={inputStyle}
              disabled={isSubmitting}
            />
            <input
              placeholder="€"
              value={row.price}
              onChange={e => {
                const next = [...rows];
                next[idx] = { ...row, price: e.target.value } as Row;
                onChange(next);
              }}
              style={inputStyle}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="hover:bg-red-400 hover:text-white"
              style={{ 
                padding: 0,
                borderRadius: 10,
                border: '1px solid red',
                
               }}
              onClick={() => onChange(rows.length > 1 ? rows.filter((_, i) => i !== idx) : [emptyRow()])}
              disabled={isSubmitting}
              aria-label="Retirer"
            >
              ×
            </button>
          </div>
          <label style={{ display: 'block' }}>
            <span style={{ ...labelStyle, fontSize: '0.7rem' }}>Commentaire ligne</span>
            <textarea
              value={row.comment}
              onChange={e => {
                const next = [...rows];
                next[idx] = { ...row, comment: e.target.value } as Row;
                onChange(next);
              }}
              style={{
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border, #e2e8f0)',
                fontSize: '0.9rem',
                width: '100%',
                boxSizing: 'border-box',
                minHeight: '2rem',
                resize: 'vertical' as const
              }}
              disabled={isSubmitting}
              placeholder="Commentaire pour cette ligne"
              rows={2}
            />
          </label>
        </div>
      ))}
    </section>
  );
}

export default CloseProjectBilanModal;
