/**
 * Rule 9 — sole reader of proof-page server responses (V1.8.7).
 * Screens consume ProofPageResponse only; never recompose labels/markers.
 */
import axios from 'axios';
import axiosClient, { axiosClientWithoutToken } from './config';
import {
  getProofPageFixtureByProjectId,
  getProofPageFixtureByToken,
} from '../data/proofPageFixtures';
import {
  HolderZone,
  ProofCore,
  ProofPageGoneError,
  ProofPageNotFoundError,
  ProofPageResponse,
  ProofPageView,
} from '../types/proofPage';

/** Set REACT_APP_PROOF_PAGE_API=1 when Sergey étape 2 is live. */
const USE_PROOF_PAGE_API = process.env.REACT_APP_PROOF_PAGE_API === '1';

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function boolOrFalse(v: unknown): boolean {
  return v === true;
}

/**
 * Normalize server payload: missing interrupteurs = off; keep server display values as-is.
 */
export function normalizeProofPageResponse(raw: unknown): ProofPageResponse {
  const root = asRecord(raw);
  const nested = asRecord(root.data ?? root);
  const proofRaw = asRecord(nested.proof);
  const zoneRaw = nested.holder_zone == null ? null : asRecord(nested.holder_zone);

  const proof = proofRaw as unknown as ProofCore;
  const holder_zone = zoneRaw as unknown as HolderZone | null;

  const view = (nested.view as ProofPageView) || 'link';

  return {
    proof_verify_api_enabled: boolOrFalse(nested.proof_verify_api_enabled),
    european_export_ui_enabled: boolOrFalse(nested.european_export_ui_enabled),
    proof_pdf_enabled: boolOrFalse(nested.proof_pdf_enabled),
    rights_page_enabled: boolOrFalse(nested.rights_page_enabled),
    view,
    proof,
    holder_zone: view === 'holder' ? holder_zone : null,
  };
}

function mapHttpError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 410) throw new ProofPageGoneError();
    if (status === 404) throw new ProofPageNotFoundError();
  }
  throw err;
}

/** GET /api/v1/proof/:token — public link view (one read per page open). */
export async function fetchProofByToken(token: string): Promise<ProofPageResponse> {
  if (USE_PROOF_PAGE_API) {
    try {
      const res = await axiosClientWithoutToken.get(`/api/v1/proof/${encodeURIComponent(token)}`);
      return normalizeProofPageResponse(res.data);
    } catch (err) {
      mapHttpError(err);
    }
  }

  const fixture = getProofPageFixtureByToken(token);
  if (!fixture) throw new ProofPageNotFoundError();
  return normalizeProofPageResponse(fixture);
}

/** GET /api/v1/projects/:id/proof — authenticated holder view. */
export async function fetchProofByProjectId(projectId: string | number): Promise<ProofPageResponse> {
  if (USE_PROOF_PAGE_API) {
    try {
      const res = await axiosClient.get(`/api/v1/projects/${encodeURIComponent(String(projectId))}/proof`);
      return normalizeProofPageResponse(res.data);
    } catch (err) {
      mapHttpError(err);
    }
  }

  const fixture = getProofPageFixtureByProjectId(projectId);
  if (!fixture) throw new ProofPageNotFoundError();
  return normalizeProofPageResponse(fixture);
}
