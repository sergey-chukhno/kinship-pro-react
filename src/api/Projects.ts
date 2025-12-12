import apiClient from './config';

// Types for API requests and responses
export interface Tag {
    id: number;
    name: string;
    name_fr?: string;
}

export interface PartnershipPartner {
    id: number;
    name: string;
    type: string;
    role_in_partnership: string;
    member_status: string;
}

export interface Partnership {
    id: number;
    initiator_type?: string;
    initiator_id?: number;
    partnership_type: string;
    status: string;
    share_members: boolean;
    share_projects: boolean;
    partners: PartnershipPartner[];
    created_at: string;
    updated_at: string;
    name?: string;
    description?: string;
    has_sponsorship?: boolean;
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
    // Handle both { data: [...] } and [...] formats
    const tagsData = response.data?.data || response.data || [];
    // Ensure it's an array
    return Array.isArray(tagsData) ? tagsData : [];
};

/**
 * Fetch teacher's projects (owned + projects for managed classes)
 */
export const getTeacherProjects = async (params?: {
    page?: number;
    per_page?: number;
    status?: string;
    search?: string;
}): Promise<{ data: any[]; meta: any }> => {
    const response = await apiClient.get('/api/v1/teachers/projects', { params });
    return {
        data: response.data?.data || response.data || [],
        meta: response.data?.meta || {}
    };
};

/**
 * Fetch partnerships for an organization
 */
export const getPartnerships = async (
    organizationId: number,
    organizationType: 'school' | 'company',
    params?: { page?: number; per_page?: number; status?: string }
): Promise<{ data: Partnership[]; meta?: any }> => {
    const endpoint = organizationType === 'school'
        ? `/api/v1/schools/${organizationId}/partnerships`
        : `/api/v1/companies/${organizationId}/partnerships`;

    const response = await apiClient.get(endpoint, {
        params: params || { status: 'confirmed' }
    });
    
    // Handle response structure: { data: [...], meta: {...} }
    if (response.data?.data) {
        return {
            data: response.data.data,
            meta: response.data.meta
        };
    }
    
    // Fallback for direct array response
    return {
        data: Array.isArray(response.data) ? response.data : [],
        meta: undefined
    };
};

/**
 * Fetch personal user network (for teacher/user roles)
 */
export const getPersonalUserNetwork = async (
    params?: { page?: number; per_page?: number; skill_ids?: number[]; availability?: string[]; skill_name?: string }
): Promise<{ data: any[]; meta?: any }> => {
    const requestParams: any = { per_page: params?.per_page || 12 };
    if (params?.page) requestParams.page = params.page;
    if (params?.skill_ids && params.skill_ids.length > 0) requestParams.skill_ids = params.skill_ids;
    if (params?.skill_name) requestParams.skill_name = params.skill_name;
    
    // Format availability array with brackets for Rails-style array parameters
    if (params?.availability && params.availability.length > 0) {
        // Use paramsSerializer to format arrays with brackets
        requestParams.availability = params.availability;
    }

    const response = await apiClient.get('/api/v1/users/me/network', {
        params: requestParams,
        paramsSerializer: (params) => {
            // Format arrays with brackets: availability[]=monday&availability[]=tuesday
            const searchParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                const value = params[key];
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        searchParams.append(`${key}[]`, item);
                    });
                } else if (value !== undefined && value !== null) {
                    searchParams.append(key, value.toString());
                }
            });
            return searchParams.toString();
        }
    });
    
    // Handle response structure: { data: [...], meta: {...} }
    if (response.data?.data) {
        return {
            data: response.data.data,
            meta: response.data.meta
        };
    }
    
    // Fallback for direct array response
    return {
        data: Array.isArray(response.data) ? response.data : [],
        meta: undefined
    };
};

/**
 * Join a school (for personal users)
 */
export const joinSchool = async (schoolId: number): Promise<any> => {
    const response = await apiClient.post(`/api/v1/schools/${schoolId}/join`);
    return response.data;
};

/**
 * Join a company (for personal users)
 */
export const joinCompany = async (companyId: number): Promise<any> => {
    const response = await apiClient.post(`/api/v1/companies/${companyId}/join`);
    return response.data;
};

/**
 * Accept a partnership request
 */
export const acceptPartnership = async (
    organizationId: number,
    organizationType: 'school' | 'company',
    partnershipId: number
): Promise<any> => {
    const endpoint = organizationType === 'school'
        ? `/api/v1/schools/${organizationId}/partnerships/${partnershipId}/confirm`
        : `/api/v1/companies/${organizationId}/partnerships/${partnershipId}/confirm`;

    const response = await apiClient.patch(endpoint);
    return response.data;
};

/**
 * Reject a partnership request
 */
export const rejectPartnership = async (
    organizationId: number,
    organizationType: 'school' | 'company',
    partnershipId: number
): Promise<any> => {
    const endpoint = organizationType === 'school'
        ? `/api/v1/schools/${organizationId}/partnerships/${partnershipId}/reject`
        : `/api/v1/companies/${organizationId}/partnerships/${partnershipId}/reject`;

    const response = await apiClient.put(endpoint);
    return response.data;
};

/**
 * Create a partnership request
 */
export interface CreatePartnershipPayload {
    partnership_type: string;
    name: string;
    description: string;
    partner_company_ids: number[];
    partner_school_ids: number[];
    share_members: boolean;
    share_projects: boolean;
    has_sponsorship: boolean;
    initiator_role: 'beneficiary' | 'sponsor';
    partner_role: 'beneficiary' | 'sponsor';
}

export interface CreatePartnershipResponse {
    message: string;
    data: Partnership;
}

export const createPartnership = async (
    organizationId: number,
    organizationType: 'school' | 'company',
    payload: CreatePartnershipPayload
): Promise<CreatePartnershipResponse> => {
    const endpoint = organizationType === 'school'
        ? `/api/v1/schools/${organizationId}/partnerships`
        : `/api/v1/companies/${organizationId}/partnerships`;

    const response = await apiClient.post(endpoint, payload);
    return response.data;
};

/**
 * Fetch members for an organization
 */
export const getOrganizationMembers = async (
    organizationId: number,
    organizationType: 'school' | 'company',
    includePending: boolean = false
): Promise<OrganizationMember[]> => {
    const endpoint = organizationType === 'school'
        ? `/api/v1/schools/${organizationId}/members`
        : `/api/v1/companies/${organizationId}/members`;

    const params: any = { 
        per_page: 1000  // Load all members (adjust if needed)
    };
    
    // Only filter by status if not including pending
    if (!includePending) {
        params.status = 'confirmed';
    }

    const response = await apiClient.get(endpoint, { params });
    
    // Extract data array from paginated response
    // Backend returns: { data: [...], meta: {...} }
    return response.data?.data || response.data || [];
};

/**
 * Fetch network members for an organization (company or school)
 * Returns all members from the organization's network including partners and branches
 */
export const getOrganizationNetwork = async (
    organizationId: number,
    organizationType: 'school' | 'company',
    excludeMe: boolean = true
): Promise<any[]> => {
    const endpoint = organizationType === 'school'
        ? `/api/v1/schools/${organizationId}/network`
        : `/api/v1/companies/${organizationId}/network`;

    const params: any = { 
        per_page: 1000  // Load all network members
    };
    
    if (excludeMe) {
        params.exclude_me = true;
    }

    const response = await apiClient.get(endpoint, { params });
    
    // Extract data array from paginated response
    // Backend returns: { data: [...], meta: {...} }
    return response.data?.data || response.data || [];
};

/**
 * Fetch parent organization for a school
 */
export const getSchoolParent = async (
    schoolId: number
): Promise<{ data: any; meta?: any }> => {
    const endpoint = `/api/v1/schools/${schoolId}/parent`;
    const response = await apiClient.get(endpoint);
    
    // Handle response structure: { data: {...}, meta: {...} }
    if (response.data?.data) {
        return {
            data: response.data.data,
            meta: response.data.meta
        };
    }
    
    // Fallback for direct object response
    return {
        data: response.data || null,
        meta: undefined
    };
};

/**
 * Fetch parent organization for a company
 */
export const getCompanyParent = async (
    companyId: number
): Promise<{ data: any; meta?: any }> => {
    const endpoint = `/api/v1/companies/${companyId}/parent`;
    const response = await apiClient.get(endpoint);
    
    // Handle response structure: { data: {...}, meta: {...} }
    if (response.data?.data) {
        return {
            data: response.data.data,
            meta: response.data.meta
        };
    }
    
    // Fallback for direct object response
    return {
        data: response.data || null,
        meta: undefined
    };
};

/**
 * Fetch sub-organizations (branches) for an organization
 * If branches endpoint returns 400, try to get parent organization instead
 */
export const getSubOrganizations = async (
    organizationId: number,
    organizationType: 'school' | 'company'
): Promise<{ data: any[]; meta?: any; isParent?: boolean }> => {
    const endpoint = organizationType === 'school'
        ? `/api/v1/schools/${organizationId}/branches`
        : `/api/v1/companies/${organizationId}/branches`;

    try {
        const response = await apiClient.get(endpoint);
        
        // Handle response structure: { data: [...], meta: {...} }
        if (response.data?.data) {
            return {
                data: response.data.data,
                meta: response.data.meta,
                isParent: false // Data comes from branches endpoint
            };
        }
        
        // Fallback for direct array response
        return {
            data: Array.isArray(response.data) ? response.data : [],
            meta: undefined,
            isParent: false // Data comes from branches endpoint
        };
    } catch (err: any) {
        // If it's a 400 error, try to get parent organization
        if (err?.response?.status === 400) {
            try {
                let parentResponse;
                if (organizationType === 'school') {
                    parentResponse = await getSchoolParent(organizationId);
                } else {
                    parentResponse = await getCompanyParent(organizationId);
                }
                // If parent exists, return it as an array with one element
                if (parentResponse.data) {
                    return {
                        data: [parentResponse.data],
                        meta: parentResponse.meta,
                        isParent: true // Data comes from parent endpoint
                    };
                }
            } catch (parentErr) {
                console.error(`Error fetching ${organizationType} parent:`, parentErr);
            }
        }
        // Re-throw the original error if it's not a 400 error or if parent fetch fails
        throw err;
    }
};

/**
 * Fetch personal user requests (partnership and attach requests)
 */
export const getPersonalUserRequests = async (
    userId: number
): Promise<{ partnerships: Partnership[]; attachRequests: any[] }> => {
    try {
        // Fetch partnership requests initiated by the user
        const partnershipsResponse = await apiClient.get(`/api/v1/users/${userId}/partnership_requests`);
        const partnerships = partnershipsResponse.data?.data || partnershipsResponse.data || [];

        // Fetch attach requests initiated by the user
        const attachResponse = await apiClient.get(`/api/v1/users/${userId}/attach_requests`);
        const attachRequests = attachResponse.data?.data || attachResponse.data || [];

        return {
            partnerships: Array.isArray(partnerships) ? partnerships : [],
            attachRequests: Array.isArray(attachRequests) ? attachRequests : []
        };
    } catch (err) {
        console.error('Error fetching personal user requests:', err);
        return {
            partnerships: [],
            attachRequests: []
        };
    }
};

/**
 * Fetch personal user organization requests (for teacher/user roles)
 * Uses /api/v1/users/me/organizations endpoint
 * Returns structure: { data: { schools: [...], companies: [...] }, meta: {...} }
 */
// Get membership requests (pending, accepted, rejected)
export const getUserMembershipRequests = async (): Promise<{ data: { schools: any[]; companies: any[] }; meta?: any }> => {
    const response = await apiClient.get('/api/v1/users/me/membership_requests');
    
    // Handle response structure: { data: { schools: [...], companies: [...] }, meta: {...} }
    return {
        data: response.data?.data || { schools: [], companies: [] },
        meta: response.data?.meta
    };
};

export const getPersonalUserOrganizations = async (): Promise<{ data: { schools: any[]; companies: any[] }; meta?: any }> => {
    const response = await apiClient.get('/api/v1/users/me/organizations');
    
    // Handle response structure: { data: { schools: [...], companies: [...] }, meta: {...} }
    if (response.data?.data) {
        return {
            data: {
                schools: response.data.data.schools || [],
                companies: response.data.data.companies || []
            },
            meta: response.data.meta
        };
    }
    
    // Fallback
    return {
        data: {
            schools: [],
            companies: []
        },
        meta: undefined
    };
};

/**
 * Fetch all members from teacher's classes (students + volunteers)
 * Returns members from all classes the teacher manages
 */
export const getTeacherMembers = async (params?: {
    search?: string;
    member_type?: 'student' | 'volunteer';
    per_page?: number;
    page?: number;
}): Promise<OrganizationMember[]> => {
    const response = await apiClient.get('/api/v1/teachers/members', {
        params: {
            ...params,
            per_page: params?.per_page || 1000  // Load all members by default
        }
    });
    
    // Extract data array from paginated response
    // Backend returns: { data: [...], meta: {...} }
    const members = response.data?.data || response.data || [];
    
    // Map to OrganizationMember format (backend already provides compatible fields)
    // Preserve classes information for filtering by school
    return members.map((member: any) => ({
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        full_name: member.full_name,
        email: member.email,
        role: member.role,
        avatar_url: member.avatar_url || null,
        classes: member.classes || [] // Preserve classes for school filtering
    }));
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

export interface UpdateProjectPayload {
    project: {
        title?: string;
        description?: string;
        start_date?: string;
        end_date?: string;
        status?: 'coming' | 'in_progress' | 'ended';
        private?: boolean;
        tag_ids?: number[];
        keyword_ids?: string[];
        links_attributes?: LinkAttribute[];
    };
}

const updateProjectJSON = async (
    projectId: number,
    payload: UpdateProjectPayload
): Promise<CreateProjectResponse> => {
    const response = await apiClient.patch(`/api/v1/projects/${projectId}`, payload);
    return response.data;
};

const updateProjectMultipart = async (
    projectId: number,
    formData: FormData
): Promise<CreateProjectResponse> => {
    const response = await apiClient.patch(
        `/api/v1/projects/${projectId}`,
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }
    );
    return response.data;
};

export const updateProject = async (
    projectId: number,
    payload: UpdateProjectPayload,
    mainImage?: File | null,
    additionalImages?: File[]
): Promise<CreateProjectResponse> => {
    // If no images, use JSON format
    if (!mainImage && (!additionalImages || additionalImages.length === 0)) {
        return updateProjectJSON(projectId, payload);
    }

    // If images present, use multipart format
    const formData = new FormData();

    // Add project fields
    const project = payload.project;
    if (project.title) formData.append('project[title]', project.title);
    if (project.description) formData.append('project[description]', project.description);
    if (project.start_date) formData.append('project[start_date]', project.start_date);
    if (project.end_date) formData.append('project[end_date]', project.end_date);
    if (project.status) formData.append('project[status]', project.status);
    if (project.private !== undefined) formData.append('project[private]', project.private.toString());

    if (project.tag_ids && project.tag_ids.length > 0) {
        project.tag_ids.forEach(id => {
            formData.append('project[tag_ids][]', id.toString());
        });
    }

    if (project.keyword_ids && project.keyword_ids.length > 0) {
        project.keyword_ids.forEach(keyword => {
            formData.append('project[keyword_ids][]', keyword);
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

    return updateProjectMultipart(projectId, formData);
};

/**
 * Project Statistics Interface
 */
export interface ProjectStats {
    overview: {
        total_members: number;
        confirmed_members: number;
        pending_members: number;
        total_teams: number;
        total_badges_assigned: number;
    };
    members_by_role: {
        member: number;
        admin: number;
        co_owner: number;
        owner: number;
    };
    members_by_status: {
        pending: number;
        confirmed: number;
    };
    badges: {
        total: number;
        this_month: number;
        recent: Array<{
            id: number;
            badge_name: string;
            receiver_name: string;
            assigned_at: string;
        }>;
    };
    teams: {
        total: number;
        total_members: number;
    };
}

/**
 * Get project statistics
 */
export const getProjectStats = async (projectId: number): Promise<ProjectStats> => {
    const response = await apiClient.get(`/api/v1/projects/${projectId}/stats`);
    return response.data;
};

/**
 * Join a project (request to join)
 */
export const joinProject = async (projectId: number): Promise<{
    message: string;
    project_member?: any;
}> => {
    const response = await apiClient.post(`/api/v1/projects/${projectId}/join`);
    return response.data;
};

/**
 * Get project members (including pending requests)
 */
export const getProjectMembers = async (projectId: number): Promise<any[]> => {
    const response = await apiClient.get(`/api/v1/projects/${projectId}/members`);
    return response.data?.data || [];
};

/**
 * Get pending project join requests
 */
export const getProjectPendingMembers = async (projectId: number): Promise<any[]> => {
    const allMembers = await getProjectMembers(projectId);
    // Filter members with status 'pending'
    return allMembers.filter((member: any) => member.status === 'pending');
};

/**
 * Update project member (accept/reject request, change role, etc.)
 */
export const updateProjectMember = async (
    projectId: number,
    userId: number,
    updates: {
        role?: 'member' | 'admin';
        status?: 'pending' | 'confirmed';
        can_assign_badges_in_project?: boolean;
    }
): Promise<any> => {
    const response = await apiClient.patch(
        `/api/v1/projects/${projectId}/members/${userId}`,
        { member: updates }
    );
    return response.data;
};

/**
 * Remove project member (reject request or remove member)
 */
export const removeProjectMember = async (
    projectId: number,
    userId: number
): Promise<void> => {
    await apiClient.delete(`/api/v1/projects/${projectId}/members/${userId}`);
};

/**
 * Add a member to the project
 */
export const addProjectMember = async (
    projectId: number,
    userId: number
): Promise<any> => {
    const response = await apiClient.post(
        `/api/v1/projects/${projectId}/members`,
        { user_id: userId }
    );
    return response.data;
};

// Team types and interfaces
export interface TeamMember {
    id: number;
    user: {
        id: number;
        full_name: string;
        email: string;
        avatar_url?: string;
        job?: string;
    };
}

export interface Team {
    id: number;
    title: string;
    description: string;
    team_leader?: {
        id: number;
        full_name: string;
        email: string;
        avatar_url?: string;
        job?: string;
    };
    team_members: TeamMember[];
    members_count: number;
    created_at: string;
    updated_at: string;
}

export interface CreateTeamPayload {
    title: string;
    description: string;
    team_leader_id?: number;
    team_member_ids: number[];
}

/**
 * Get all teams for a project
 */
export const getProjectTeams = async (projectId: number): Promise<Team[]> => {
    const response = await apiClient.get(`/api/v1/projects/${projectId}/teams`);
    return response.data || [];
};

/**
 * Create a new team
 */
export const createProjectTeam = async (
    projectId: number,
    payload: CreateTeamPayload
): Promise<Team> => {
    const response = await apiClient.post(`/api/v1/projects/${projectId}/teams`, {
        team: payload
    });
    return response.data;
};

/**
 * Update a team
 */
export const updateProjectTeam = async (
    projectId: number,
    teamId: number,
    payload: CreateTeamPayload
): Promise<Team> => {
    const response = await apiClient.patch(
        `/api/v1/projects/${projectId}/teams/${teamId}`,
        { team: payload }
    );
    return response.data;
};

/**
 * Delete a team
 */
export const deleteProjectTeam = async (
    projectId: number,
    teamId: number
): Promise<void> => {
    await apiClient.delete(`/api/v1/projects/${projectId}/teams/${teamId}`);
};

/**
 * Branch Request interfaces
 */
export interface BranchRequest {
    id: number;
    parent_school?: {
        id: number;
        name: string;
        [key: string]: any;
    };
    parent_company?: {
        id: number;
        name: string;
        [key: string]: any;
    };
    child_school?: {
        id: number;
        name: string;
        [key: string]: any;
    };
    child_company?: {
        id: number;
        name: string;
        [key: string]: any;
    };
    initiator: 'parent' | 'child';
    recipient: 'parent' | 'child';
    status: 'pending' | 'confirmed' | 'rejected';
    message: string;
    confirmed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateBranchRequestPayload {
    parent_school_id?: number;
    parent_company_id?: number;
    message: string;
}

export interface CreateBranchRequestResponse {
    message: string;
    data: BranchRequest;
}

/**
 * Create a branch request (for schools)
 */
export const createSchoolBranchRequest = async (
    schoolId: number,
    payload: CreateBranchRequestPayload
): Promise<CreateBranchRequestResponse> => {
    const response = await apiClient.post(
        `/api/v1/schools/${schoolId}/branch_requests`,
        payload
    );
    return response.data;
};

/**
 * Create a branch request (for companies)
 */
export const createCompanyBranchRequest = async (
    companyId: number,
    payload: CreateBranchRequestPayload
): Promise<CreateBranchRequestResponse> => {
    const response = await apiClient.post(
        `/api/v1/companies/${companyId}/branch_requests`,
        payload
    );
    return response.data;
};

/**
 * Fetch branch requests for an organization
 */
export const getBranchRequests = async (
    organizationId: number,
    organizationType: 'school' | 'company'
): Promise<{ data: BranchRequest[]; meta?: any }> => {
    const endpoint = organizationType === 'school'
        ? `/api/v1/schools/${organizationId}/branch_requests`
        : `/api/v1/companies/${organizationId}/branch_requests`;

    const response = await apiClient.get(endpoint);
    
    // Handle response structure: { data: [...], meta: {...} }
    if (response.data?.data) {
        return {
            data: response.data.data,
            meta: response.data.meta
        };
    }
    
    // Fallback for direct array response
    return {
        data: Array.isArray(response.data) ? response.data : [],
        meta: undefined
    };
};

/**
 * Confirm a branch request
 */
export const confirmBranchRequest = async (
    organizationId: number,
    organizationType: 'school' | 'company',
    requestId: number
): Promise<void> => {
    const endpoint = organizationType === 'school'
        ? `/api/v1/schools/${organizationId}/branch_requests/${requestId}/confirm`
        : `/api/v1/companies/${organizationId}/branch_requests/${requestId}/confirm`;

    await apiClient.patch(endpoint);
};

/**
 * Reject a branch request
 */
export const rejectBranchRequest = async (
    organizationId: number,
    organizationType: 'school' | 'company',
    requestId: number
): Promise<void> => {
    const endpoint = organizationType === 'school'
        ? `/api/v1/schools/${organizationId}/branch_requests/${requestId}/reject`
        : `/api/v1/companies/${organizationId}/branch_requests/${requestId}/reject`;

    await apiClient.patch(endpoint);
};

/**
 * Delete/Cancel a branch request (only by initiator)
 */
export const deleteBranchRequest = async (
    organizationId: number,
    organizationType: 'school' | 'company',
    requestId: number
): Promise<void> => {
    const endpoint = organizationType === 'school'
        ? `/api/v1/schools/${organizationId}/branch_requests/${requestId}`
        : `/api/v1/companies/${organizationId}/branch_requests/${requestId}`;

    await apiClient.delete(endpoint);
};
