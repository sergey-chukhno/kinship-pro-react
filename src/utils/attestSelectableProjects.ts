/** Patrick lot1 — Attester project picker: in-progress only, no formation sessions. */

export function isAttestSelectableApiProject(p: {
  status?: string;
  project_kind?: string | null;
  formation_catalog_entry_id?: string | number | null;
  mlds_information?: unknown;
}): boolean {
  if (p.mlds_information != null) return false;
  if (p.status !== 'in_progress') return false;
  if (p.project_kind === 'formation') return false;
  if (p.formation_catalog_entry_id != null && p.formation_catalog_entry_id !== '') {
    return false;
  }
  return true;
}
