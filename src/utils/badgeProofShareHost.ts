/** Origine des liens preuve badge / verify (REACT_APP_FRONTEND_URL ou localhost en dev). */
export function getBadgeProofShareOrigin(): string {
  const fromEnv = process.env.REACT_APP_FRONTEND_URL?.replace(/\/$/, '');
  return fromEnv || 'http://localhost:3001';
}

/** Hôte affiché dans la zone 6 — ex. localhost:3001 */
export function getBadgeProofShareHost(): string {
  try {
    return new URL(getBadgeProofShareOrigin()).host;
  } catch {
    return 'localhost:3001';
  }
}

export function formatBadgeProofShareDisplay(relativePath: string): string {
  const path = relativePath.replace(/^\//, '');
  return `${getBadgeProofShareHost()}/${path}`;
}

export function getBadgeProofVerifyDisplayPath(): string {
  return formatBadgeProofShareDisplay('verify');
}
