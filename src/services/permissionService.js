import { Platform, PermissionsAndroid, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_KEY = '@permissions_consent_completed';

export const permissionService = {
    /**
     * Check current status of key app permissions.
     */
    checkAllPermissions: async () => {
        if (Platform.OS !== 'android') {
            return { location: true, camera: true, notifications: true, allGranted: true };
        }

        try {
            const hasLocation = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
            const hasCamera = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
            
            let hasNotifications = true;
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                hasNotifications = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
            }

            return {
                location: hasLocation,
                camera: hasCamera,
                notifications: hasNotifications,
                allGranted: hasLocation && hasCamera && hasNotifications
            };
        } catch (error) {
            console.warn('[PermissionService] Check failed:', error);
            return { location: false, camera: false, notifications: false, allGranted: false };
        }
    },

    /**
     * Request Location Permission (Fine & Background)
     */
    requestLocationPermission: async () => {
        if (Platform.OS !== 'android') return true;
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );

            const isFineGranted = granted === PermissionsAndroid.RESULTS.GRANTED;

            // Request Background Location if Fine Location granted and Android >= 10 (API 29)
            if (isFineGranted && Platform.Version >= 29) {
                const bgGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
                if (!bgGranted) {
                    await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
                    );
                }
            }

            return isFineGranted;
        } catch (error) {
            console.warn('[PermissionService] Location request failed:', error);
            return false;
        }
    },

    /**
     * Request Camera Permission
     */
    requestCameraPermission: async () => {
        if (Platform.OS !== 'android') return true;
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CAMERA
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (error) {
            console.warn('[PermissionService] Camera request failed:', error);
            return false;
        }
    },

    /**
     * Request Notification Permission (Android 13+)
     */
    requestNotificationPermission: async () => {
        if (Platform.OS !== 'android' || Platform.Version < 33) return true;
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (error) {
            console.warn('[PermissionService] Notification request failed:', error);
            return false;
        }
    },

    /**
     * Request permissions sequentially (Location -> Camera -> Notifications)
     */
    requestSequentialPermissions: async (onProgress) => {
        const results = { location: false, camera: false, notifications: false };

        // Step 1: Location
        if (onProgress) onProgress('location');
        results.location = await permissionService.requestLocationPermission();

        // Step 2: Camera
        if (onProgress) onProgress('camera');
        results.camera = await permissionService.requestCameraPermission();

        // Step 3: Notifications
        if (onProgress) onProgress('notifications');
        results.notifications = await permissionService.requestNotificationPermission();

        if (onProgress) onProgress('done');
        return results;
    },

    /**
     * Has user already completed consent & system permissions?
     */
    hasCompletedConsent: async () => {
        try {
            const val = await AsyncStorage.getItem(CONSENT_KEY);
            return val === 'true';
        } catch (e) {
            return false;
        }
    },

    /**
     * Mark consent as permanently completed
     */
    setConsentCompleted: async () => {
        try {
            await AsyncStorage.setItem(CONSENT_KEY, 'true');
        } catch (e) {
            console.warn('[PermissionService] Set consent failed:', e);
        }
    },

    /**
     * Reset consent (for testing or re-prompts)
     */
    resetConsent: async () => {
        try {
            await AsyncStorage.removeItem(CONSENT_KEY);
        } catch (e) {
            console.warn('[PermissionService] Reset consent failed:', e);
        }
    },

    /**
     * Open app settings for manually adjusting permissions
     */
    openSettings: () => {
        Linking.openSettings().catch(() => console.warn('[PermissionService] Unable to open settings'));
    }
};
