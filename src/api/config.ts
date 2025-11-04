import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_DB_BASE_URL;

const axiosClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// (optionnel) intercepteurs pour gérer les erreurs ou les tokens
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('Erreur API:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default axiosClient;
