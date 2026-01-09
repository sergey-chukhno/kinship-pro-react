import axiosClient from "./config";

export function getAllProjects(params?: { organization_type?: string; page?: number; per_page?: number }) {
    return axiosClient.get('/api/v1/projects', { params });
}

export function getProjectById(projectId: number) {
    return axiosClient.get(`/api/v1/projects/${projectId}`);
}

export function createProject(projectData: { name: string; description: string; }) {
    return axiosClient.post('/api/v1/projects', projectData);
}

export function updateProject(projectId: number, projectData: { name?: string; description?: string; }) {
    return axiosClient.put(`/api/v1/projects/${projectId}`, projectData);
}

export function deleteProject(projectId: number) {
    return axiosClient.delete(`/api/v1/projects/${projectId}`);
}

export function getAllUserProjects(params?: { page?: number; per_page?: number }) {
    return axiosClient.get(`/api/v1/users/me/projects`, { params });
}

export function getUserProjectsByCompany(CompanyID: number) {
    return axiosClient.get(`/api/v1/users/me/projects?by_company=${CompanyID}`);
}

export function getUserProjectsBySchool(SchoolID: number) {
    return axiosClient.get(`/api/v1/users/me/projects?by_school=${SchoolID}`);
}

export function getProjectBadge(projectID: number){
    return axiosClient.get(`/api/v1/projects/${projectID}/badge`)
}
