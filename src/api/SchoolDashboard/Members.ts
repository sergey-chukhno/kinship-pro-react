import axiosClient from "../config";

export function getSchoolMembersAccepted(SchoolId: number, perPage: number = 12, options?: { includeDetails?: boolean }) {
    // Use members endpoint to include staff + students; filtering is done on the frontend
    return axiosClient.get(`/api/v1/schools/${SchoolId}/members`, {
        params: {
            status: 'confirmed',
            per_page: perPage,
            include_details: options?.includeDetails
        }
    });
}

export function getSchoolMembersPending(SchoolId: number) {
    return axiosClient.get(`/api/v1/schools/${SchoolId}/members?status=pending`);
}

export function addSchoolMember(SchoolId: number, memberData: { user_id: number; role: string; }) {
    return axiosClient.post(`/api/v1/schools/${SchoolId}/members`, memberData);
}

export function removeSchoolMember(SchoolId: number, memberId: number) {
    return axiosClient.delete(`/api/v1/schools/${SchoolId}/members/${memberId}`);
}

export function updateSchoolMemberRole(SchoolId: number, memberId: number, newRole: string) {
    return axiosClient.put(`/api/v1/schools/${SchoolId}/members/${memberId}`, { role: newRole });
}

export function acceptSchoolMember(SchoolId: number, memberId: number, role?: string) {
    const payload: { status: string; role?: string } = { status: "confirmed" };
    if (role) {
        payload.role = role;
    }
    return axiosClient.put(`/api/v1/schools/${SchoolId}/members/${memberId}`, payload);
}

export function createSchoolStudent(schoolId: number, studentData: {
    first_name: string;
    last_name: string;
    birthday: string;
    user_role: string;
    role: string;
}) {
    return axiosClient.post(`/api/v1/schools/${schoolId}/members`, studentData);
}

export function getSchoolVolunteers(
    schoolId: number,
    status: string = 'confirmed',
    options?: { page?: number; per_page?: number }
) {
    return axiosClient.get(`/api/v1/schools/${schoolId}/volunteers`, {
        params: {
            status,
            page: options?.page ?? 1,
            per_page: options?.per_page ?? 1000,
        },
    });
}

export function importSchoolMembersCsv(schoolId: number, csvFile: File) {
    const formData = new FormData();
    formData.append('csv_file', csvFile);
    return axiosClient.post(`/api/v1/schools/${schoolId}/members/import_csv`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
}

export function getSchoolStaff(schoolId: number, perPage: number = 100, options?: { search?: string }) {
    return axiosClient.get(`/api/v1/schools/${schoolId}/staff`, {
        params: {
            status: 'confirmed',
            per_page: perPage,
            search: options?.search
        }
    });
}