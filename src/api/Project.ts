import axiosClient from "./config";

export function getAllProjects() {
    return axiosClient.get('/api/v1/projects');
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

export function getUserProjects() {
    return axiosClient.get(`/api/v1/users/me/projects`);
}
