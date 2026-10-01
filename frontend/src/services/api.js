import axios from 'axios';
import { API_BASE_URL } from '../constants/apiEndpoints';

// Fallback to localhost:8000 if the constant or env variable is undefined
const resolvedBaseUrl =
  API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

const api = axios.create({
  baseURL: resolvedBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30-second timeout for AI inference & external API scans
});

// Request Interceptor: Attach Token & Log Outgoing Requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }



    return config;
  },
  (error) => {
    console.error('❌ [API Request Error]:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Global Errors (e.g. Expired Token)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;

    console.error(`❌ [API Error] Status: ${status} on ${url}:`, error.response?.data || error.message);

    // If token expired or invalid, clear local storage and redirect to login
    if (typeof window !== 'undefined' && status === 401 && !url?.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;