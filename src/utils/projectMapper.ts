import { CreateProjectPayload, ProjectMemberAttribute, LinkAttribute, Tag, UpdateProjectPayload } from '../api/Projects';
import { ShowingPageType, User, Project } from '../types';
import { getSelectedOrganizationId } from './contextUtils';

/**
 * Convert Base64 string to File object
 */
export const base64ToFile = (base64String: string, filename: string): File | null => {
    if (!base64String) return null;

    try {
        // Extract the base64 data and mime type
        const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return null;
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        // Convert base64 to binary
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // Create File object
        const blob = new Blob([byteArray], { type: mimeType });
        return new File([blob], filename, { type: mimeType });
    } catch (error) {
        console.error('Error converting base64 to file:', error);
        return null;
    }
};

/**
 * Map frontend showingPageType to backend context
 */
export const getContextFromPageType = (
    showingPageType: ShowingPageType
): 'company' | 'school' | 'teacher' | 'general' => {
    const mapping: Record<ShowingPageType, 'company' | 'school' | 'teacher' | 'general'> = {
        'pro': 'company',
        'edu': 'school',
        'teacher': 'teacher',
        'user': 'general'
    };

    return mapping[showingPageType] || 'general';
};

/**
 * Get organization ID from user context based on page type
 * For teachers, can optionally specify a selected school ID
 */
export const getOrganizationId = (
    user: User,
    showingPageType: ShowingPageType,
    selectedSchoolId?: number | undefined
): number | undefined => {
    // For teachers with explicit school selection, use it
    if (showingPageType === 'teacher' && selectedSchoolId !== undefined) {
        return selectedSchoolId;
    }
    
    // Use context-aware selection
    return getSelectedOrganizationId(user, showingPageType);
};

/**
 * Get organization type from page type
 */
export const getOrganizationType = (
    showingPageType: ShowingPageType
): 'school' | 'company' | undefined => {
    if (showingPageType === 'pro') {
        return 'company';
    } else if (showingPageType === 'edu' || showingPageType === 'teacher') {
        return 'school';
    }
    return undefined;
};

/**
 * Find tag ID by pathway name
 */
export const getTagIdByPathway = (pathway: string, tags: Tag[]): number | undefined => {
    // Validate tags is an array
    if (!tags || !Array.isArray(tags)) {
        console.warn('getTagIdByPathway: tags is not an array', tags);
        return undefined;
    }
    
    // Try to find by exact name match (case insensitive)
    const tag = tags.find(t =>
        t.name.toLowerCase() === pathway.toLowerCase() ||
        t.name_fr?.toLowerCase() === pathway.toLowerCase()
    );
    return tag?.id;
};

/**
 * Map frontend form data to backend payload
 */
export const mapFrontendToBackend = (
    formData: {
        title: string;
        description: string;
        startDate: string;
        endDate: string;
        organization: string;
        status: 'draft' | 'to_process' | 'coming' | 'in_progress' | 'ended';
        visibility: 'public' | 'private';
        pathway?: string;
        pathways?: string[];
        tags: string;
        links: string;
        participants: string[];
        coResponsibles: string[];
        isPartnership: boolean;
        createdBy?: string;
        /** Single partner (legacy) or use partners array */
        partner?: string;
        partners?: string[];
        schoolLevelIds?: string[];
    },
    context: 'company' | 'school' | 'teacher' | 'general',
    organizationId: number | undefined,
    tags: Tag[],
    currentUserId: string
): CreateProjectPayload => {
    // Normalize tags to ensure it's an array
    // Handle both Tag[] and { data: Tag[] } formats
    const normalizedTags: Tag[] = Array.isArray(tags) 
        ? tags 
        : (Array.isArray((tags as any)?.data) ? (tags as any).data : []);
    
    // Convert visibility: 'public' -> false, 'private' -> true
    const isPrivate = formData.visibility === 'private';

    // Get tag IDs from pathway(s) — un ou plusieurs parcours
    const tagIds: number[] = [];
    const pathwayNames = (formData.pathways && formData.pathways.length > 0)
        ? formData.pathways
        : (formData.pathway ? [formData.pathway] : []);
    pathwayNames.forEach((pathwayName: string) => {
        const tagId = getTagIdByPathway(pathwayName, normalizedTags);
        if (tagId && !tagIds.includes(tagId)) tagIds.push(tagId);
    });

    // Parse keywords from tags field (comma-separated)
    const keywords = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : [];

    // Build project members array
    const projectMembers: ProjectMemberAttribute[] = [];

    // Add participants as members
    formData.participants.forEach(userId => {
        projectMembers.push({
            user_id: parseInt(userId),
            role: 'member',
            status: 'confirmed'
        });
    });

    // Add co-responsibles as co_owners
    formData.coResponsibles.forEach(userId => {
        projectMembers.push({
            user_id: parseInt(userId),
            role: 'co_owner',
            status: 'confirmed'
        });
    });

    // Build links array
    const links: LinkAttribute[] = [];
    if (formData.links && formData.links.trim()) {
        links.push({
            name: 'Lien du projet', // Auto-generated name
            url: formData.links
        });
    }

    // Envoyer le statut tel quel (draft, coming, in_progress, etc.)
    const backendStatus: 'draft' | 'to_process' | 'coming' | 'in_progress' | 'ended' = formData.status;

    // Convert school level IDs from strings to numbers if provided
    const schoolLevelIds = formData.schoolLevelIds
        ? formData.schoolLevelIds.map(id => Number.parseInt(id, 10)).filter(id => !Number.isNaN(id))
        : undefined;

    // Build payload
    const payload: CreateProjectPayload = {
        context,
        organization_id: organizationId,
        project: {
            title: formData.title,
            description: formData.description,
            start_date: formData.startDate,
            end_date: formData.endDate,
            status: backendStatus,
            private: isPrivate,
            participants_number: formData.participants.length + formData.coResponsibles.length,
            tag_ids: tagIds,
            skill_ids: [], // Empty as per user decision
            keyword_ids: keywords,
            partnership_ids: (() => {
                if (!formData.isPartnership) return undefined;
                const raw = (formData.partners?.length ? formData.partners : (formData.partner ? [formData.partner] : []));
                const ids = raw.map((id: string) => Number.parseInt(id, 10)).filter((id: number) => !Number.isNaN(id));
                return ids.length > 0 ? ids : undefined;
            })(),
            project_members_attributes: projectMembers.length > 0 ? projectMembers : undefined,
            links_attributes: links.length > 0 ? links : undefined,
            school_level_ids: schoolLevelIds
        }
    };

    return payload;
};

/**
 * Map edit form data to backend update payload
 * Transforms frontend edit form to backend UpdateProjectPayload format
 */
export const mapEditFormToBackend = (
    editForm: {
        title: string;
        description: string;
        tags: string[];
        startDate: string;
        endDate: string;
        pathway?: string;
        pathways?: string[];
        status: 'draft' | 'to_process' | 'coming' | 'in_progress' | 'ended';
        visibility: 'public' | 'private';
    },
    tags: Tag[],
    project: Project
): UpdateProjectPayload => {
    // Normalize tags to ensure it's an array
    // Handle both Tag[] and { data: Tag[] } formats
    const normalizedTags: Tag[] = Array.isArray(tags) 
        ? tags 
        : (Array.isArray((tags as any)?.data) ? (tags as any).data : []);
    
    // Convert visibility: 'public' -> false, 'private' -> true
    const isPrivate = editForm.visibility === 'private';

    // Get tag IDs from pathway(s) — un ou plusieurs parcours
    const tagIds: number[] = [];
    const pathwayNames = (editForm.pathways && editForm.pathways.length > 0)
        ? editForm.pathways
        : (editForm.pathway ? [editForm.pathway] : []);
    pathwayNames.forEach((pathwayName: string) => {
        const tagId = getTagIdByPathway(pathwayName, normalizedTags);
        if (tagId && !tagIds.includes(tagId)) tagIds.push(tagId);
    });

    // Parse keywords from tags array
    const keywords = editForm.tags.filter(t => t.trim().length > 0);

    // Build payload
    const payload: UpdateProjectPayload = {
        project: {
            title: editForm.title,
            description: editForm.description,
            start_date: editForm.startDate,
            end_date: editForm.endDate,
            status: editForm.status,
            private: isPrivate,
            tag_ids: tagIds.length > 0 ? tagIds : undefined,
            keyword_ids: keywords.length > 0 ? keywords : undefined
        }
    };

    // Note: editImagePreview will be passed separately and converted in handleSaveEdit

    return payload;
};

/**
 * Validate image size (max 1MB)
 */
export const validateImageSize = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 1024 * 1024; // 1MB
    if (file.size > maxSize) {
        return { valid: false, error: 'L\'image doit faire moins de 1 Mo' };
    }
    return { valid: true };
};

/**
 * Validate image format
 */
export const validateImageFormat = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Format d\'image non supporté (JPEG, PNG, GIF, WebP, SVG uniquement)'
        };
    }
    return { valid: true };
};

/**
 * Validate all images
 */
export const validateImages = (
    mainImage: File | null,
    additionalImages: File[]
): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validate main image
    if (mainImage) {
        const sizeValidation = validateImageSize(mainImage);
        if (!sizeValidation.valid) {
            errors.push(`Image principale: ${sizeValidation.error}`);
        }

        const formatValidation = validateImageFormat(mainImage);
        if (!formatValidation.valid) {
            errors.push(`Image principale: ${formatValidation.error}`);
        }
    }

    // Validate additional images
    additionalImages.forEach((image, index) => {
        const sizeValidation = validateImageSize(image);
        if (!sizeValidation.valid) {
            errors.push(`Image ${index + 1}: ${sizeValidation.error}`);
        }

        const formatValidation = validateImageFormat(image);
        if (!formatValidation.valid) {
            errors.push(`Image ${index + 1}: ${formatValidation.error}`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Map backend tag name to frontend pathway value
 * Backend tags: "Santé", "Citoyen", "EAC", "Créativité", "Avenir", "Autre"
 * Frontend pathways: "sante", "citoyen", "eac", "creativite", "avenir", "other"
 */
const getPathwayFromTags = (tags: any[]): string | undefined => {
    if (!tags || tags.length === 0) {
        return undefined;
    }
    
    const firstTag = tags[0];
    const tagName = firstTag?.name || firstTag;
    if (!tagName) {
        return 'avenir';
    }
    
    const normalizedName = tagName.toLowerCase().trim();
    
    // Map French tag names to frontend pathway values
    const pathwayMap: Record<string, string> = {
        'avenir': 'avenir',
        'citoyen': 'citoyen',
        'santé': 'sante',
        'sante': 'sante',
        'eac': 'eac',
        'créativité': 'creativite',
        'creativite': 'creativite',
        'mlds': 'mlds',
        'faj co': 'faj_co',
        'faj_co': 'faj_co',
        'autre': 'other'
    };
    
    const mappedPathway = pathwayMap[normalizedName] || normalizedName;
    
    return mappedPathway;
};

/**
 * Return all pathway display names from API tags (for multi-pathway display)
 */
const getPathwaysFromTags = (tags: any[]): string[] => {
    if (!tags || tags.length === 0) return [];
    return tags.map((tag: any) => {
        const name = tag?.name_fr || tag?.name || tag;
        return typeof name === 'string' ? name.trim() : '';
    }).filter((name: string) => name.length > 0);
};

/**
 * Map keywords (free-form tags) from API to frontend tags array
 * Keywords are the tags entered by users in the "Tags" field
 */
const mapKeywordsToTags = (keywords: any[]): string[] => {
    if (!keywords || keywords.length === 0) return [];
    
    return keywords.map((k: any) => {
        // Handle both object format {id, name, ...} and string format
        if (typeof k === 'string') {
            return k.trim();
        }
        // Extract name from keyword object
        const name = k.name || k;
        return typeof name === 'string' ? name.trim() : String(name).trim();
    }).filter((tag: string) => tag.length > 0); // Remove empty tags
};

/**
 * Map API project data to frontend Project format
 * Transforms backend API response to frontend Project interface
 */
export const mapApiProjectToFrontendProject = (apiProject: any, showingPageType: ShowingPageType, user?: User): Project => {
    // Determine pathway from tags (first tag is the pathway)
    const pathway = getPathwayFromTags(apiProject.tags || []);
    
    // Get project's organization name (for project.organization field)
    // This can fallback to user's organization if primary_organization_name is missing
    let projectOrganizationName = '';
    if (apiProject.primary_organization_name) {
        // Use organization name from API (most reliable)
        projectOrganizationName = apiProject.primary_organization_name;
    } else if (user?.available_contexts) {
        // Fallback to available_contexts for project organization only
        if (showingPageType === 'pro' && user.available_contexts.companies && user.available_contexts.companies.length > 0) {
            projectOrganizationName = user.available_contexts.companies[0].name;
        } else if ((showingPageType === 'edu' || showingPageType === 'teacher') && user.available_contexts.schools && user.available_contexts.schools.length > 0) {
            projectOrganizationName = user.available_contexts.schools[0].name;
        }
    }
    
    // Final fallback if still empty
    if (!projectOrganizationName) {
        projectOrganizationName = showingPageType === 'pro' ? 'Organisation' : 'École';
    }
    
    // Get owner's organization name (for responsible.organization field)
    // IMPORTANT: Only use primary_organization_name, never fallback to current user's org
    // This ensures we show the project owner's actual organization, not the viewer's organization
    const ownerOrganizationName = apiProject.primary_organization_name || '';
    
    // Map owner to responsible
    const owner = apiProject.owner;
    const responsible = owner ? {
        id: owner.id.toString(),
        name: owner.full_name || `${owner.first_name} ${owner.last_name}`,
        avatar: owner.avatar_url || '/default-avatar.png',
        profession: owner.job || owner.role || 'Membre',
        organization: ownerOrganizationName, // Use owner's org, not project org or viewer's org
        email: owner.email || '',
        role: apiProject.owner_organization_role || undefined, // Role in organization
        role_in_system: owner.role || undefined, // System role (directeur_ecole, principal, etc.)
        city: apiProject.owner_city || undefined, // City of organization
        is_deleted: owner.is_deleted || false // Preserve deleted status
    } : null;
    
    // Map co-owners: use partner_organization.name when organization_source === 'partner'
    const coResponsibles = (apiProject.co_owners || []).map((coOwner: any) => ({
        id: coOwner.id.toString(),
        name: coOwner.full_name || `${coOwner.first_name} ${coOwner.last_name}`,
        avatar: coOwner.avatar_url || '/default-avatar.png',
        profession: coOwner.job || 'Membre', // Profession réelle
        organization: coOwner.organization_source === 'partner' && coOwner.partner_organization?.name
            ? coOwner.partner_organization.name
            : ownerOrganizationName,
        email: coOwner.email || '',
        role: coOwner.organization_role || undefined, // Role in organization
        role_in_system: coOwner.role_in_system || undefined, // System role (directeur_ecole, principal, etc.)
        city: coOwner.city || undefined, // City of organization
        is_deleted: coOwner.is_deleted || false // Preserve deleted status
    }));
    
    const pathwaysFromApi = getPathwaysFromTags(apiProject.tags || []);

    return {
        id: apiProject.id.toString(),
        title: apiProject.title,
        description: apiProject.description || '',
        status: apiProject.status,
        visibility: apiProject.private ? 'private' : 'public',
        pathway: pathway,
        pathways: pathwaysFromApi.length > 0 ? pathwaysFromApi : (pathway ? [pathway] : undefined),
        organization: projectOrganizationName, // Project's organization (can fallback to user's org)
        owner: owner?.name || owner?.email || 'Inconnu',
        // Prefer members_count (owner + confirmed only) for display; fallback to participants_number for compatibility
        participants: (apiProject.members_count != null && apiProject.members_count !== undefined) ? apiProject.members_count : (apiProject.participants_number ?? 0),
        badges: apiProject.badge_count || 0, // Use badge_count from API
        pendingRequests: apiProject.pending_participation_requests_count || 0, // Number of pending participation requests
        startDate: apiProject.start_date ? apiProject.start_date.split('T')[0] : '',
        endDate: apiProject.end_date ? apiProject.end_date.split('T')[0] : '',
        image: apiProject.main_picture_url || '',
        additionalPhotos: apiProject.additional_pictures_urls || [], // Map additional pictures from API
        tags: mapKeywordsToTags(apiProject.keywords || []), // Map keywords (free-form tags), not tags (pathways)
        links: apiProject.links?.[0]?.url || '',
        progress: 0, // Not provided by current API
        members: [], // Not provided by current API
        events: [], // Not provided by current API
        badges_list: [], // Not provided by current API
        responsible: responsible,
        coResponsibles: coResponsibles.length > 0 ? coResponsibles : [],
        partner: (() => {
            const details = apiProject.partnership_details;
            if (!details || !Array.isArray(details) || details.length === 0) {
                return undefined;
            }
            const first = details[0];
            const firstOrg = first?.partner_organizations?.[0];
            return {
                id: first.partnership_id?.toString() || '',
                name: first.partnership_name || (firstOrg?.name ? `Partenariat ${firstOrg.name}` : ''),
                logo: firstOrg?.logo_url || '',
                organization: firstOrg?.name || ''
            };
        })(),
        partners: (() => {
            const details = apiProject.partnership_details;
            if (!details || !Array.isArray(details) || details.length === 0) {
                return undefined;
            }
            return details.map((d: any) => {
                const firstOrg = d?.partner_organizations?.[0];
                return {
                    id: d.partnership_id?.toString() || '',
                    name: d.partnership_name || (firstOrg?.name ? `Partenariat ${firstOrg.name}` : ''),
                    logo: firstOrg?.logo_url || '',
                    organization: firstOrg?.name || ''
                };
            });
        })(),
        mlds_information: apiProject.mlds_information || undefined, // Map MLDS information
        rs: apiProject.rs || undefined // Map RS field
    };
};

/**
 * Get user's role in a project
 * Returns: 'owner' | 'co-owner' | 'admin' | 'participant avec droit de badges' | 'participant' | null
 */
export const getUserProjectRole = (
    apiProject: any,
    currentUserId: string | number | undefined
): string | null => {
    if (!apiProject || !currentUserId) return null;
    
    const userIdStr = currentUserId.toString();
    
    // Check if owner
    if (apiProject.owner?.id?.toString() === userIdStr) {
        return 'owner';
    }
    
    // Check if co-owner (support both co.id and co.user?.id for API structure)
    if (apiProject.co_owners && Array.isArray(apiProject.co_owners)) {
        const isCoOwner = apiProject.co_owners.some((co: any) =>
            co.id?.toString() === userIdStr || co.user?.id?.toString() === userIdStr
        );
        if (isCoOwner) {
            return 'co-owner';
        }
    }
    
    // Check in project_members
    if (apiProject.project_members && Array.isArray(apiProject.project_members)) {
        const member = apiProject.project_members.find((m: any) => 
            m.user?.id?.toString() === userIdStr && m.status === 'confirmed'
        );
        
        if (member) {
            if (member.role === 'admin') {
                return 'admin';
            }
            if (member.can_assign_badges_in_project) {
                return 'participant avec droit de badges';
            }
            return 'participant';
        }
    }
    
    return null;
};
