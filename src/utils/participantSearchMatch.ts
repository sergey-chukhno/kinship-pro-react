/** Display form used in Attester participant chips: « Prénom I. ». */
export function participantChipName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/**
 * Attester Participants search: match full name or chip label only.
 * Do not match organization (e.g. « … Risso » would make « s » / « ss » match everyone).
 */
export function participantMatchesSearch(name: string, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  const full = (name || '').toLowerCase();
  const chip = participantChipName(name || '').toLowerCase();
  return full.includes(t) || chip.includes(t);
}
