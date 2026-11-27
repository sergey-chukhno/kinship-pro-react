/**
 * Fixtures for proof page (V1.8.7 smokes).
 * Patrick: in production, never serve fixtures — unknown URL → 404.
 *
 * - Local (`npm start`): fixtures ON by default
 * - Staging Vercel: set REACT_APP_PROOF_PAGE_FIXTURES=1
 * - Production: leave unset or REACT_APP_PROOF_PAGE_FIXTURES=0 (never 1)
 */
export function allowProofPageFixtures(): boolean {
  if (process.env.REACT_APP_PROOF_PAGE_FIXTURES === '1') return true;
  if (process.env.REACT_APP_PROOF_PAGE_FIXTURES === '0') return false;
  return process.env.NODE_ENV !== 'production';
}
