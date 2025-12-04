import axiosClient from './config';
import axios, { AxiosResponse } from 'axios';

const fetchWithFallback = async (
  primaryEndpoint: string,
  fallbackEndpoint?: string
): Promise<AxiosResponse> => {
  try {
    return await axiosClient.get(primaryEndpoint);
  } catch (error) {
    if (
      fallbackEndpoint &&
      axios.isAxiosError(error) &&
      error.response?.status === 404
    ) {
      return axiosClient.get(fallbackEndpoint);
    }
    throw error;
  }
};

export const getCompanyStats = (companyId: number) => {
  const basePath = `/api/v1/companies/${companyId}/stats`;
  // Some environments expose /company instead of /companies
  return fetchWithFallback(basePath, `/api/v1/company/${companyId}/stats`);
};

export const getSchoolStats = (schoolId: number) => {
  const basePath = `/api/v1/schools/${schoolId}/stats`;
  return fetchWithFallback(basePath);
};

export const getTeacherStats = () => {
  return axiosClient.get('/api/v1/teachers/stats');
};

export const getTeacherClasses = (page: number = 1, per_page: number = 12) => {
  return axiosClient.get('/api/v1/teachers/classes', {
    params: { page, per_page },
  });
};

export const createTeacherClass = (classData: { class: { name: string; level: string | number; school_id: number | null; teacher_ids?: number[] } }) => {
  return axiosClient.post('/api/v1/teachers/classes', classData);
};

export const deleteTeacherClass = (classId: number) => {
  return axiosClient.delete(`/api/v1/teachers/classes/${classId}`);
};

export const updateTeacherClass = (classId: number, classData: { class: { name: string; level: string | number; school_id?: number | null; teacher_ids?: number[] } }) => {
  return axiosClient.patch(`/api/v1/teachers/classes/${classId}`, classData);
};

export const getTeacherClassStudents = (classId: number) => {
  return axiosClient.get(`/api/v1/teachers/classes/${classId}/students`);
};

export const createTeacherLevelStudent = (levelId: number, studentData: {
  student: {
    first_name: string;
    last_name: string;
    email?: string;
    birthday?: string;
    role?: string;
    accept_privacy_policy?: boolean;
  }
}) => {
  return axiosClient.post(`/api/v1/teachers/levels/${levelId}/students`, studentData);
};

export const getTeacherClass = (classId: number) => {
  return axiosClient.get(`/api/v1/teachers/classes/${classId}`);
};

export const removeTeacherStudent = (classId: number, studentId: number) => {
  return axiosClient.delete(`/api/v1/teachers/classes/${classId}/students/${studentId}`);
};

export const getSchoolProjects = (
  schoolId: number,
  includeBranches = false,
  perPage = 3
) => {
  return axiosClient.get(`/api/v1/schools/${schoolId}/projects`, {
    params: { include_branches: includeBranches, per_page: perPage, sort_by: 'created_at', sort_direction: 'desc' },
  });
};

export const getSchoolRecentMembers = (
  schoolId: number,
  perPage = 3,
  createdAtOrder: 'asc' | 'desc' = 'desc'
) => {
  return axiosClient.get(`/api/v1/schools/${schoolId}/members`, {
    params: {
      created_at_order: createdAtOrder,
      per_page: perPage,
    },
  });
};

export const getCompanyRecentMembers = (
  companyId: number,
  perPage = 3,
  createdAtOrder: 'asc' | 'desc' = 'desc'
) => {
  return axiosClient.get(`/api/v1/companies/${companyId}/members`, {
    params: {
      created_at_order: createdAtOrder,
      per_page: perPage,
    },
  });
};

export const getTeacherRecentMembers = (
  perPage = 3,
  createdAtOrder: 'asc' | 'desc' = 'desc'
) => {
  return axiosClient.get(`/api/v1/teachers/members`, {
    params: {
      created_at_order: createdAtOrder,
      per_page: perPage,
    },
  });
};

export const getCompanyProjects = (
  companyId: number,
  includeBranches = false,
  perPage = 12
) => {
  return axiosClient.get(`/api/v1/companies/${companyId}/projects`, {
    params: { include_branches: includeBranches, per_page: perPage },
  });
};

export const getSchoolActivity = (schoolId: number) => {
  return axiosClient.get(`/api/v1/schools/${schoolId}/activity`);
};

export const getCompanyActivity = (companyId: number) => {
  return axiosClient.get(`/api/v1/companies/${companyId}/activity`);
};

export const getTeacherActivity = () => {
  return axiosClient.get('/api/v1/teachers/activity');
};

export const getCompanyActivityStats = (companyId: number) => {
  const basePath = `/api/v1/companies/${companyId}/activity_stats`;
  return fetchWithFallback(basePath, `/api/v1/company/${companyId}/activity_stats`);
};

export const getSchoolActivityStats = (schoolId: number) => {
  return axiosClient.get(`/api/v1/schools/${schoolId}/activity_stats`);
};

export const getTeacherActivityStats = () => {
  return axiosClient.get('/api/v1/teachers/activity_stats');
};

export const getSchoolAssignedBadges = (schoolId: number, perPage = 200) => {
  return axiosClient.get(`/api/v1/schools/${schoolId}/badges/assigned`, {
    params: { per_page: perPage },
  });
};

export const getCompanyAssignedBadges = (companyId: number, perPage = 200) => {
  return axiosClient.get(`/api/v1/companies/${companyId}/badges/assigned`, {
    params: { per_page: perPage },
  });
};

export const getTeacherAssignedBadges = (perPage = 200) => {
  return axiosClient.get(`/api/v1/teachers/badges/assigned`, {
    params: { per_page: perPage },
  });
};

export const getTeacherLogo = () => {
  return axiosClient.get('/api/v1/teachers/logo');
};

export const getSchoolDetails = (schoolId: number) => {
  return axiosClient.get(`/api/v1/schools/${schoolId}`);
};

export const getCompanyDetails = (companyId: number) => {
  return axiosClient.get(`/api/v1/companies/${companyId}`);
};

export const uploadSchoolLogo = (schoolId: number, file: File) => {
  const formData = new FormData();
  formData.append('logo', file);
  return axiosClient.patch(`/api/v1/schools/${schoolId}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadCompanyLogo = (companyId: number, file: File) => {
  const formData = new FormData();
  formData.append('logo', file);
  return axiosClient.patch(`/api/v1/companies/${companyId}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteSchoolLogo = (schoolId: number) => {
  return axiosClient.delete(`/api/v1/schools/${schoolId}/logo`);
};

export const deleteCompanyLogo = (companyId: number) => {
  return axiosClient.delete(`/api/v1/companies/${companyId}/logo`);
};

export const uploadTeacherLogo = (file: File) => {
  const formData = new FormData();
  formData.append('logo', file);
  return axiosClient.patch(`/api/v1/teachers/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteTeacherLogo = () => {
  return axiosClient.delete(`/api/v1/teachers/logo`);
};

