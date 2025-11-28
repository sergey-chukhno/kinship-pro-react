import axiosClient from './config';

export function getPersonalUserRoles() {
    return axiosClient.get('/api/v1/registration_roles?type=personal_user');
}

export function getTeacherRoles() {
    return axiosClient.get('/api/v1/registration_roles?type=teacher');
}

export function getSchoolRoles() {
    return axiosClient.get('/api/v1/registration_roles?type=school');
}

export function getCompanyRoles() {
    return axiosClient.get('/api/v1/registration_roles?type=company');
}

export function getSkills() {
    return axiosClient.get('/api/v1/skills');
}

export function getSubSkills(skillIds: number) {
    return axiosClient.get(`/api/v1/skills/${skillIds}/sub_skills`, { params: { skill_ids: skillIds } });
}

export interface SchoolSearchParams {
    page?: number
    per_page?: number
    search?: string
    status?: 'confirmed' | 'pending'
    school_type?: string
}

export interface CompanySearchParams {
    page?: number
    per_page?: number
    search?: string
    status?: 'confirmed' | 'pending'
}

export function getCompanies(params?: CompanySearchParams) {
    return axiosClient.get('/api/v1/companies/list_for_joining', { params });
}

export function getSchools(params?: SchoolSearchParams) {
    return axiosClient.get('/api/v1/schools/list_for_joining', { params });
}

export function getCompanyTypes() {
    return axiosClient.get('/api/v1/company_types');
}