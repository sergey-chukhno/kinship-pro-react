/**
 * Heures HV sur une ligne `financial_hv_lines`.
 * L’API utilise `hour` ; `price` est conservé pour la rétrocompatibilité.
 */
export function hvLineHours(line: { hour?: string; price?: string } | null | undefined): number {
    const raw = line?.hour != null && line.hour !== '' ? line.hour : line?.price;
    return Number.parseFloat(String(raw ?? '0')) || 0;
}

/** Heures HSE sur une ligne `financial_hse_lines` (`hour` ; `price` en lecture héritée). */
export function hseLineHours(line: { hour?: string; price?: string } | null | undefined): number {
    const raw = line?.hour != null && line.hour !== '' ? line.hour : line?.price;
    return Number.parseFloat(String(raw ?? '0')) || 0;
}
