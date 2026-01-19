import axiosClient from "../config";

interface UserProfile {
    firstName: string;
    lastName: string;
    email: string;
    take_trainee: boolean;
    propose_workshop: boolean;
    job: string;
    show_my_skills: boolean;
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

// Get eligible admins/referents for school superadmin transfer
// Makes separate calls for admin and referent roles, then merges results
export async function getEligibleSchoolAdmins(
  schoolId: number,
  page: number = 1,
  perPage: number = 20,
  search?: string
) {
  const baseParams: any = {
    status: 'confirmed',
    exclude_me: true,
    page,
    per_page: perPage,
  };

  // Add search if provided
  if (search && search.trim()) {
    baseParams.search = search.trim();
  }

  // Make parallel calls for admin and referent roles
  const [adminResponse, referentResponse] = await Promise.all([
    axiosClient.get(`/api/v1/schools/${schoolId}/members`, {
      params: { ...baseParams, role: 'admin' },
    }),
    axiosClient.get(`/api/v1/schools/${schoolId}/members`, {
      params: { ...baseParams, role: 'referent' },
    }),
  ]);

  // Merge results and remove duplicates by user ID
  const adminData = adminResponse.data?.data || [];
  const referentData = referentResponse.data?.data || [];
  
  const mergedData = [...adminData, ...referentData];
  const uniqueUsers = Array.from(
    new Map(mergedData.map((user: any) => [user.id, user])).values()
  );

  // Calculate combined pagination metadata
  const adminMeta = adminResponse.data?.meta || {};
  const referentMeta = referentResponse.data?.meta || {};
  const totalCount = (adminMeta.total_count || 0) + (referentMeta.total_count || 0);
  const totalPages = Math.max(adminMeta.total_pages || 1, referentMeta.total_pages || 1);

  return {
    data: {
      data: uniqueUsers,
      meta: {
        ...adminMeta,
        total_count: totalCount,
        total_pages: totalPages,
      },
    },
  };
}

// Get eligible admins/referents for company superadmin transfer
// Makes separate calls for admin and referent roles, then merges results
export async function getEligibleCompanyAdmins(
  companyId: number,
  page: number = 1,
  perPage: number = 20,
  search?: string
) {
  const baseParams: any = {
    status: 'confirmed',
    exclude_me: true,
    page,
    per_page: perPage,
  };

  // Add search if provided
  if (search && search.trim()) {
    baseParams.search = search.trim();
  }

  // Make parallel calls for admin and referent roles
  const [adminResponse, referentResponse] = await Promise.all([
    axiosClient.get(`/api/v1/companies/${companyId}/members`, {
      params: { ...baseParams, role: 'admin' },
    }),
    axiosClient.get(`/api/v1/companies/${companyId}/members`, {
      params: { ...baseParams, role: 'referent' },
    }),
  ]);

  // Merge results and remove duplicates by user ID
  const adminData = adminResponse.data?.data || [];
  const referentData = referentResponse.data?.data || [];
  
  const mergedData = [...adminData, ...referentData];
  const uniqueUsers = Array.from(
    new Map(mergedData.map((user: any) => [user.id, user])).values()
  );

  // Calculate combined pagination metadata
  const adminMeta = adminResponse.data?.meta || {};
  const referentMeta = referentResponse.data?.meta || {};
  const totalCount = (adminMeta.total_count || 0) + (referentMeta.total_count || 0);
  const totalPages = Math.max(adminMeta.total_pages || 1, referentMeta.total_pages || 1);

  return {
    data: {
      data: uniqueUsers,
      meta: {
        ...adminMeta,
        total_count: totalCount,
        total_pages: totalPages,
      },
    },
  };
}