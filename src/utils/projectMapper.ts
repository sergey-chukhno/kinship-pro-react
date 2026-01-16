import { CreateProjectPayload, ProjectMemberAttribute, LinkAttribute, Tag, UpdateProjectPayload } from '../api/Projects';
import { ShowingPageType, User, Project } from '../types';

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
    if (showingPageType === 'pro') {
        return user.available_contexts?.companies?.[0]?.id;
    } else if (showingPageType === 'edu') {
        return user.available_contexts?.schools?.[0]?.id;
    } else if (showingPageType === 'teacher') {
        // If school selected, use it; otherwise return undefined (independent teacher)
        if (selectedSchoolId !== undefined) {
            return selectedSchoolId;
        }
        return undefined;
    }
    return undefined;
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
        status: 'coming' | 'in_progress' | 'ended';
        visibility: 'public' | 'private';
        pathway: string;
        tags: string;
        links: string;
        participants: string[];
        coResponsibles: string[];
        isPartnership: boolean;
        partner: string;
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

    // Get tag ID from pathway
    const tagIds: number[] = [];
    if (formData.pathway) {
        const tagId = getTagIdByPathway(formData.pathway, normalizedTags);
        if (tagId) {
            tagIds.push(tagId);
        }
    }

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

    // Build payload
    const payload: CreateProjectPayload = {
        context,
        organization_id: organizationId,
        project: {
            title: formData.title,
            description: formData.description,
            start_date: formData.startDate,
            end_date: formData.endDate,
            status: formData.status,
            private: isPrivate,
            participants_number: formData.participants.length + formData.coResponsibles.length,
            tag_ids: tagIds,
            skill_ids: [], // Empty as per user decision
            keyword_ids: keywords,
            partnership_id: formData.isPartnership && formData.partner ? parseInt(formData.partner) : null,
            project_members_attributes: projectMembers.length > 0 ? projectMembers : undefined,
            links_attributes: links.length > 0 ? links : undefined
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
        pathway: string;
        status: 'coming' | 'in_progress' | 'ended';
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

    // Get tag ID from pathway
    const tagIds: number[] = [];
    if (editForm.pathway) {
        const tagId = getTagIdByPathway(editForm.pathway, normalizedTags);
        if (tagId) {
            tagIds.push(tagId);
        }
    }

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
    console.log('🔍 [PATHWAY DEBUG] getPathwayFromTags called with:', tags);
    console.log('🔍 [PATHWAY DEBUG] tags type:', typeof tags);
    console.log('🔍 [PATHWAY DEBUG] tags is array:', Array.isArray(tags));
    console.log('🔍 [PATHWAY DEBUG] tags length:', tags?.length);
    
    if (!tags || tags.length === 0) {
        console.log('⚠️ [PATHWAY DEBUG] No tags found, returning undefined (no pathway)');
        return undefined;
    }
    
    const firstTag = tags[0];
    console.log('🔍 [PATHWAY DEBUG] First tag:', firstTag);
    console.log('🔍 [PATHWAY DEBUG] First tag type:', typeof firstTag);
    
    const tagName = firstTag?.name || firstTag;
    console.log('🔍 [PATHWAY DEBUG] Tag name extracted:', tagName);
    
    if (!tagName) {
        console.log('⚠️ [PATHWAY DEBUG] No tag name found, returning default "avenir"');
        return 'avenir';
    }
    
    const normalizedName = tagName.toLowerCase().trim();
    console.log('🔍 [PATHWAY DEBUG] Normalized name:', normalizedName);
    
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
    console.log('✅ [PATHWAY DEBUG] Mapped pathway:', mappedPathway);
    console.log('🔍 [PATHWAY DEBUG] Pathway map lookup:', pathwayMap[normalizedName] ? 'found' : 'not found, using normalized name');
    
    return mappedPathway;
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
    // Debug: Log API project data
    console.log('📦 [PATHWAY DEBUG] ========== Mapping API Project ==========');
    console.log('📦 [PATHWAY DEBUG] Project ID:', apiProject.id);
    console.log('📦 [PATHWAY DEBUG] Project Title:', apiProject.title);
    console.log('📦 [PATHWAY DEBUG] API Project tags:', apiProject.tags);
    console.log('📦 [PATHWAY DEBUG] API Project tags type:', typeof apiProject.tags);
    console.log('📦 [PATHWAY DEBUG] API Project tags is array:', Array.isArray(apiProject.tags));
    console.log('📦 [PATHWAY DEBUG] API Project tags length:', apiProject.tags?.length);
    
    // Determine pathway from tags (first tag is the pathway)
    const pathway = getPathwayFromTags(apiProject.tags || []);
    console.log('✅ [PATHWAY DEBUG] Final pathway assigned:', pathway);
    console.log('📦 [PATHWAY DEBUG] ===========================================');
    
    // Get organization name: priority 1) API primary_organization_name, 2) available_contexts, 3) fallback
    let organizationName = '';
    if (apiProject.primary_organization_name) {
        // Use organization name from API (most reliable)
        organizationName = apiProject.primary_organization_name;
    } else if (user?.available_contexts) {
        // Fallback to available_contexts
        if (showingPageType === 'pro' && user.available_contexts.companies && user.available_contexts.companies.length > 0) {
            organizationName = user.available_contexts.companies[0].name;
        } else if ((showingPageType === 'edu' || showingPageType === 'teacher') && user.available_contexts.schools && user.available_contexts.schools.length > 0) {
            organizationName = user.available_contexts.schools[0].name;
        }
    }
    
    // Final fallback if still empty
    if (!organizationName) {
        organizationName = showingPageType === 'pro' ? 'Organisation' : 'École';
    }
    
    // Map owner to responsible
    const owner = apiProject.owner;
    const responsible = owner ? {
        id: owner.id.toString(),
        name: owner.full_name || `${owner.first_name} ${owner.last_name}`,
        avatar: owner.avatar_url || '/default-avatar.png',
        profession: owner.job || owner.role || 'Membre',
        organization: organizationName,
        email: owner.email || '',
        role: apiProject.owner_organization_role || undefined, // Role in organization
        city: apiProject.owner_city || undefined, // City of organization
        is_deleted: owner.is_deleted || false // Preserve deleted status
    } : null;
    
    // Map co-owners
    const coResponsibles = (apiProject.co_owners || []).map((coOwner: any) => ({
        id: coOwner.id.toString(),
        name: coOwner.full_name || `${coOwner.first_name} ${coOwner.last_name}`,
        avatar: coOwner.avatar_url || '/default-avatar.png',
        profession: coOwner.job || 'Membre', // Profession réelle
        organization: organizationName,
        email: coOwner.email || '',
        role: coOwner.organization_role || undefined, // Role in organization
        city: coOwner.city || undefined, // City of organization
        is_deleted: coOwner.is_deleted || false // Preserve deleted status
    }));
    
    return {
        id: apiProject.id.toString(),
        title: apiProject.title,
        description: apiProject.description || '',
        status: apiProject.status,
        visibility: apiProject.private ? 'private' : 'public',
        pathway: pathway,
        organization: organizationName,
        owner: owner?.name || owner?.email || 'Inconnu',
        participants: apiProject.participants_number || apiProject.members_count || 0,
        badges: apiProject.badge_count || 0, // Use badge_count from API
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
        partner: apiProject.partnership_id ? {
            id: apiProject.partnership_id.toString(),
            name: '', // Would need to fetch partnership details
            logo: '',
            organization: ''
        } : undefined
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
    
    // Check if co-owner
    if (apiProject.co_owners && Array.isArray(apiProject.co_owners)) {
        const isCoOwner = apiProject.co_owners.some((co: any) => 
            co.id?.toString() === userIdStr
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
