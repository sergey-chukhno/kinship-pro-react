import axiosClient from "../config";

interface UserProfile {
    firstName: string;
    lastName: string;
    email: string;
    take_trainee: string;
    propose_workshop: string;
    job: string;
    show_my_skills: string;
}

export function updateUserProfile(profileData: UserProfile) {
    return axiosClient.patch('/api/v1/users/me', {
        user: {
            first_name: profileData.firstName,
            last_name: profileData.lastName,
            email: profileData.email,
            take_trainee: profileData.take_trainee,
            propose_workshop: profileData.propose_workshop,
            job: profileData.job,
            show_my_skills: profileData.show_my_skills
        }
    });
}

export function uploadAvatar(avatarFile: File) {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    return axiosClient.post('/api/v1/users/me/avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
}

export function deleteAvatar() {
    return axiosClient.delete('/api/v1/users/me/avatar');
}

// Password change
export function updateUserPassword(currentPassword: string, newPassword: string, passwordConfirmation: string) {
    return axiosClient.patch('/api/v1/users/me/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: passwordConfirmation
    });
}

// Email change
export function updateUserEmail(email: string, currentPassword: string) {
    return axiosClient.patch('/api/v1/users/me/email', {
        email: email,
        current_password: currentPassword
    });
}

// Role change (for personal users only)
export function updateUserRole(role: string) {
    return axiosClient.patch('/api/v1/users/me/role', {
        role: role
    });
}

// Remove school association
export function removeSchoolAssociation(schoolId: number) {
    return axiosClient.delete(`/api/v1/users/me/organizations/schools/${schoolId}`);
}

// Remove company association
export function removeCompanyAssociation(companyId: number) {
    return axiosClient.delete(`/api/v1/users/me/organizations/companies/${companyId}`);
}

// Transfer superadmin role
export function transferSuperadminRole(organizationType: 'School' | 'Company', organizationId: number, newSuperadminUserId: number) {
    return axiosClient.post('/api/v1/users/me/transfers/superadmin', {
        organization_type: organizationType,
        organization_id: organizationId,
        new_superadmin_user_id: newSuperadminUserId
    });
}

// Delete account (soft delete)
export function deleteAccount() {
    return axiosClient.delete('/api/v1/users/me');
}