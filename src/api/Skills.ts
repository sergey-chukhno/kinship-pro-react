import axiosClient from './config';

export const getSkills = () => axiosClient.get('/api/v1/skills');


