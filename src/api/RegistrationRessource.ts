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

export function getCompanies() {
    return axiosClient.get('/api/v1/companies/list_for_joining');
}

export function getSchools() {
    return axiosClient.get('/api/v1/schools/list_for_joining');
}

export function getCompanyTypes() {
    return axiosClient.get('/api/v1/company_types');
}