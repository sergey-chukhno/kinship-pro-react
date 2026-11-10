/**
 * Carte financeur — « informé le [date] » (Patrick 09/11, morceau §4bis/§6).
 */

export function formatFunderInformedDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const dayOnly = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dayOnly) return `${dayOnly[3]}/${dayOnly[2]}/${dayOnly[1]}`;

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR');
}

/** Affiche / carte : « financeur · informé le jj/mm/aaaa » ou « sera informé au démarrage ». */
export function funderCardInformedLine(opts: {
  startedNotifiedAt?: string | null;
  informedOn?: string | null;
  shareMode?: 'nominatif' | 'anonyme' | null;
}): string {
  const date = formatFunderInformedDate(opts.informedOn || opts.startedNotifiedAt);
  const share =
    opts.shareMode === 'anonyme'
      ? 'vue anonymisée'
      : opts.shareMode === 'nominatif'
        ? 'vue nominative'
        : null;

  if (date) {
    return share ? `financeur · informé le ${date} · ${share}` : `financeur · informé le ${date}`;
  }
  return share
    ? `financeur · sera informé au démarrage · ${share}`
    : 'financeur · sera informé au démarrage';
}
