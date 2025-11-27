import apiClient from './config';

// Types for API requests and responses
export interface Tag {
    id: number;
    name: string;
    name_fr?: string;
}

export interface Partnership {
    id: number;
    name: string;
    status: string;
    organizations: Array<{ id: number; name: string; type: string }>;
}

export interface OrganizationMember {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url: string | null;
}

export interface ProjectMemberAttribute {
    user_id: number;
    role: 'member' | 'admin' | 'co_owner';
    status: 'pending' | 'confirmed';
    can_assign_badges_in_project?: boolean;
}

export interface LinkAttribute {
    name: string;
    url: string;
}

export interface CreateProjectPayload {
    context: 'company' | 'school' | 'teacher' | 'general';
    organization_id?: number;
    project: {
        title: string;
        description: string;
        start_date: string;
        end_date: string;
        participants_number?: number;
        private: boolean;
        status: 'coming' | 'in_progress' | 'ended';
        school_level_ids?: number[];
        skill_ids?: number[];
        tag_ids?: number[];
        company_ids?: number[];
        keyword_ids?: string[];
        partnership_id?: number | null;
        project_members_attributes?: ProjectMemberAttribute[];
        links_attributes?: LinkAttribute[];
    };
}

export interface CreateProjectResponse {
    id: number;
    title: string;
    description: string;
    status: string;
    start_date: string;
    end_date: string;
    members_count: number;
    teams_count: number;
    links: Array<{
        id: number;
        name: string;
        url: string;
        created_at: string;
        updated_at: string;
    }>;
    project_members: Array<{
        id: number;
        status: string;
        role: string;
        user: OrganizationMember;
    }>;
    keywords: Array<{
        id: number;
        name: string;
    }>;
    owner: any;
    skills: any[];
    tags: any[];
    school_levels: any[];
}

/**
 * Fetch available tags (pathways)
 */
export const getTags = async (): Promise<Tag[]> => {
    const response = await apiClient.get('/api/v1/tags');
    return response.data;
};

/**
 * Fetch partnerships for an organization
 */
export const getPartnerships = async (
    organizationId: number,
    organizationType: 'school' | 'company'
): Promise<Partnership[]> => {
    const endpoint = organizationType === 'school'
        ? `/api/v1/schools/${organizationId}/partnerships`
        : `/api/v1/companies/${organizationId}/partnerships`;

    const response = await apiClient.get(endpoint, {
        params: { status: 'confirmed' }
    });
    return response.data;
};

/**
 * Fetch members for an organization
 */
export const getOrganizationMembers = async (
    organizationId: number,
    organizationType: 'school' | 'company'
): Promise<OrganizationMember[]> => {
    const endpoint = organizationType === 'school'
        ? `/api/v1/schools/${organizationId}/members`
        : `/api/v1/companies/${organizationId}/members`;

    const response = await apiClient.get(endpoint, {
        params: { 
            status: 'confirmed',
            per_page: 1000  // Load all members (adjust if needed)
        }
    });
    
    // Extract data array from paginated response
    // Backend returns: { data: [...], meta: {...} }
    return response.data?.data || response.data || [];
};

/**
 * Create a new project (JSON format - without images)
 */
export const createProjectJSON = async (
    payload: CreateProjectPayload
): Promise<CreateProjectResponse> => {
    const response = await apiClient.post('/api/v1/projects', payload);
    return response.data;
};

/**
 * Create a new project (Multipart format - with images)
 */
export const createProjectMultipart = async (
    formData: FormData
): Promise<CreateProjectResponse> => {
    const response = await apiClient.post('/api/v1/projects', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

/**
 * Main function to create a project
 * Automatically chooses JSON or Multipart based on presence of images
 */
export const createProject = async (
    payload: CreateProjectPayload,
    mainImage?: File | null,
    additionalImages?: File[]
): Promise<CreateProjectResponse> => {
    // If no images, use JSON format
    if (!mainImage && (!additionalImages || additionalImages.length === 0)) {
        return createProjectJSON(payload);
    }

    // If images present, use multipart format
    const formData = new FormData();

    // Add context and organization_id
    formData.append('context', payload.context);
    if (payload.organization_id) {
        formData.append('organization_id', payload.organization_id.toString());
    }

    // Add project fields
    const project = payload.project;
    formData.append('project[title]', project.title);
    formData.append('project[description]', project.description);
    formData.append('project[start_date]', project.start_date);
    formData.append('project[end_date]', project.end_date);
    formData.append('project[status]', project.status);
    formData.append('project[private]', project.private.toString());

    // Add optional fields
    if (project.participants_number !== undefined) {
        formData.append('project[participants_number]', project.participants_number.toString());
    }

    if (project.tag_ids && project.tag_ids.length > 0) {
        project.tag_ids.forEach(id => {
            formData.append('project[tag_ids][]', id.toString());
        });
    }

    if (project.skill_ids && project.skill_ids.length > 0) {
        project.skill_ids.forEach(id => {
            formData.append('project[skill_ids][]', id.toString());
        });
    }

    if (project.keyword_ids && project.keyword_ids.length > 0) {
        project.keyword_ids.forEach(keyword => {
            formData.append('project[keyword_ids][]', keyword);
        });
    }

    if (project.partnership_id) {
        formData.append('project[partnership_id]', project.partnership_id.toString());
    }

    // Add project members (Rails nested attributes format for multipart/form-data)
    if (project.project_members_attributes && project.project_members_attributes.length > 0) {
        project.project_members_attributes.forEach((member, index) => {
            formData.append(`project[project_members_attributes][${index}][user_id]`, member.user_id.toString());
            formData.append(`project[project_members_attributes][${index}][role]`, member.role);
            formData.append(`project[project_members_attributes][${index}][status]`, member.status);
        });
    }

    // Add links (Rails nested attributes format for multipart/form-data)
    if (project.links_attributes && project.links_attributes.length > 0) {
        project.links_attributes.forEach((link, index) => {
            formData.append(`project[links_attributes][${index}][name]`, link.name);
            formData.append(`project[links_attributes][${index}][url]`, link.url);
        });
    }

    // Add images
    if (mainImage) {
        formData.append('project[main_picture]', mainImage);
    }

    if (additionalImages && additionalImages.length > 0) {
        additionalImages.forEach(image => {
            formData.append('project[pictures][]', image);
        });
    }

    return createProjectMultipart(formData);
};
