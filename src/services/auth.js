import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { NotificationService } from './NotificationService';

const TOKEN_KEY = 'user_token';
const USER_KEY = 'user_info';
const ADMIN_TOKEN_KEY = 'admin_token';
const TC_ACCEPTED_KEY = 'tc_accepted';
const BG_LOCATION_CONSENT_KEY = 'bg_location_consent_shown';
const GUEST_MODE_KEY = 'isGuestMode';

export const authService = {
    setToken: async (token) => {
        try {
            await AsyncStorage.setItem(TOKEN_KEY, token);
        } catch (e) {
            console.error('Error saving token', e);
        }
    },

    getToken: async () => {
        try {
            return await AsyncStorage.getItem(TOKEN_KEY);
        } catch (e) {
            console.error('Error getting token', e);
            return null;
        }
    },

    isTokenValid: async (token) => {
        if (!token) return false;
        try {
            const decoded = jwtDecode(token);
            if (!decoded || !decoded.exp) return false;

            const isExpired = decoded.exp * 1000 < Date.now();
            return !isExpired;
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            console.warn("Token validation failed:", message);
            return false;
        }
    },

    setAdminToken: async (token) => {
        try {
            await AsyncStorage.setItem(ADMIN_TOKEN_KEY, token);
        } catch (e) {
            console.error('Error saving admin token', e);
        }
    },

    getAdminToken: async () => {
        try {
            return await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
        } catch (e) {
            console.error('Error getting admin token', e);
            return null;
        }
    },

    removeToken: async () => {
        try {
            await AsyncStorage.removeItem(TOKEN_KEY);
        } catch (e) {
            console.error('Error removing token', e);
        }
    },

    setUser: async (user) => {
        try {
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        } catch (e) {
            console.error('Error saving user', e);
        }
    },

    getUser: async () => {
        try {
            const user = await AsyncStorage.getItem(USER_KEY);
            return user ? JSON.parse(user) : null;
        } catch (e) {
            console.error('Error getting user', e);
            return null;
        }
    },

    isGuestMode: async () => {
        try {
            const val = await AsyncStorage.getItem(GUEST_MODE_KEY);
            return val === 'true';
        } catch (e) {
            console.error('Error reading guest mode flag', e);
            return false;
        }
    },

    setGuestMode: async (isGuest) => {
        try {
            await AsyncStorage.setItem(GUEST_MODE_KEY, isGuest ? 'true' : 'false');
        } catch (e) {
            console.error('Error saving guest mode flag', e);
        }
    },

    logout: async () => {
        try {
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, ADMIN_TOKEN_KEY, GUEST_MODE_KEY]);
            // Note: We intentionally keep TC_ACCEPTED_KEY so the user doesn't have to
            // re-accept T&C every time they log out and back in on the same device.
        } catch (e) {
            console.error('Error logging out', e);
        }
    },

    hasAcceptedTerms: async () => {
        try {
            const val = await AsyncStorage.getItem(TC_ACCEPTED_KEY);
            return val === 'true';
        } catch (e) {
            console.error('Error reading TC flag', e);
            return false;
        }
    },

    setTermsAccepted: async () => {
        try {
            await AsyncStorage.setItem(TC_ACCEPTED_KEY, 'true');
        } catch (e) {
            console.error('Error saving TC flag', e);
        }
    },

    hasBgLocationConsentShown: async () => {
        try {
            const val = await AsyncStorage.getItem(BG_LOCATION_CONSENT_KEY);
            return val === 'true';
        } catch (e) {
            console.error('Error reading BG location consent flag', e);
            return false;
        }
    },

    setBgLocationConsentShown: async () => {
        try {
            await AsyncStorage.setItem(BG_LOCATION_CONSENT_KEY, 'true');
        } catch (e) {
            console.error('Error saving BG location consent flag', e);
        }
    }
};

