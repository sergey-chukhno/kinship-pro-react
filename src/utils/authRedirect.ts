/** Safe post-login/register redirect from ?redirect= query (Lot 3 Parent-Link). */
const ALLOWED_EXACT = new Set(["/mes-enfants", "/dashboard"]);

export function getSafePostAuthRedirect(search: string): string | null {
  const raw = new URLSearchParams(search).get("redirect");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  if (ALLOWED_EXACT.has(raw)) return raw;
  if (/^\/famille\/[0-9a-fA-F-]{36}$/.test(raw)) return raw;
  return null;
}
