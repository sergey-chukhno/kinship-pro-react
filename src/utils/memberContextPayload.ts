/**
 * Contexte membre projet (co-responsables / participants) — aligné sur l’API Rails.
 * @see project[co_responsible_contexts] / project[participant_contexts]
 */
export interface MemberContextPayload {
  user_id: number;
  member_context_type: string;
  member_context_id: number;
}

export function normalizePartnerTypeToMemberContextType(raw: string | undefined): 'School' | 'Company' {
  const t = (raw || '').toLowerCase();
  if (t.includes('school') || t === 'école' || t === 'ecole') return 'School';
  return 'Company';
}

/** Résout le partenaire (org) auquel appartient un contact dans un partenariat donné. */
export function findPartnerOrgContextForUser(
  userIdStr: string,
  partnershipId: string,
  availablePartnerships: any[]
): { member_context_type: string; member_context_id: number } | null {
  const pship = availablePartnerships.find((p: any) => String(p.id) === String(partnershipId));
  if (!pship?.partners) return null;
  for (const partner of pship.partners) {
    const contacts = partner.contact_users || [];
    if (contacts.some((c: any) => String(c.id) === userIdStr)) {
      return {
        member_context_type: normalizePartnerTypeToMemberContextType(partner.type),
        member_context_id: Number(partner.id)
      };
    }
  }
  return null;
}

export interface BuildMldsCoResponsibleContextsParams {
  coResponsibleIds: number[];
  partnershipCoResponsibles: Record<string, string[]>;
  formPartners: string[];
  availablePartnerships: any[];
  /** IDs de niveaux / classes (mldsOrganizations ou mldsSchoolLevelIds) */
  mldsOrgLevelIds: string[];
  availableLevels: any[];
  /** Sélection explicite par classe (gestion de projet) — sinon déduction via enseignants des niveaux */
  classCoResponsiblesByLevel?: Record<string, string[]>;
  schoolContextId: number | null | undefined;
}

/**
 * Un contexte par co-responsable : partenaire du partenariat en priorité, sinon établissement (School).
 */
export function buildMldsCoResponsibleContexts(params: BuildMldsCoResponsibleContextsParams): MemberContextPayload[] {
  const {
    coResponsibleIds,
    partnershipCoResponsibles,
    formPartners,
    availablePartnerships,
    mldsOrgLevelIds,
    availableLevels,
    classCoResponsiblesByLevel,
    schoolContextId
  } = params;

  const schoolId =
    schoolContextId != null && !Number.isNaN(Number(schoolContextId)) ? Number(schoolContextId) : null;

  const out: MemberContextPayload[] = [];

  for (const uid of coResponsibleIds) {
    const idStr = String(uid);
    let ctx: { member_context_type: string; member_context_id: number } | null = null;

    for (const pid of formPartners) {
      const sel = partnershipCoResponsibles[String(pid)] || [];
      if (!sel.includes(idStr)) continue;
      ctx = findPartnerOrgContextForUser(idStr, String(pid), availablePartnerships);
      if (ctx) break;
    }

    if (!ctx && classCoResponsiblesByLevel && schoolId != null) {
      for (const classId of Object.keys(classCoResponsiblesByLevel)) {
        const list = classCoResponsiblesByLevel[classId] || [];
        if (list.includes(idStr)) {
          ctx = { member_context_type: 'School', member_context_id: schoolId };
          break;
        }
      }
    }

    if (!ctx && schoolId != null) {
      for (const levelId of mldsOrgLevelIds) {
        const classItem = availableLevels.find((l: any) => String(l.id) === String(levelId));
        const teacherIds = (classItem?.teachers || []).map((t: any) => String(t.id));
        if (teacherIds.includes(idStr)) {
          ctx = { member_context_type: 'School', member_context_id: schoolId };
          break;
        }
      }
    }

    if (!ctx && schoolId != null) {
      ctx = { member_context_type: 'School', member_context_id: schoolId };
    }

    if (ctx) {
      out.push({ user_id: uid, ...ctx });
    }
  }

  return out;
}

export function buildSchoolParticipantContexts(
  participantIds: number[],
  schoolContextId: number | null | undefined
): MemberContextPayload[] {
  const sid =
    schoolContextId != null && !Number.isNaN(Number(schoolContextId)) ? Number(schoolContextId) : null;
  if (sid == null || participantIds.length === 0) return [];
  return participantIds.map(uid => ({
    user_id: uid,
    member_context_type: 'School',
    member_context_id: sid
  }));
}
