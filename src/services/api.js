import axios from 'axios';
import { authService } from './auth';

import { API_URL } from '@env';

// Use 10.0.2.2 for Android Emulator to access localhost
// Or use your machine's IP address for physical device
const BASE_URL = API_URL;

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // 10 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(
    async (config) => {
        const token = await authService.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Create a separate instance for public requests to avoid 401 loop if token is invalid
const publicApi = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Debug Logging
publicApi.interceptors.request.use(request => {
    console.log('>>> Request:', request.method.toUpperCase(), request.url, request.params);
    return request;
});

publicApi.interceptors.response.use(
    response => {
        console.log('<<< Response:', response.status, response.data);
        return response;
    },
    error => {
        console.log('<<< Error:', error.message);
        if (error.response) {
            console.log('    Status:', error.response.status);
            console.log('    Data:', error.response.data);
            console.log('    Headers:', error.response.headers);
        } else if (error.request) {
            console.log('    No response received', error.request);
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    // Backend endpoint: /api/user/google-login-success?email=...
    googleLoginSuccess: async (email) => {
        try {
            // Use publicApi here because we are logging in (we don't have a token yet or it's invalid)
            const response = await publicApi.get(`/user/google-login-success`, {
                params: { email }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export default api;
