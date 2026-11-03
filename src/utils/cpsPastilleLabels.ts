/**
 * CPS / SPF display helpers for Attester P2.13 (Patrick reprises).
 * Pastilles = intitulé fiche mot pour mot + code ; headings = « C1.6 · intitulé ».
 */

/** Extract SPF codes from a badge name, e.g. "(C1.5)", "(E.2.2.a)", "(S1.2)". */
export function extractSpfCodesFromBadgeName(badgeName?: string | null): string[] {
  if (!badgeName) return [];
  const codes: string[] = [];
  // Allow "E.2.2.a", "E2.2.b", "C1.5" inside parentheses
  const re = /\(([CES]\.?[\d.]+[a-z]?)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(badgeName)) !== null) {
    // Normalize leading "E." → "E" (E.2.2.a → E2.2.a)
    const raw = m[1];
    const code = raw.replace(/^([CES])\./i, (_, l: string) => l.toUpperCase());
    const normalized = code.charAt(0).toUpperCase() + code.slice(1);
    if (!codes.includes(normalized)) codes.push(normalized);
  }
  return codes;
}

/**
 * Pastille label (Patrick GO) : intitulé de la fiche mot pour mot, avec son code.
 * Ex. « S'auto-évaluer positivement (C1.5) ».
 */
export function cpsPastilleLabelFromBadgeName(badgeName: string): string {
  return badgeName?.trim() || badgeName;
}

/** Sort key for SPF codes: C1.1 < C1.3 < C1.5 < C1.6 ; S2.1 < S2.2. */
export function spfCodeSortKey(code: string): string {
  const m = code.match(/^([CES])(\d+(?:\.\d+)*)([a-z]?)$/i);
  if (!m) return code.toUpperCase();
  const letter = m[1].toUpperCase();
  const parts = m[2].split('.').map((n) => n.padStart(4, '0'));
  const suffix = m[3] || '';
  return `${letter}${parts.join('.')}${suffix}`;
}

/** Sort badge names by first SPF code (Patrick : C1.1…C1.6 ; S2.1 puis S2.2). */
export function sortBadgeNamesBySpfCode(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const ca = extractSpfCodesFromBadgeName(a)[0] || a;
    const cb = extractSpfCodesFromBadgeName(b)[0] || b;
    return spfCodeSortKey(ca).localeCompare(spfCodeSortKey(cb), 'en');
  });
}

/** Strip trailing "(C1.6)" / combined codes from badge name for display title. */
export function stripSpfCodesFromBadgeName(badgeName: string): string {
  return badgeName
    .replace(/\s*\(([CES]\.?[\d.]+[a-z]?)\)/gi, '')
    .replace(/\s+et\s+$/i, '')
    .replace(/\s+&\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+–\s*$/g, '')
    .trim();
}

/**
 * Heading with code first: « C1.6 · Renforcer sa pleine attention – à soi ».
 * Non-CPS / no code → original display name.
 */
export function formatBadgeHeadingWithCode(badgeName: string): string {
  const codes = extractSpfCodesFromBadgeName(badgeName);
  if (codes.length === 0) return badgeName;
  const title = stripSpfCodesFromBadgeName(badgeName);
  const codePart = codes.length === 1 ? codes[0] : codes.join(' et ');
  if (!title) return codePart;
  return `${codePart} · ${title}`;
}

/** Phase number from competence code C1/E1/S1 → "1", C2 → "2". */
export function phaseNumberFromCpsCompetenceCode(code?: string | null): string | null {
  if (!code) return null;
  const m = String(code).trim().match(/(\d+)\s*$/);
  return m ? m[1] : null;
}
