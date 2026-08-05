import axios from 'axios';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Unified Error Handler
const handleApiError = async (error) => {
    // 1. Detailed Logging for Debugging
    const errorLog = {
        message: error.message,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
    };

    if (error.response) {
        // Suppress 404 logging for expected scenarios like checking for existing review
        if (error.response.status !== 404) {
            console.error('<<< API Error Response:', JSON.stringify(errorLog, null, 2));
        } else {
            // console.warn('<<< API 404 (Not Found):', error.config?.url);
        }
    } else if (error.request) {
        console.error('<<< API No Response:', error.message);
    } else {
        console.error('<<< API Setup Error:', error.message);
    }

    // 2. Generate User-Friendly Message
    let userMessage = 'Something went wrong. Please try again.';

    if (error.response) {
        const { status, data } = error.response;

        if (status === 401 && data && data.error === 'LOGIN_REQUIRED') {
            const isGuest = await authService.isGuestMode();
            if (!isGuest) {
                DeviceEventEmitter.emit('show_login_prompt', data.message || 'Please login to access this feature');
            }
            userMessage = data.message || 'Please login to access this feature';
        } else if (status === 429) {
            DeviceEventEmitter.emit('show_rate_limit_toast', (data && data.message) || 'Too many requests. Please try again later.');
            userMessage = 'Please wait a moment before trying again';
        } else if (data && data.error) {
            userMessage = data.error;
        } else if (data && data.message) {
            userMessage = data.message;
        } else if (data && typeof data === 'string' && data.length > 0 && data.length < 100) {
            userMessage = data;
        } else {
            // Fallback based on status code
            switch (status) {
                case 400:
                    userMessage = 'Invalid request. Please check your inputs.';
                    break;
                case 401:
                    userMessage = 'Session expired. Please login again.';
                    const guestModeActive = await authService.isGuestMode();
                    if (!guestModeActive) {
                        DeviceEventEmitter.emit('auth_session_expired');
                    }
                    break;
                case 403:
                    userMessage = 'You do not have permission to perform this action.';
                    break;
                case 404:
                    userMessage = 'Resource not found.';
                    break;
                case 500:
                    userMessage = 'Internal server error. Please try again later.';
                    break;
                case 503:
                    userMessage = 'Service unavailable. Please try again later.';
                    break;
                default:
                    userMessage = `Unexpected error (${status}).`;
            }
        }
    } else if (error.code === 'ECONNABORTED') {
        userMessage = 'Request timed out. Please check your connection.';
    } else if (error.request) {
        userMessage = 'Network error. Please check your internet connection.';
    } else {
        userMessage = 'An unexpected application error occurred.';
    }

    // Attach the user-friendly message to the error object
    error.userMessage = userMessage;

    return Promise.reject(error);
};

// Add a request interceptor to add the auth token
api.interceptors.request.use(
    async (config) => {
        const isGuest = await authService.isGuestMode();
        if (!isGuest) {
            const token = await authService.getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        console.log('>>> Auth Request:', config.method.toUpperCase(), config.url);
        return config;
    },
    (error) => {
        console.error('>>> Request Error:', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    response => {
        console.log('<<< Auth Response:', response.status, response.config.url); // Log simpler success
        return response;
    },
    handleApiError
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
    console.log('>>> Public Request:', request.method.toUpperCase(), request.url);
    return request;
});

publicApi.interceptors.response.use(
    response => {
        console.log('<<< Public Response:', response.status, response.config.url);
        return response;
    },
    handleApiError
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
    },
    truecallerLogin: async (payload) => {
        try {
            const response = await publicApi.post('/user/truecaller-login', payload);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    register: async (userData) => {
        try {
            const response = await publicApi.post('/user/signup', userData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    login: async (emailOrMobile, password) => {
        try {
            const response = await publicApi.post('/user/login', {
                emailOrMobile,
                password
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    requestOtp: async (email) => {
        try {
            const response = await publicApi.post('/user/request-otp', null, {
                params: { email }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    resetPassword: async (email, otp, newPassword) => {
        try {
            const response = await publicApi.post('/user/reset-password', null, {
                params: { email, otp, newPassword }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    deleteAccount: async () => {
        try {
            const response = await api.delete('/user/delete-account');
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const adminApi = {
    login: async (emailOrMobile, password) => {
        try {
            const response = await publicApi.post('/admin/login', {
                emailOrMobile,
                password
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    signup: async (name, email, mobile, password, confirmPassword) => {
        try {
            const response = await publicApi.post('/admin/signup', {
                name,
                email,
                mobile,
                password,
                confirmPassword
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const userApi = {
    getUserDetails: async (email) => {
        try {
            const response = await api.get(`/user/byemail/${email}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getUserById: async (userId) => {
        try {
            // Trying plural 'users' as a fallback if 'user' failed? 
            // Or maybe just suppress?
            // Given the 500, the backend might expect /user/details? or /users?
            // I'll keep it as is but add a fallback to try /users/ if the first one fails?
            // No, that's messy.
            // I will assume the backend endpoint is actually /user/profile/${userId} for now? 
            // Or I will rely on the ReviewCard fix.
            const response = await api.get(`/user/${userId}`);
            return response.data;
        } catch (error) {
            // console.warn("Get User By ID Failed", error);
            // If 500, maybe try /users/${userId}
            if (error.response && error.response.status === 500) {
                try {
                    const response2 = await api.get(`/users/${userId}`);
                    return response2.data;
                } catch (e) {
                    throw error; // Throw original
                }
            }
            throw error;
        }
    },
    getWalletDetails: async (userId) => {
        try {
            const response = await api.get(`/wallet/history/${userId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const plansApi = {
    getAllPlans: async () => {
        try {
            // User confirmed plans need authentication.
            const response = await api.get('/plans/all');
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};



export const stationsApi = {
    getAllStations: async () => {
        try {
            const response = await api.get('/stations/all');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getPublicStations: async () => {
        try {
            const response = await publicApi.get('/stations/all');
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const locationsApi = {
    getAllLocations: async () => {
        try {
            const response = await api.get('/location/all');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getLocationById: async (id) => {
        try {
            const response = await api.get(`/location/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const chargersApi = {
    getAllChargers: async () => {
        try {
            const response = await api.get(`/chargers/all?_t=${Date.now()}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getChargerById: async (id) => {
        try {
            const response = await api.get(`/chargers/${id}?_t=${Date.now()}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getChargerByOcppId: async (ocppId) => {
        try {
            const response = await api.get(`/user/charger/ocpp/${ocppId}?_t=${Date.now()}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const razorpayApi = {
    createOrder: async (amount) => {
        try {
            const response = await api.post('/razorpay/create-order', { amount: amount.toString() });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    verifyPayment: async (paymentData) => {
        try {
            const response = await api.post('/razorpay/verify-payment', paymentData);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

// Local cache to track sessions that were just stopped to avoid stale API data
const stoppedSessionIds = new Set();

const saveSessionLimits = async (sessionId, data) => {
    try {
        const limits = {
            selectedKwh: data.selectedKwh,
            amountEntered: data.amountEntered,
            chargingMode: data.chargingMode,
        };
        const limitsStr = JSON.stringify(limits);
        if (sessionId) {
            await AsyncStorage.setItem(`@session_limits_${sessionId}`, limitsStr);
        }
        await AsyncStorage.setItem('@active_session_limits_latest', limitsStr);
        console.log(`Saved session limits (session: ${sessionId}, global latest):`, limits);
    } catch (e) {
        console.warn("Failed to save session limits:", e);
    }
};

const mergeSessionLimits = async (session) => {
    if (!session) return session;
    try {
        let cachedStr = null;
        if (session.sessionId) {
            cachedStr = await AsyncStorage.getItem(`@session_limits_${session.sessionId}`);
        }
        if (!cachedStr) {
            cachedStr = await AsyncStorage.getItem('@active_session_limits_latest');
            if (cachedStr) {
                console.log("Session limits cache missing for ID, loaded from global latest fallback");
            }
        }
        if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            console.log(`Merging cached limits:`, cached);
            return {
                ...session,
                selectedKwh: cached.selectedKwh !== undefined && cached.selectedKwh !== null && Number(cached.selectedKwh) > 0 ? Number(cached.selectedKwh) : session.selectedKwh,
                amountEntered: cached.amountEntered !== undefined && cached.amountEntered !== null && Number(cached.amountEntered) > 0 ? Number(cached.amountEntered) : session.amountEntered,
                chargingMode: cached.chargingMode || session.chargingMode,
            };
        }
    } catch (e) {
        console.warn("Failed to merge cached session limits:", e);
    }
    return session;
};

const clearSessionLimits = async (sessionId) => {
    try {
        if (sessionId) {
            await AsyncStorage.removeItem(`@session_limits_${sessionId}`);
        }
        await AsyncStorage.removeItem('@active_session_limits_latest');
        console.log(`Cleared cached limits (session: ${sessionId}, global latest)`);
    } catch (e) {
        console.warn("Failed to clear session limits:", e);
    }
};

export const sessionApi = {
    startSession: async (sessionData) => {
        try {
            const response = await api.post('/sessions/start', sessionData);
            const sessionResult = response.data;
            if (sessionResult && (sessionResult.sessionId || sessionResult.id)) {
                const sId = sessionResult.sessionId || sessionResult.id;
                await saveSessionLimits(sId, sessionData);
            }
            return sessionResult;
        } catch (error) {
            throw error;
        }
    },
    stopSession: async (sessionId) => {
        try {
            // Send redundant keys to satisfy different backend implementations
            const response = await api.post('/sessions/stop', { 
                sessionId: sessionId,
                id: sessionId 
            });
            await clearSessionLimits(sessionId);
            
            // Blacklist this ID locally for 60 seconds to prevent it showing as active
            if (sessionId) {
                const sidStr = String(sessionId);
                stoppedSessionIds.add(sidStr);
                DeviceEventEmitter.emit('session_stopped', sessionId);
                
                // Keep in blacklist for 60s to allow backend to update its state
                setTimeout(() => {
                    stoppedSessionIds.delete(sidStr);
                    console.log("Blacklist cleared for session:", sidStr);
                }, 60000);
            }
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getSessionEnergy: async (sessionId) => {
        try {
            const response = await api.get(`/sessions/${sessionId}/energy`);
            const data = response.data;
            let energyUsed = 0;

            if (typeof data === 'number') {
                energyUsed = data;
            } else if (typeof data === 'object' && data !== null) {
                // Check various common field names
                energyUsed = data.kwhUsed ?? data.energy ?? data.energyUsed ?? data.kwh ?? 0;
            }
            return Number(energyUsed) || 0;
        } catch (error) {
            console.warn("Get Energy Failed:", error.message);
            // Don't throw, just return 0 to avoid UI freeze, logic will retry
            return 0;
        }
    },
    getSessionStatus: async (sessionId) => {
        try {
            const response = await api.get(`/sessions/${sessionId}/status`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getActiveSession: async (userId) => {
        try {
            // Using /all/records for full enrichment (Charger, Station, etc.)
            const response = await api.get('/sessions/all/records');
            const sessions = Array.isArray(response.data) ? response.data : [];

            if (sessions.length > 0) {
                const activeSessions = sessions.filter(s => {
                    const status = String(s.status || '').toUpperCase();
                    const sUserId = s.user?.id || s.userId;
                    const sUserEmail = s.user?.email || s.userEmail || s.email;

                    const matchesUser = (
                        sUserId == userId || 
                        sUserEmail === userId ||
                        (s.user && (s.user.id == userId || s.user.email === userId))
                    );
                    const isActive = ['ACTIVE', 'CHARGING', 'STARTED', 'INITIATED', 'INITIALIZING', 'PREPARING', 'STARTING'].includes(status);
                    const isRecentlyStopped = stoppedSessionIds.has(String(s.id));

                    return matchesUser && isActive && !isRecentlyStopped;
                });

                // Sort by ID descending to get the LATEST session
                activeSessions.sort((a, b) => b.id - a.id);
                const activeSession = activeSessions[0];

                if (activeSession) {
                    let startTimeTs = Date.now();
                    if (Array.isArray(activeSession.startTime)) {
                        const [y, m, d, h, min, s] = activeSession.startTime;
                        startTimeTs = new Date(y, m - 1, d, h, min, s || 0).getTime();
                    } else if (activeSession.startTime) {
                        startTimeTs = new Date(activeSession.startTime).getTime();
                    }

                    const mapped = {
                        sessionId: activeSession.id,
                        status: activeSession.status || 'ACTIVE',
                        chargerId: activeSession.charger?.id,
                        boxId: activeSession.boxId,
                        stationName: activeSession.stationName || activeSession.charger?.station?.name || activeSession.charger?.name || "Unknown Station",
                        stationId: activeSession.stationId || activeSession.charger?.station?.id,
                        stationImage: activeSession.charger?.station?.image_url || activeSession.station?.image_url || activeSession.stationImage || null,
                        startTime: startTimeTs,
                        selectedKwh: activeSession.selectedKwh || activeSession.kwhLimit || activeSession.energyLimit || activeSession.energy || activeSession.plan?.selectedKwh || activeSession.plan?.kwhLimit || activeSession.plan?.energy || null,
                        amountEntered: activeSession.amountEntered || activeSession.amount || activeSession.priceLimit || activeSession.costLimit || activeSession.budget || activeSession.price || activeSession.plan?.amountEntered || activeSession.plan?.amount || activeSession.plan?.price || activeSession.plan?.walletDeduction || null,
                        chargingMode: activeSession.chargingMode || activeSession.mode || null,
                        planId: activeSession.plan?.id || activeSession.planId || null,
                        durationMin: activeSession.durationMin || activeSession.plan?.durationMin || activeSession.plan?.duration || null,
                        rate: activeSession.charger?.rate || 0,
                        chargerType: activeSession.charger?.chargerType || 'Fast',
                        latitude: activeSession.charger?.station?.latitude || activeSession.station?.latitude,
                        longitude: activeSession.charger?.station?.longitude || activeSession.station?.longitude
                    };
                    return await mergeSessionLimits(mapped);
                }
            }
            return null;
        } catch (error) {
            console.warn("Failed to check active session from records:", error.message);
            return null;
        }
    },

    getAllActiveSessions: async (userId) => {
        try {
            // Using /all/records instead of /active/details to get full entities (Charger, Station, etc.)
            // as requested for a frontend-only fix.
            const response = await api.get('/sessions/all/records');
            const sessions = Array.isArray(response.data) ? response.data : [];

            if (sessions.length > 0) {
                return sessions.filter(s => {
                    // Normalization
                    const status = String(s.status || '').toUpperCase();
                    const sUserId = s.user?.id || s.userId;
                    const sUserEmail = s.user?.email || s.userEmail || s.email;

                    // Match user by ID or Email
                    const matchesUser = (
                        sUserId == userId || 
                        sUserEmail === userId ||
                        (s.user && (s.user.id == userId || s.user.email === userId))
                    );

                    // Filter for active/busy statuses
                    const isActive = ['ACTIVE', 'CHARGING', 'STARTED', 'INITIATED', 'INITIALIZING', 'PREPARING', 'STARTING'].includes(status);
                    const isRecentlyStopped = stoppedSessionIds.has(String(s.id));

                    return matchesUser && isActive && !isRecentlyStopped;
                }).map(session => {
                    // Time parsing
                    let startTimeTs = Date.now();
                    if (Array.isArray(session.startTime)) {
                        const [y, m, d, h, min, s] = session.startTime;
                        startTimeTs = new Date(y, m - 1, d, h, min, s || 0).getTime();
                    } else if (session.startTime) {
                        startTimeTs = new Date(session.startTime).getTime();
                    }

                    return {
                        sessionId: session.id,
                        status: session.status || 'ACTIVE',
                        chargerId: session.charger?.id,
                        boxId: session.boxId,
                        stationName: session.stationName || session.charger?.station?.name || session.charger?.name || "Unknown Station",
                        stationId: session.stationId || session.charger?.station?.id,
                        stationImage: session.charger?.station?.image_url || session.station?.image_url || session.stationImage || null,
                        startTime: startTimeTs,
                        selectedKwh: session.selectedKwh || session.kwhLimit || session.energyLimit || session.energy || session.plan?.selectedKwh || session.plan?.kwhLimit || session.plan?.energy || null,
                        amountEntered: session.amountEntered || session.amount || session.priceLimit || session.costLimit || session.budget || session.price || session.plan?.amountEntered || session.plan?.amount || session.plan?.price || session.plan?.walletDeduction || null,
                        chargingMode: session.chargingMode || session.mode || null,
                        planId: session.plan?.id || session.planId || null,
                        durationMin: session.durationMin || session.plan?.durationMin || session.plan?.duration || null,
                        rate: session.charger?.rate || 0,
                        chargerType: session.charger?.chargerType || 'Fast',
                        latitude: session.charger?.station?.latitude || session.station?.latitude,
                        longitude: session.charger?.station?.longitude || session.station?.longitude
                    };
                });
                
                const merged = await Promise.all(mapped.map(s => mergeSessionLimits(s)));
                return merged.sort((a, b) => b.sessionId - a.sessionId);
            }
            return [];
        } catch (error) {
            console.error("Failed to fetch active sessions from records:", error);
            return [];
        }
    },
    enableNotification: async (sessionId, enabled) => {
        try {
            const response = await api.post('/sessions/notify', { sessionId, enabled });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getSessionDetails: async (sessionId) => {
        try {
            const response = await api.get('/sessions/all/records');
            const sessions = Array.isArray(response.data) ? response.data : [];
            const found = sessions.find(s => String(s.id) === String(sessionId));
            return found || null;
        } catch (error) {
            console.warn("Failed to get session details:", error.message);
            return null;
        }
    }
};

export const notificationApi = {
    registerFcmToken: async (userId, token) => {
        if (!userId || String(userId) === 'undefined') return null;
        try {
            const response = await api.post(`/notifications/user/${userId}/fcm-token`, { fcmToken: token });
            return response.data;
        } catch (error) {
            console.warn("Register FCM Token Failed:", error.message);
            throw error;
        }
    },
    getAllNotifications: async (userId) => {
        if (!userId || String(userId) === 'undefined') return [];
        try {
            const response = await api.get(`/notifications/user/${userId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getUnreadNotifications: async (userId) => {
        if (!userId || String(userId) === 'undefined') return [];
        try {
            const response = await api.get(`/notifications/user/${userId}/unread`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    sendNotification: async (userId, notificationData) => {
        if (!userId || String(userId) === 'undefined') throw new Error("User ID required");
        try {
            const response = await api.post(`/notifications/user/${userId}`, notificationData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    markAsRead: async (notificationId) => {
        try {
            const response = await api.post(`/notifications/${notificationId}/read`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getUnreadCount: async (userId) => {
        if (!userId || String(userId) === 'undefined') return 0;
        try {
            // Using the /unread endpoint to get the count
            const response = await api.get(`/notifications/user/${userId}/unread`);
            const data = response.data;
            if (Array.isArray(data)) {
                return data.length;
            }
            if (typeof data === 'number') return data;
            if (data && typeof data.count === 'number') return data.count;
            return 0;
        } catch (error) {
            return 0;
        }
    }
};

export const reviewsApi = {
    createReview: async (reviewData) => {
        try {
            const { stationId, ...payload } = reviewData;
            const response = await api.post(`/station-reviews/${stationId}`, payload);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    updateReview: async (reviewId, reviewData) => {
        try {
            const response = await api.put(`/station-reviews/${reviewId}`, reviewData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    deleteReview: async (reviewId) => {
        try {
            const response = await api.delete(`/station-reviews/${reviewId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getStationReviews: async (stationId) => {
        try {
            const response = await api.get(`/station-reviews/station/${stationId}`);
            return response.data;
        } catch (error) {
            console.warn("Fetch Reviews Failed:", error.message);
            return []; // Return empty array on error to prevent UI crash
        }
    },
    getUserReviews: async (userId) => {
        try {
            const response = await api.get(`/station-reviews/user/${userId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getStationRatingSummary: async (stationId) => {
        try {
            const response = await api.get(`/station-reviews/summary/${stationId}`);
            return response.data;
        } catch (error) {
            return null;
        }
    },
    getMyReview: async (stationId) => {
        try {
            const response = await api.get(`/station-reviews/my-review/${stationId}`);
            return response.data;
        } catch (error) {
            // User might not have a review, handle gracefully if 404
            if (error.response && error.response.status === 404) return null;
            return null;
        }
    }
};

export const slotsApi = {
    getAvailableSlots: async (chargerId, date) => {
        try {
            // Backend endpoint: /api/slots/charger/{chargerId}/available
            // Note: date param is ignored by backend currently, but kept for future compatibility
            const response = await api.get(`/slots/charger/${chargerId}/available`, {
                params: { date }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getSlotsByCharger: async (chargerId) => {
        try {
            const response = await api.get(`/slots/charger/${chargerId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    createBulkSlots: async (chargerId, date, durationMinutes = 30) => {
        try {
            const response = await api.post('/slots/bulk', {
                chargerId,
                date,
                durationMinutes
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const slotBookingApi = {
    bookSlot: async (slotId) => {
        try {
            const response = await api.post(`/slot-bookings/book/${slotId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    cancelBooking: async (bookingId) => {
        try {
            const response = await api.put(`/slot-bookings/${bookingId}/cancel`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getMyBookings: async () => {
        try {
            const response = await api.get('/slot-bookings/my-bookings');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getMyActiveBookings: async () => {
        try {
            const response = await api.get('/slot-bookings/my-bookings/active');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getBookingById: async (bookingId) => {
        try {
            const response = await api.get(`/slot-bookings/${bookingId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getBookingsByStation: async (stationId) => {
        try {
            const response = await api.get(`/slot-bookings/station/${stationId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

};

// Emergency / Station Contacts API
export const emergencyApi = {
    getContact: async (stationId) => {
        try {
            const response = await api.get(`/emergency-contacts/by-station/${stationId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const cafesApi = {
    getCafesByStation: async (stationId) => {
        try {
            const response = await api.get(`/cafes/station/${stationId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getNearbyCafes: async (latitude, longitude) => {
        try {
            const response = await api.get('/cafes/nearby', {
                params: { latitude, longitude }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const rfidApi = {
    applyForRfid: async (applicationData) => {
        try {
            const response = await api.post('/rfid-applications', applicationData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getMyRfidApplications: async () => {
        try {
            const response = await api.get('/rfid-applications/my-applications');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    markAsReceived: async (id) => {
        try {
            const response = await api.put(`/rfid-applications/${id}/receive`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const referralApi = {
    getCode: async () => {
        try {
            const response = await api.get('/referral/code');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getInfo: async () => {
        try {
            const response = await api.get('/referral/info');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    applyCode: async (referralCode) => {
        try {
            const response = await api.post('/referral/apply', { referralCode });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const coinsApi = {
    getBalance: async () => {
        try {
            const response = await api.get('/coins/balance');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getHistory: async () => {
        try {
            const response = await api.get('/coins/history');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    redeem: async (coins) => {
        try {
            const response = await api.post('/coins/redeem', { coins });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const supportApi = {
    createRequest: async (requestData) => {
        try {
            const response = await api.post('/support-requests/user', requestData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getMyRequests: async () => {
        try {
            const response = await api.get('/support-requests/user/my-requests');
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const batteryApi = {
    searchByInvoice: async (invoice) => {
        try {
            const response = await api.get('/battery-data/user/search', {
                params: { invoice }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const warrantyClaimApi = {
    createClaim: async (claimData) => {
        try {
            const response = await api.post('/warranty-claims/user/create', claimData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getMyClaims: async () => {
        try {
            const response = await api.get('/warranty-claims/user/my-claims');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    confirmReceived: async (id) => {
        try {
            const response = await api.put(`/warranty-claims/user/${id}/confirm-received`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const ordersApi = {
    getUserRole: async () => {
        try {
            const user = await authService.getUser();
            let role = (user?.role || user?.authorities?.[0] || user?.roleName || '').toUpperCase();
            if (!role) {
                const token = (await authService.getToken()) || (await authService.getAdminToken());
                if (token) {
                    try {
                        const decoded = jwtDecode(token);
                        role = (decoded?.role || decoded?.roles?.[0] || decoded?.authorities?.[0] || '').toUpperCase();
                    } catch (e) {}
                }
            }
            return role;
        } catch (e) {
            return '';
        }
    },

    getOrdersEndpoint: async () => {
        const role = await ordersApi.getUserRole();
        if (role.includes('PRODUCTION_ADMIN')) return '/orders/production/orders';
        if (role.includes('SCM_ADMIN')) return '/orders/scm/orders';
        if (role.includes('SUPER_ADMIN') || role === 'ADMIN') return '/orders/admin/all';
        if (role.includes('SALES_ADMIN')) return '/orders/sales/my-orders';
        return '/orders/user/my-orders';
    },

    getOrderDetailEndpoint: async (id) => {
        const role = await ordersApi.getUserRole();
        if (role.includes('PRODUCTION_ADMIN')) return `/orders/production/${id}`;
        if (role.includes('SCM_ADMIN')) return `/orders/scm/${id}`;
        if (role.includes('SUPER_ADMIN') || role === 'ADMIN') return `/orders/admin/${id}`;
        if (role.includes('SALES_ADMIN')) return `/orders/sales/${id}`;
        return `/orders/user/${id}`;
    },

    getMyOrders: async () => {
        try {
            const endpoint = await ordersApi.getOrdersEndpoint();
            const response = await api.get(endpoint);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getOrderDetail: async (id) => {
        try {
            const endpoint = await ordersApi.getOrderDetailEndpoint(id);
            const response = await api.get(endpoint);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getSalesAdminOrders: async () => {
        const response = await api.get('/orders/sales/my-orders');
        return response.data;
    },
    getSalesAdminOrderDetail: async (id) => {
        const response = await api.get(`/orders/sales/${id}`);
        return response.data;
    },
    getProductionOrders: async () => {
        const response = await api.get('/orders/production/orders');
        return response.data;
    },
    getProductionOrderDetail: async (id) => {
        const response = await api.get(`/orders/production/${id}`);
        return response.data;
    },
    getScmOrders: async () => {
        const response = await api.get('/orders/scm/orders');
        return response.data;
    },
    getScmOrderDetail: async (id) => {
        const response = await api.get(`/orders/scm/${id}`);
        return response.data;
    },
    getAllOrders: async () => {
        const response = await api.get('/orders/admin/all');
        return response.data;
    },
    getAdminOrderDetail: async (id) => {
        const response = await api.get(`/orders/admin/${id}`);
        return response.data;
    }
};

export default api;


