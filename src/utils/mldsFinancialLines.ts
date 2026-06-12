import { hvLineHours } from './mldsHvLines';

/**
 * Rails serializers may return MLDS line collections as arrays or as objects
 * keyed by index ("0", "1", …) when nested attributes were stored as hashes.
 */
export function normalizeMldsLineCollection<T extends object>(value: unknown): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is T => item != null && typeof item === 'object');
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => obj[k])
        .filter((item): item is T => item != null && typeof item === 'object');
    }
  }
  return [];
}

export type MldsTransportLine = { transport_name: string; price: string };
export type MldsOperatingLine = { operating_name: string; price: string };
export type MldsHvLine = { teacher_name: string; hour: string; price?: string };
export type MldsHseLine = { hse_name: string; hour: string; price?: string; comment?: string | null };
export type MldsAutresLine = { autres_name: string; price: string };

export function getMldsHseLinesFromMldsInfo(
  mlds: { financial_hse_lines?: unknown; financial_hse?: number | null } | null | undefined
): MldsHseLine[] {
  if (!mlds) return [];
  const lines = normalizeMldsLineCollection<{ hse_name?: string; hour?: string; price?: string; comment?: string | null }>(
    mlds.financial_hse_lines
  );
  if (lines.length > 0) {
    return lines.map((l) => ({
      hse_name: String(l.hse_name ?? ''),
      hour:
        l.hour != null && String(l.hour) !== ''
          ? String(l.hour)
          : l.price != null
            ? String(l.price)
            : '',
      comment: l.comment ?? undefined,
    }));
  }
  if (mlds.financial_hse != null) {
    return [{ hse_name: 'HSE', hour: String(mlds.financial_hse), comment: '' }];
  }
  return [];
}

export function getMldsHvLinesFromMldsInfo(
  mlds: { financial_hv_lines?: unknown; financial_hv?: number | string | null } | null | undefined
): MldsHvLine[] {
  if (!mlds) return [];
  const lines = normalizeMldsLineCollection<{ teacher_name?: string; hour?: string; price?: string }>(
    mlds.financial_hv_lines
  );
  if (lines.length > 0) {
    return lines.map((l) => ({
      teacher_name: String(l.teacher_name ?? ''),
      hour:
        l.hour != null && String(l.hour) !== ''
          ? String(l.hour)
          : l.price != null
            ? String(l.price)
            : '',
      price: l.price != null ? String(l.price) : undefined,
    }));
  }
  const hv = mlds.financial_hv;
  if (hv != null && Number(hv) > 0) {
    return [{ teacher_name: '', hour: String(hv) }];
  }
  return [];
}

export function getMldsTransportLinesFromMldsInfo(mlds: unknown): MldsTransportLine[] {
  const m = mlds as { financial_transport?: unknown } | null | undefined;
  if (!m) return [];
  const lines = normalizeMldsLineCollection<{ transport_name?: string; price?: string }>(m.financial_transport);
  if (lines.length > 0) {
    return lines.map((l) => ({
      transport_name: String(l.transport_name ?? ''),
      price: l.price != null ? String(l.price) : '',
    }));
  }
  if (m.financial_transport != null && typeof m.financial_transport !== 'object') {
    return [{ transport_name: '', price: String(m.financial_transport) }];
  }
  return [];
}

export function getMldsOperatingLinesFromMldsInfo(mlds: unknown): MldsOperatingLine[] {
  const m = mlds as { financial_operating?: unknown } | null | undefined;
  if (!m) return [];
  const lines = normalizeMldsLineCollection<{ operating_name?: string; price?: string }>(m.financial_operating);
  if (lines.length > 0) {
    return lines.map((l) => ({
      operating_name: String(l.operating_name ?? ''),
      price: l.price != null ? String(l.price) : '',
    }));
  }
  if (m.financial_operating != null && typeof m.financial_operating !== 'object') {
    return [{ operating_name: '', price: String(m.financial_operating) }];
  }
  return [];
}

export function getMldsAutresFinancementsFromMldsInfo(mlds: unknown): MldsAutresLine[] {
  const m = mlds as { financial_autres_financements?: unknown } | null | undefined;
  if (!m) return [];
  return normalizeMldsLineCollection<{ autres_name?: string; price?: string }>(m.financial_autres_financements).map((l) => ({
    autres_name: String(l.autres_name ?? ''),
    price: l.price != null ? String(l.price) : '',
  }));
}

/** Sum of HV credit lines in euros (hours × rate). */
export function sumMldsHvCreditsEuro(
  mlds: Parameters<typeof getMldsHvLinesFromMldsInfo>[0],
  rate: number
): number {
  const hvLines = getMldsHvLinesFromMldsInfo(mlds);
  if (hvLines.length > 0) {
    return hvLines.reduce((sum, line) => sum + hvLineHours(line) * rate, 0);
  }
  const hvHours = Number.parseFloat(String(mlds?.financial_hv ?? 0)) || 0;
  return hvHours * rate;
}

/** Sum transport + operating + service + HV credits (excludes HSE declarative hours). */
export function sumMldsFinancialCreditsEuro(
  mlds: unknown,
  serviceLines: Array<{ price?: string | number }>,
  rate: number
): number {
  const transport = getMldsTransportLinesFromMldsInfo(mlds);
  const operating = getMldsOperatingLinesFromMldsInfo(mlds);
  const transportTotal = transport.reduce((s, l) => s + (Number.parseFloat(l.price || '0') || 0), 0);
  const operatingTotal = operating.reduce((s, l) => s + (Number.parseFloat(l.price || '0') || 0), 0);
  const serviceTotal = serviceLines.reduce(
    (s, l) => s + (Number.parseFloat(String(l.price ?? '0')) || 0),
    0
  );
  return transportTotal + operatingTotal + serviceTotal + sumMldsHvCreditsEuro(mlds as any, rate);
}
