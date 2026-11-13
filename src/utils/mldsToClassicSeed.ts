import { displayPersonName } from './civilDataErased';
import { MemberContextPayload, normalizePartnerTypeToMemberContextType } from './memberContextPayload';
import { resolveProjectMemberUserId } from './projectPermissions';

/** Données d’un projet MLDS reprises pour créer un brouillon classique. */
export interface MldsClassicSeed {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  /** Compétences développées par l’action → acquis d’apprentissage. */
  learningOutcomes: string;
  partnershipIds: number[];
  partnershipNames: string[];
  coResponsibleIds: number[];
  coResponsibleNames: string[];
  coResponsibleContexts: MemberContextPayload[];
  /** URL de l’image principale, vide s’il n’y en a pas. */
  mainPictureUrl: string;
  /** Identifiant signé ActiveStorage, pour recopier le fichier sans le retélécharger. */
  mainPictureSignedId: string;
  /** Organisation porteuse du projet MLDS — le brouillon classique reste sur cette structure. */
  organizationId: number | null;
  organizationType: 'School' | 'Company' | '';
  organizationName: string;
}

function signedBlobId(url: string): string {
  const match = /\/rails\/active_storage\/blobs\/(?:redirect|proxy)\/([^/?]+)/.exec(url);
  return match?.[1] ? decodeURIComponent(match[1]) : '';
}

function dateOnly(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  return value.split('T')[0];
}

function uniqueNumbers(values: unknown[]): number[] {
  const ids: number[] = [];
  values.forEach((value) => {
    const id = Number(value);
    if (Number.isFinite(id) && id > 0 && !ids.includes(id)) ids.push(id);
  });
  return ids;
}

function contextType(raw: string): string {
  if (raw === 'School' || raw === 'Company') return raw;
  return normalizePartnerTypeToMemberContextType(raw);
}

function coPeople(raw: any): any[] {
  if (Array.isArray(raw?.co_responsibles) && raw.co_responsibles.length) return raw.co_responsibles;
  if (Array.isArray(raw?.co_owners) && raw.co_owners.length) return raw.co_owners;
  if (!Array.isArray(raw?.project_members)) return [];
  return raw.project_members.filter((member: any) => member?.role === 'co_owner' || member?.is_co_owner);
}

function personLabel(person: any): string {
  const user = person?.user || person;
  return displayPersonName(user?.full_name, user?.first_name, user?.last_name, user?.email || 'Co-responsable');
}

function coResponsiblesFromApi(raw: any): Pick<MldsClassicSeed, 'coResponsibleIds' | 'coResponsibleNames' | 'coResponsibleContexts'> {
  const ownerId =
    resolveProjectMemberUserId(raw?.owner) ??
    (raw?.owner_id != null ? String(raw.owner_id) : undefined);
  const ids: number[] = [];
  const names: string[] = [];
  const contexts: MemberContextPayload[] = [];

  coPeople(raw).forEach((person) => {
    const idStr = resolveProjectMemberUserId(person);
    const id = Number(idStr);
    if (!idStr || !Number.isFinite(id) || id <= 0) return;
    if (ownerId && idStr === ownerId) return;
    if (ids.includes(id)) return;
    ids.push(id);
    names.push(personLabel(person));

    const added = person?.added_from_organization;
    const ctxId = Number(added?.organization_id);
    const ctxType = added?.organization_type;
    if (typeof ctxType === 'string' && ctxType && Number.isFinite(ctxId) && ctxId > 0) {
      contexts.push({
        user_id: id,
        member_context_type: contextType(ctxType),
        member_context_id: ctxId,
      });
    }
  });

  return { coResponsibleIds: ids, coResponsibleNames: names, coResponsibleContexts: contexts };
}

function partnershipLabel(detail: any, id: number): string {
  const firstOrg = detail?.partner_organizations?.[0];
  const fromName = typeof detail?.partnership_name === 'string'
    ? detail.partnership_name.replace(/\s+Partnership$/, '').trim()
    : '';
  return firstOrg?.name || fromName || `Partenariat ${id}`;
}

function partnershipsFromApi(raw: any): Pick<MldsClassicSeed, 'partnershipIds' | 'partnershipNames'> {
  if (Array.isArray(raw?.partnership_details) && raw.partnership_details.length) {
    const ids: number[] = [];
    const names: string[] = [];
    raw.partnership_details.forEach((detail: any) => {
      const id = Number(detail?.partnership_id);
      if (!Number.isFinite(id) || id <= 0 || ids.includes(id)) return;
      ids.push(id);
      names.push(partnershipLabel(detail, id));
    });
    return { partnershipIds: ids, partnershipNames: names };
  }

  const ids = Array.isArray(raw?.partnership_ids) && raw.partnership_ids.length
    ? uniqueNumbers(raw.partnership_ids)
    : uniqueNumbers([raw?.partnership_id ?? raw?.partnership?.id].filter((id) => id != null));
  return {
    partnershipIds: ids,
    partnershipNames: ids.map((id) => `Partenariat ${id}`),
  };
}

function sourceOrganization(raw: any): Pick<MldsClassicSeed, 'organizationId' | 'organizationType' | 'organizationName'> {
  const id = Number(raw?.primary_organization_id);
  const type = raw?.primary_organization_type === 'Company' || raw?.primary_organization_type === 'School'
    ? raw.primary_organization_type
    : '';
  return {
    organizationId: Number.isFinite(id) && id > 0 ? id : null,
    organizationType: type,
    organizationName: typeof raw?.primary_organization_name === 'string' ? raw.primary_organization_name.trim() : '',
  };
}

export function buildMldsClassicSeed(raw: any): MldsClassicSeed {
  const mlds = raw?.mlds_information;
  const competencies = typeof mlds?.competencies_developed === 'string' ? mlds.competencies_developed.trim() : '';
  const co = coResponsiblesFromApi(raw);
  const partnerships = partnershipsFromApi(raw);
  const organization = sourceOrganization(raw);
  return {
    title: typeof raw?.title === 'string' ? raw.title : '',
    description: typeof raw?.description === 'string' ? raw.description : '',
    startDate: dateOnly(raw?.start_date),
    endDate: dateOnly(raw?.end_date),
    learningOutcomes: competencies,
    partnershipIds: partnerships.partnershipIds,
    partnershipNames: partnerships.partnershipNames,
    coResponsibleIds: co.coResponsibleIds,
    coResponsibleNames: co.coResponsibleNames,
    coResponsibleContexts: co.coResponsibleContexts,
    mainPictureUrl: typeof raw?.main_picture_url === 'string' ? raw.main_picture_url.trim() : '',
    mainPictureSignedId: signedBlobId(typeof raw?.main_picture_url === 'string' ? raw.main_picture_url.trim() : ''),
    organizationId: organization.organizationId,
    organizationType: organization.organizationType,
    organizationName: organization.organizationName,
  };
}

function bulletList(items: string[]): string {
  return items.length ? items.map((item) => `• ${item}`).join('\n') : 'Aucun';
}

export function formatMldsClassicRecap(seed: MldsClassicSeed): string {
  return [
    `Un brouillon de projet classique sera créé : « ${seed.title || 'Sans titre'} ».`,
    '',
    'Description',
    seed.description || '—',
    '',
    'Acquis d’apprentissage',
    seed.learningOutcomes || '—',
    '',
    'Mode de participation',
    'Présentiel',
    '',
    'Image principale',
    seed.mainPictureUrl ? 'Reprise' : 'Aucune',
    '',
    'Partenariats',
    bulletList(seed.partnershipNames),
    '',
    'Co-responsables',
    bulletList(seed.coResponsibleNames),
  ].join('\n');
}
