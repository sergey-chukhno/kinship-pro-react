/** Règles alignées sur les documents de projet : 5 fichiers max au total, 1 Mo chacun */
export const MAX_SERVICE_QUOTE_FILES = 5;
export const MAX_SERVICE_QUOTE_BYTES = 1024 * 1024;

/**
 * Valide un devis prestataire avant de l’enregistrer dans l’état (remplacement à `index` inclus).
 */
export function validateServiceQuoteSelection(
  file: File,
  currentFiles: (File | null | undefined)[],
  index: number
): { ok: true } | { ok: false; message: string } {
  if (file.size > MAX_SERVICE_QUOTE_BYTES) {
    return { ok: false, message: 'Chaque devis doit faire moins de 1 Mo' };
  }
  const next = [...currentFiles];
  while (next.length <= index) next.push(null);
  next[index] = file;
  const count = next.filter((f): f is File => f != null).length;
  if (count > MAX_SERVICE_QUOTE_FILES) {
    return { ok: false, message: `Vous pouvez joindre au maximum ${MAX_SERVICE_QUOTE_FILES} devis` };
  }
  return { ok: true };
}

export function countServiceQuoteFiles(files: (File | null | undefined)[]): number {
  return files.filter((f): f is File => f != null).length;
}
