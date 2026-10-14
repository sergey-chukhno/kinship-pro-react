import {
  CatalogueImportPreview,
  CatalogueImportRowResult,
  CatalogueServerFlags,
  FormationFiche,
} from '../types/formationCatalogue';
import {
  getFiche as storeGet,
  listFiches,
  upsertFiche,
} from '../utils/formationCatalogueStore';

/** Mock flags — FE n’écrit jamais ces valeurs ; le serveur fera foi. */
let mockFlags: CatalogueServerFlags = {
  eu_mc_gate: { allowed: true },
  certification_links_enabled: false,
};

/** Tests / smoke : basculer le gate sans toucher l’UI. */
export function __setMockCatalogueFlags(flags: Partial<CatalogueServerFlags>) {
  mockFlags = {
    ...mockFlags,
    ...flags,
    eu_mc_gate: { ...mockFlags.eu_mc_gate, ...(flags.eu_mc_gate || {}) },
  };
}

export function __getMockCatalogueFlags(): CatalogueServerFlags {
  return mockFlags;
}

export async function getCatalogueFlags(): Promise<CatalogueServerFlags> {
  return { ...mockFlags, eu_mc_gate: { ...mockFlags.eu_mc_gate } };
}

export async function getCatalogue(): Promise<FormationFiche[]> {
  return listFiches();
}

export async function getCatalogueFiche(id: string): Promise<FormationFiche | null> {
  return storeGet(id) || null;
}

export async function saveCatalogueFiche(fiche: FormationFiche): Promise<FormationFiche> {
  return upsertFiche(fiche);
}

const REQUIRED = ['titre', 'description', 'programme', 'durée', 'duree', 'modalité', 'modalite', 'financement'] as const;

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function findCol(headers: string[], ...aliases: string[]): number {
  const norm = headers.map(normalizeHeader);
  for (const a of aliases) {
    const i = norm.indexOf(normalizeHeader(a));
    if (i >= 0) return i;
  }
  return -1;
}

/** Parse CSV simple (virgule) — mock P4.11. */
export function parseCatalogueCsv(text: string, fileName: string): CatalogueImportPreview {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return {
      fileName,
      columnsFound: [],
      columnsIgnored: [],
      rncpColumnIgnored: false,
      rows: [],
      counts: { read: 0, catalog: 0, draft: 0, rejected: 0 },
    };
  }

  const headers = lines[0].split(';').length > 1 ? lines[0].split(';') : lines[0].split(',');
  const titleIdx = findCol(headers, 'Titre', 'title');
  if (titleIdx < 0) {
    throw new Error('Le fichier n’a pas de colonne « Titre ». Ajoutez-la, ou partez du modèle.');
  }

  const descIdx = findCol(headers, 'Description');
  const progIdx = findCol(headers, 'Programme');
  const durIdx = findCol(headers, 'Durée en heures', 'Duree en heures', 'Durée', 'Duree');
  const modIdx = findCol(headers, 'Modalité', 'Modalite');
  const finIdx = findCol(headers, 'Financement');
  const orgIdx = findCol(headers, 'Organisation', 'Organization');
  const rncpIdx = findCol(headers, 'Code RNCP/RS', 'RNCP', 'Code RNCP');

  const knownIdx = [titleIdx, descIdx, progIdx, durIdx, modIdx, finIdx, orgIdx].filter((i) => i >= 0);
  const known = new Set(knownIdx.map((i) => headers[i]));
  const columnsIgnored = headers.filter((h, i) => !known.has(h) && i !== rncpIdx);
  const rncpColumnIgnored = rncpIdx >= 0 && !mockFlags.certification_links_enabled;

  const seenTitles = new Set<string>();
  const rows: CatalogueImportRowResult[] = [];

  for (let i = 1; i < lines.length; i++) {
    const sep = lines[i].includes(';') ? ';' : ',';
    const cells = lines[i].split(sep).map((c) => c.trim());
    const title = cells[titleIdx] || '';
    const durationHours = durIdx >= 0 ? cells[durIdx] || '' : '';
    const modality = modIdx >= 0 ? cells[modIdx] || '' : '';
    const financement = finIdx >= 0 ? cells[finIdx] || '' : '';
    const description = descIdx >= 0 ? cells[descIdx] || '' : '';
    const programme = progIdx >= 0 ? cells[progIdx] || '' : '';
    const orgName = orgIdx >= 0 ? cells[orgIdx] || '' : '';

    const modalityOk = ['Présentiel', 'Presentiel', 'Distanciel', 'Hybride'].some(
      (m) => normalizeHeader(m) === normalizeHeader(modality)
    );

    let state: CatalogueImportRowResult['state'] = 'catalog';
    let detail: string | undefined;

    if (!title) {
      state = 'rejected';
      detail = 'pas de titre';
    } else if (seenTitles.has(normalizeHeader(title))) {
      state = 'rejected';
      detail = 'même titre qu’une ligne précédente';
    } else if (!description || !programme || !durationHours || !modality || !financement || !modalityOk) {
      state = 'draft';
      const missing: string[] = [];
      if (!description) missing.push('la description manque');
      if (!programme) missing.push('le programme manque');
      if (!durationHours) missing.push('la durée manque');
      if (!modality) missing.push('la modalité manque');
      else if (!modalityOk) missing.push(`modalité « ${modality} » non reconnue`);
      if (!financement) missing.push('le financement manque');
      detail = missing.join(' · ');
    }

    if (title) seenTitles.add(normalizeHeader(title));

    rows.push({
      line: i + 1,
      title: title || '(sans titre)',
      durationHours,
      modality,
      financement,
      orgName: orgName || undefined,
      state,
      detail,
    });
  }

  const counts = {
    read: rows.length,
    catalog: rows.filter((r) => r.state === 'catalog').length,
    draft: rows.filter((r) => r.state === 'draft').length,
    rejected: rows.filter((r) => r.state === 'rejected').length,
  };

  const columnsFound = headers.filter((_, i) => knownIdx.includes(i));
  if (rncpIdx >= 0 && !rncpColumnIgnored) {
    columnsFound.push(headers[rncpIdx]);
  }

  return {
    fileName,
    columnsFound,
    columnsIgnored: [
      ...columnsIgnored,
      ...(rncpColumnIgnored && rncpIdx >= 0 ? [headers[rncpIdx]] : []),
    ],
    rncpColumnIgnored,
    rows,
    counts,
  };
}

export async function commitCatalogueImport(
  preview: CatalogueImportPreview,
  org: { key: string; name: string; initials: string }
): Promise<FormationFiche[]> {
  const now = new Date().toISOString();
  const created: FormationFiche[] = [];
  for (const row of preview.rows) {
    if (row.state === 'rejected') continue;
    const modalityNorm = normalizeHeader(row.modality);
    const modality =
      modalityNorm.startsWith('dist')
        ? 'distanciel'
        : modalityNorm.startsWith('hybr')
          ? 'hybride'
          : modalityNorm
            ? 'presentiel'
            : '';
    const rowOrg = row.orgName?.trim() || org.name;
    const fiche: FormationFiche = {
      id: `fiche-import-${Date.now()}-${row.line}`,
      status: row.state === 'catalog' ? 'catalog' : 'draft',
      orgKey: org.key,
      orgName: rowOrg,
      orgInitials: org.initials,
      orgCertified: true,
      euMc: false,
      title: row.title,
      description: row.state === 'catalog' ? 'Importée depuis le tableau.' : '',
      programmeMode: row.state === 'catalog' ? 'free_lines' : 'none',
      programmeLines:
        row.state === 'catalog' ? [{ id: 'p1', text: 'Programme importé' }] : [],
      durationHours: row.durationHours,
      modality: modality as FormationFiche['modality'],
      financement: (row.financement as FormationFiche['financement']) || '',
      prerequisites: '',
      languages: ['Français'],
      practicalInfo: '',
      assessmentType: '',
      jury: false,
      schoolLabel: rowOrg.split('—')[0]?.trim() || rowOrg,
      categoryBand: 'Certificat de l’organisme',
      createdAt: now,
      updatedAt: now,
    };
    created.push(upsertFiche(fiche));
  }
  return created;
}

export const CATALOGUE_CSV_TEMPLATE = `Titre;Description;Programme;Durée en heures;Modalité;Financement
Devenir journaliste;Titre Journaliste;4 blocs RNCP;513,5;Présentiel;CPF
Assertivité;Communication;Savoir oser;14;Présentiel;OPCO
`;

async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error || new Error('Lecture fichier impossible'));
    reader.readAsText(file);
  });
}

/**
 * Aperçu import — le front envoie le fichier tel quel (CSV ou .xlsx).
 * Mock : CSV parsé localement ; .xlsx = réponse serveur fictive (même forme que l’API Sergey).
 * Quand l’API sera branchée : FormData POST, sans conversion côté FE.
 */
export async function previewCatalogueUpload(file: File): Promise<CatalogueImportPreview> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return mockServerExcelPreview(file.name);
  }
  const text = await readFileAsText(file);
  return parseCatalogueCsv(text, file.name);
}

/** Simule le parse Excel côté serveur (ticket 62 §6) — sans refus ni conversion FE. */
function mockServerExcelPreview(fileName: string): CatalogueImportPreview {
  const rows: CatalogueImportRowResult[] = [
    {
      line: 2,
      title: 'Import Excel Complet',
      durationHours: '21',
      modality: 'Présentiel',
      financement: 'CPF',
      orgName: 'Atelier Numérique Formation',
      state: 'catalog',
    },
    {
      line: 3,
      title: 'Import Excel Draft',
      durationHours: '',
      modality: 'Hybride',
      financement: 'OPCO',
      orgName: 'Atelier Numérique Formation',
      state: 'draft',
      detail: 'la description manque · le programme manque · la durée manque',
    },
  ];
  return {
    fileName,
    columnsFound: [
      'Titre',
      'Description',
      'Programme',
      'Durée en heures',
      'Modalité',
      'Financement',
      'Organisation',
    ],
    columnsIgnored: [],
    rncpColumnIgnored: false,
    rows,
    counts: {
      read: rows.length,
      catalog: rows.filter((r) => r.state === 'catalog').length,
      draft: rows.filter((r) => r.state === 'draft').length,
      rejected: 0,
    },
  };
}
