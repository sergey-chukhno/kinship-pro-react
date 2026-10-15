import {
  CatalogueImportPreview,
  CatalogueImportRowResult,
  CatalogueServerFlags,
  FinancementType,
  FormationFiche,
  IdentityAtAssessment,
  ParticipationMode,
} from '../types/formationCatalogue';
import { CatalogueOrgRef } from './formationCatalogOrg';

const MODALITY_TO_BE: Record<string, string> = {
  presentiel: 'on_site',
  distanciel: 'online',
  hybride: 'blended',
};

const MODALITY_FROM_BE: Record<string, ParticipationMode> = {
  on_site: 'presentiel',
  online: 'distanciel',
  blended: 'hybride',
};

const FINANCE_TO_BE: Record<string, string> = {
  CPF: 'cpf',
  OPCO: 'opco',
  Entreprise: 'entreprise',
  Association: 'association',
  Institution: 'institution',
  Autre: 'autre',
};

const FINANCE_FROM_BE: Record<string, FinancementType> = {
  cpf: 'CPF',
  opco: 'OPCO',
  entreprise: 'Entreprise',
  association: 'Association',
  institution: 'Institution',
  autre: 'Autre',
};

const IDENTITY_TO_BE: Record<string, string> = {
  unsupervised: 'unsupervised_no_identity_check',
  supervised_no_id: 'supervised_no_identity_check',
  supervised_online: 'supervised_online',
  onsite_id: 'onsite_identity_check',
};

const IDENTITY_FROM_BE: Record<string, IdentityAtAssessment> = {
  unsupervised_no_identity_check: 'unsupervised',
  supervised_no_identity_check: 'supervised_no_id',
  supervised_online: 'supervised_online',
  onsite_identity_check: 'onsite_id',
};

const LANG_TO_BE: Record<string, string> = {
  Français: 'fr',
  francais: 'fr',
  French: 'fr',
  Anglais: 'en',
  English: 'en',
  Espagnol: 'es',
  Allemand: 'de',
  Italien: 'it',
};

const LANG_FROM_BE: Record<string, string> = {
  fr: 'Français',
  en: 'Anglais',
  es: 'Espagnol',
  de: 'Allemand',
  it: 'Italien',
};

export type BeCatalogEntry = Record<string, any>;

export function flagsFromMeta(meta: Record<string, any> | undefined): CatalogueServerFlags {
  const gate = meta?.eu_mc_gate || {};
  return {
    eu_mc_gate: {
      allowed: Boolean(gate.allowed),
      reason: gate.reason || undefined,
    },
    certification_links_enabled: Boolean(meta?.certification_links_enabled),
  };
}

export function entryToFiche(entry: BeCatalogEntry, orgHint?: CatalogueOrgRef | null): FormationFiche {
  const orgType = entry.primary_organization_type || orgHint?.type || 'Company';
  const orgId = entry.primary_organization_id || orgHint?.id;
  const orgName = orgHint?.name || `${orgType} #${orgId}`;
  const linesRaw = entry.program_lines;
  const programmeLines =
    typeof linesRaw === 'string' && linesRaw.trim()
      ? linesRaw
          .split(/\n/)
          .map((t: string, i: number) => ({ id: `l-${i}`, text: t.trim() }))
          .filter((l: { text: string }) => l.text)
      : [];

  const seriesId = entry.program_series_id;
  const badgeIds = Array.isArray(entry.program_badge_ids) ? entry.program_badge_ids : [];
  const compliance = entry.compliance;

  return {
    id: String(entry.id),
    status:
      entry.status === 'listed' ? 'catalog' : entry.status === 'withdrawn' ? 'withdrawn' : 'draft',
    orgKey: orgHint?.key || `${String(orgType).toLowerCase()}-${orgId}`,
    orgName,
    orgInitials: orgHint?.initials || orgName.slice(0, 2).toUpperCase(),
    orgCertified: true,
    euMc: Boolean(entry.is_eu_mc_declared),
    title: entry.title || '',
    description: entry.description || '',
    programmeMode: seriesId
      ? 'series'
      : programmeLines.length
        ? 'free_lines'
        : 'none',
    programmeLines,
    programmeSeries: seriesId
      ? {
          id: String(seriesId),
          label: `Série #${seriesId}`,
          competenceIds: badgeIds.map(String),
          competenceLabels: badgeIds.map((id: number) => `Badge #${id}`),
        }
      : undefined,
    durationHours: formatWorkloadHoursDisplay(entry.workload_hours),
    modality: MODALITY_FROM_BE[entry.participation_mode] || '',
    financement: FINANCE_FROM_BE[entry.financement_type] || '',
    prerequisites: entry.entry_requirements || '',
    languages: Array.isArray(entry.teaching_languages)
      ? entry.teaching_languages.map((c: string) => LANG_FROM_BE[c] || c)
      : ['Français'],
    practicalInfo: entry.practical_information || '',
    assessmentType: entry.assessment_type || '',
    jury: entry.has_jury == null ? false : Boolean(entry.has_jury),
    certificationCode: entry.targeted_certification_code || undefined,
    certificationTarget: entry.integration_option === 'integrated' ? 'block' : 'title',
    certificationRegistry: mapCertificationSnapshot(entry.targeted_certification_snapshot),
    imageDataUrl: entry.main_picture_url || undefined,
    schoolLabel: orgName,
    categoryBand: entry.targeted_certification_code
      ? `Titre · ${entry.targeted_certification_code}`
      : 'Certificat de l’organisme',
    eqfLevelDisplay: compliance?.displayed_level || (entry.is_eu_mc_declared ? 'non applicable' : undefined),
    workloadEcts: entry.workload_ects != null ? String(entry.workload_ects) : undefined,
    validityUnlimited: entry.validity_period_months == null,
    validityMonths:
      entry.validity_period_months != null ? String(entry.validity_period_months) : undefined,
    identityAtAssessment: IDENTITY_FROM_BE[entry.assessment_identity_check] || '',
    createdAt: entry.created_at || new Date().toISOString(),
    updatedAt: entry.updated_at || new Date().toISOString(),
    compliance: compliance
      ? {
          count: Number(compliance.count) || 0,
          missingElements: Array.isArray(compliance.missing_elements)
            ? compliance.missing_elements
            : [],
          displayedLevel: compliance.displayed_level,
        }
      : undefined,
  };
}

export function ficheToPayload(fiche: FormationFiche, org: CatalogueOrgRef): Record<string, any> {
  const payload: Record<string, any> = {
    primary_organization_type: org.type,
    primary_organization_id: org.id,
    is_eu_mc_declared: Boolean(fiche.euMc),
    title: fiche.title || null,
    description: fiche.description || null,
    workload_hours: parseHours(fiche.durationHours),
    participation_mode: fiche.modality ? MODALITY_TO_BE[fiche.modality] || null : null,
    financement_type: fiche.financement ? FINANCE_TO_BE[fiche.financement] || null : null,
    assessment_type: fiche.assessmentType || null,
    has_jury: fiche.jury === true,
    entry_requirements: fiche.prerequisites || null,
    practical_information: fiche.practicalInfo || null,
    teaching_languages: (fiche.languages || [])
      .map((l) => LANG_TO_BE[l] || l.toLowerCase().slice(0, 2))
      .filter(Boolean),
    assessment_identity_check: fiche.identityAtAssessment
      ? IDENTITY_TO_BE[fiche.identityAtAssessment] || null
      : null,
    workload_ects: fiche.workloadEcts ? Number(String(fiche.workloadEcts).replace(',', '.')) : null,
    validity_period_months:
      fiche.validityUnlimited || !fiche.validityMonths ? null : Number(fiche.validityMonths),
  };

  if (fiche.euMc) {
    payload.program_lines = null;
    if (fiche.programmeSeries?.id && /^\d+$/.test(fiche.programmeSeries.id)) {
      payload.program_series_id = Number(fiche.programmeSeries.id);
      const badges = (fiche.programmeSeries.competenceIds || [])
        .map((id) => Number(id))
        .filter((n) => !Number.isNaN(n));
      payload.program_badge_ids = badges.length ? badges : null;
      if (!badges.length) {
        payload.program_series_id = null;
        payload.program_badge_ids = null;
      }
    } else {
      payload.program_series_id = null;
      payload.program_badge_ids = null;
    }
  } else if (fiche.programmeMode === 'series' && fiche.programmeSeries?.id && /^\d+$/.test(fiche.programmeSeries.id)) {
    payload.program_series_id = Number(fiche.programmeSeries.id);
    payload.program_badge_ids = (fiche.programmeSeries.competenceIds || [])
      .map((id) => Number(id))
      .filter((n) => !Number.isNaN(n));
    payload.program_lines = null;
  } else {
    payload.program_series_id = null;
    payload.program_badge_ids = null;
    const text = (fiche.programmeLines || [])
      .map((l) => l.text.trim())
      .filter(Boolean)
      .join('\n');
    payload.program_lines = text || null;
  }

  if (fiche.certificationCode) {
    payload.targeted_certification_code = fiche.certificationCode.trim().toUpperCase();
    payload.integration_option = fiche.certificationTarget === 'block' ? 'integrated' : 'standalone';
  }

  return payload;
}

function mapCertificationSnapshot(
  snap: Record<string, any> | null | undefined
): FormationFiche['certificationRegistry'] {
  if (!snap || typeof snap !== 'object') return null;
  const label =
    snap.label || snap.intitule || snap.title || snap.official_title || snap.name || '';
  const level = String(snap.eqf_level || snap.level || snap.niveau || '');
  const certificateur = snap.certificateur || snap.certificate_authority || snap.organism || '';
  const blocks = Array.isArray(snap.blocks) ? snap.blocks.length : Number(snap.blocks) || 0;
  if (!label && !level) return null;
  return { label: String(label), level, certificateur: String(certificateur), blocks };
}

function parseHours(raw: string): number | null {
  const t = (raw || '').trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** P4.11 — afficher « 21 » / « 513,5 » (pas « 21.0 » / « 21,0 »). L’unité « h » est ajoutée à l’UI. */
export function formatWorkloadHoursDisplay(raw: unknown): string {
  if (raw == null || raw === '') return '';
  let s = String(raw).trim();
  s = s.replace(/\s*h(eures?)?\s*$/i, '').trim().replace(',', '.');
  const n = Number(s);
  if (!Number.isFinite(n)) return String(raw).trim();
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  // Trim trailing zeros after decimal (513.50 → 513,5)
  const trimmed = String(n).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  return trimmed.replace('.', ',');
}

/** P4.11 — contrôle du tableau : mots, jamais les codes serveur. */
const IMPORT_ISSUE_COPY: Record<string, string> = {
  missing_title: 'pas de titre',
  invalid_or_missing_title: 'pas de titre',
  invalid_or_missing_description: 'la description manque',
  invalid_or_missing_program_lines: 'le programme manque',
  invalid_or_missing_workload_hours: 'la durée manque',
  invalid_or_missing_participation_mode: 'la modalité manque',
  invalid_or_missing_financement_type: 'le financement manque',
  invalid_workload_hours: 'durée invalide',
  invalid_participation_mode: 'modalité invalide',
  invalid_financement_type: 'financement invalide',
  title_taken: 'ce titre existe déjà',
  title_duplicate_in_file: 'titre en double dans le tableau',
  duplicate_title: 'titre en double',
  certification_links_disabled: 'code RNCP/RS non lu (registre fermé)',
  certification_code_unknown: 'code certification inconnu',
  certification_registry_unavailable: 'registre indisponible',
};

export function humanizeImportIssues(issues: string[]): string {
  return issues
    .map((code) => IMPORT_ISSUE_COPY[code] || code.replace(/_/g, ' '))
    .filter(Boolean)
    .join(' · ');
}

export function analysisToPreview(
  fileName: string,
  analysis: Record<string, any>,
  importId: string
): CatalogueImportPreview {
  const lines = Array.isArray(analysis.lines) ? analysis.lines : [];
  const rows: CatalogueImportRowResult[] = lines.map((line: any) => {
    const attrs = line.attributes || {};
    const outcome = line.outcome;
    const state: CatalogueImportRowResult['state'] =
      outcome === 'listed' ? 'catalog' : outcome === 'draft' ? 'draft' : 'rejected';
    const issues = Array.isArray(line.issues) ? line.issues.map(String) : [];
    const detail = humanizeImportIssues(issues);
    return {
      line: line.line_number || 0,
      title: attrs.title || '(sans titre)',
      durationHours: formatWorkloadHoursDisplay(attrs.workload_hours),
      modality: attrs.participation_mode
        ? MODALITY_FROM_BE[attrs.participation_mode] || attrs.participation_mode
        : '',
      financement: attrs.financement_type
        ? FINANCE_FROM_BE[attrs.financement_type] || attrs.financement_type
        : '',
      state,
      detail: detail || undefined,
    };
  });

  const counts = analysis.counts || {};
  return {
    fileName,
    importId,
    columnsFound: Array.isArray(analysis.recognized_headers) ? analysis.recognized_headers : [],
    columnsIgnored: Array.isArray(analysis.unknown_headers) ? analysis.unknown_headers : [],
    rncpColumnIgnored: analysis.certification_links_enabled === false,
    rows,
    counts: {
      read: Number(counts.read) || rows.length,
      catalog: Number(counts.listed) || rows.filter((r) => r.state === 'catalog').length,
      draft: Number(counts.draft) || rows.filter((r) => r.state === 'draft').length,
      rejected: Number(counts.skipped) || rows.filter((r) => r.state === 'rejected').length,
    },
  };
}
