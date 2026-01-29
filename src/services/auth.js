import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'user_token';
const USER_KEY = 'user_info';

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

    logout: async () => {
        try {
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
        } catch (e) {
            console.error('Error logging out', e);
        }
    }
};
