import apiClient from './config';
import {
  CatalogueImportPreview,
  CatalogueServerFlags,
  FormationFiche,
} from '../types/formationCatalogue';
import {
  analysisToPreview,
  entryToFiche,
  ficheToPayload,
  flagsFromMeta,
} from './formationCatalogMapper';
import { CatalogueOrgRef, resolveCatalogueOrg } from './formationCatalogOrg';

const BASE = '/api/v1/formation_catalog_entries';

function apiErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') {
    if (data.error === 'eu_mc_gate_closed') return data.message || 'Microcertification européenne indisponible pour cet organisme.';
    if (data.error === 'immutable_create_choice') return 'Ces trois choix sont définitifs.';
    if (data.error === 'incomplete' || data.error === 'incomplete_listed_entry') {
      const missing = Array.isArray(data.missing) ? data.missing.join(', ') : '';
      return missing ? `Fiche incomplète : ${missing}` : 'Fiche incomplète.';
    }
    if (data.error === 'validation_failed' && data.details?.title) {
      return 'Ce titre est déjà celui d’une fiche de votre organisme.';
    }
    if (typeof data.error === 'string' && data.error.startsWith('CERTIFICATION_')) {
      return data.message || data.error;
    }
    if (data.error === 'live_batch_exists') {
      return data.message || 'Un lot non validé existe déjà.';
    }
    return data.error;
  }
  return fallback;
}

export async function getCatalogueFlags(org?: CatalogueOrgRef | null): Promise<CatalogueServerFlags> {
  const resolved = org || resolveCatalogueOrg(null);
  if (!resolved) {
    return { eu_mc_gate: { allowed: false, reason: 'setting' }, certification_links_enabled: false };
  }
  const res = await apiClient.get(BASE, {
    params: {
      organization_type: resolved.type,
      organization_id: resolved.id,
      per_page: 1,
    },
  });
  return flagsFromMeta(res.data?.meta);
}

export async function getCatalogue(org?: CatalogueOrgRef | null): Promise<FormationFiche[]> {
  const resolved = org || resolveCatalogueOrg(null);
  if (!resolved) return [];
  const res = await apiClient.get(BASE, {
    params: {
      organization_type: resolved.type,
      organization_id: resolved.id,
      per_page: 100,
    },
  });
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  return rows.map((e: any) => entryToFiche(e, resolved));
}

export async function getCatalogueFiche(id: string): Promise<FormationFiche | null> {
  try {
    const res = await apiClient.get(`${BASE}/${id}`);
    return entryToFiche(res.data?.data || res.data);
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

export async function saveCatalogueFiche(
  fiche: FormationFiche,
  org?: CatalogueOrgRef | null,
  options?: { imageFile?: File | null; clearImage?: boolean }
): Promise<FormationFiche> {
  const resolved = org || resolveCatalogueOrg(null);
  if (!resolved) throw new Error('Organisation School ou Company requise.');

  const payload = ficheToPayload(fiche, resolved);
  const isNew = !fiche.id || fiche.id.startsWith('fiche-') || fiche.id.startsWith('local-');

  try {
    if (isNew) {
      const res = await apiClient.post(BASE, { formation_catalog_entry: payload });
      return entryToFiche(res.data?.data || res.data, resolved);
    }
    const { primary_organization_type, primary_organization_id, is_eu_mc_declared, ...updatable } =
      payload;
    void primary_organization_type;
    void primary_organization_id;
    void is_eu_mc_declared;

    if (options?.imageFile) {
      const form = new FormData();
      Object.entries(updatable).forEach(([key, value]) => {
        if (value == null) return;
        if (Array.isArray(value)) {
          value.forEach((v) => form.append(`formation_catalog_entry[${key}][]`, String(v)));
        } else if (typeof value === 'boolean' || typeof value === 'number') {
          form.append(`formation_catalog_entry[${key}]`, String(value));
        } else if (typeof value === 'object') {
          form.append(`formation_catalog_entry[${key}]`, JSON.stringify(value));
        } else {
          form.append(`formation_catalog_entry[${key}]`, String(value));
        }
      });
      form.append('formation_catalog_entry[main_picture]', options.imageFile);
      const res = await apiClient.patch(`${BASE}/${fiche.id}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return entryToFiche(res.data?.data || res.data, resolved);
    }

    const res = await apiClient.patch(`${BASE}/${fiche.id}`, {
      formation_catalog_entry: updatable,
    });
    return entryToFiche(res.data?.data || res.data, resolved);
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Enregistrement impossible.'));
  }
}

/** Applique un code RNCP/RS via le serveur (CertificationApplier) — pas de client registre FE. */
export async function applyCertificationCode(
  ficheId: string,
  code: string,
  org?: CatalogueOrgRef | null
): Promise<FormationFiche> {
  const resolved = org || resolveCatalogueOrg(null);
  try {
    const trimmed = code.trim().toUpperCase();
    const res = await apiClient.patch(`${BASE}/${ficheId}`, {
      formation_catalog_entry: trimmed
        ? {
            targeted_certification_code: trimmed,
            integration_option: 'standalone',
          }
        : {
            targeted_certification_code: '',
            integration_option: null,
            targeted_block_code: null,
          },
    });
    return entryToFiche(res.data?.data || res.data, resolved);
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Code certification illisible.'));
  }
}

export async function createCatalogueDraft(
  lock: {
    euMc: boolean;
    orgCertified?: boolean;
  },
  org?: CatalogueOrgRef | null
): Promise<FormationFiche> {
  const resolved = org || resolveCatalogueOrg(null);
  if (!resolved) throw new Error('Organisation School ou Company requise.');
  try {
    const res = await apiClient.post(BASE, {
      formation_catalog_entry: {
        primary_organization_type: resolved.type,
        primary_organization_id: resolved.id,
        is_eu_mc_declared: Boolean(lock.euMc),
        has_jury: false,
      },
    });
    const fiche = entryToFiche(res.data?.data || res.data, resolved);
    return { ...fiche, orgCertified: lock.orgCertified ?? true };
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Création de la fiche impossible.'));
  }
}

export async function listCatalogueFiche(
  id: string,
  org?: CatalogueOrgRef | null
): Promise<FormationFiche> {
  try {
    const res = await apiClient.post(`${BASE}/${id}/list`);
    return entryToFiche(res.data?.data || res.data, org || null);
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Ajout au catalogue impossible.'));
  }
}

export async function withdrawCatalogueFiche(id: string): Promise<FormationFiche> {
  try {
    const res = await apiClient.post(`${BASE}/${id}/withdraw`);
    return entryToFiche(res.data?.data || res.data);
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Retrait du catalogue impossible.'));
  }
}

export async function deleteCatalogueFiche(id: string): Promise<void> {
  try {
    await apiClient.delete(`${BASE}/${id}`);
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Suppression du brouillon impossible.'));
  }
}

export async function previewCatalogueUpload(
  file: File,
  org?: CatalogueOrgRef | null,
  replace = false
): Promise<CatalogueImportPreview> {
  const resolved = org || resolveCatalogueOrg(null);
  if (!resolved) throw new Error('Organisation School ou Company requise.');

  const form = new FormData();
  form.append('file', file);
  form.append('organization_type', resolved.type);
  form.append('organization_id', String(resolved.id));
  if (replace) form.append('replace', 'true');

  try {
    const res = await apiClient.post(`${BASE}/imports`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return analysisToPreview(file.name, res.data?.analysis || {}, res.data?.import_id);
  } catch (err: any) {
    if (err?.response?.status === 409 && err?.response?.data?.error === 'live_batch_exists' && !replace) {
      return previewCatalogueUpload(file, resolved, true);
    }
    throw new Error(apiErrorMessage(err, 'Analyse du tableau impossible.'));
  }
}

export async function commitCatalogueImport(
  preview: CatalogueImportPreview
): Promise<{ createdCount: number }> {
  if (!preview.importId) throw new Error('Lot d’import manquant.');
  try {
    const res = await apiClient.post(`${BASE}/imports/${preview.importId}/confirm`);
    return { createdCount: Number(res.data?.data?.created_count) || 0 };
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Validation du tableau impossible.'));
  }
}

export async function downloadImportTemplate(format: 'csv' | 'xlsx' = 'csv'): Promise<void> {
  const res = await apiClient.get(`${BASE}/import_template`, {
    params: { format },
    responseType: 'blob',
  });
  const blob = new Blob([res.data], {
    type:
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    format === 'xlsx' ? 'modele_catalogue_formations.xlsx' : 'modele_catalogue_formations.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** @deprecated template local — préférer downloadImportTemplate */
export const CATALOGUE_CSV_TEMPLATE = `Titre;Description;Programme;Durée en heures;Modalité;Financement
Devenir journaliste;Titre Journaliste;4 blocs RNCP;513,5;Présentiel;CPF
Assertivité;Communication;Savoir oser;14;Présentiel;OPCO
`;
