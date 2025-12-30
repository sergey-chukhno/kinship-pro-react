import axiosClient from "../config";

// Update user skills
export function updateUserSkills(skillIds: number[], subSkillIds: number[]) {
    return axiosClient.patch('/api/v1/users/me/skills', {
        skill_ids: skillIds,
        sub_skill_ids: subSkillIds
    });
}

// Update user availability
export function updateUserAvailability(availability: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    other: boolean;
}) {
    return axiosClient.patch('/api/v1/users/me/availability', {
        availability: availability
    });
}

