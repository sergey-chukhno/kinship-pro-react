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
    return axiosClient.put('/api/v1/users/me', {
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