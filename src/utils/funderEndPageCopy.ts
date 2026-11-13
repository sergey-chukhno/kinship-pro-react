/** D-FORMATION-SHARE-01 §2bis — page de fin follow (A/B/C). */

export type FunderEndPageKind = 'project' | 'formation';

export function funderEndPageCopy(input: {
  kind?: FunderEndPageKind | string | null;
  closedOn?: string | null;
  message?: string | null;
}): { title: string; sub: string } {
  const message = input.message?.trim();
  if (message) {
    const match = message.match(/^(.+?\.)\s+(.+)$/s);
    if (match?.[1] && match[2]) {
      return { title: match[1], sub: match[2] };
    }
    return { title: message, sub: 'Le rapport vous a été transmis par e-mail.' };
  }

  const closedOn = input.closedOn?.trim() || '—';
  const title =
    input.kind === 'project'
      ? `Ce projet est clôturé le ${closedOn}.`
      : `Cette session est clôturée le ${closedOn}.`;

  return {
    title,
    sub: 'Le rapport vous a été transmis par e-mail.',
  };
}
