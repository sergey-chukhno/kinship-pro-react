// src/api/axiosClient.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_DB_BASE_URL;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const axiosClientWithoutToken = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Intercepteur pour ajouter le token JWT à chaque requête
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosClient;
export { axiosClientWithoutToken };