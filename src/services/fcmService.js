import { Platform, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { notificationApi, sessionApi, chargersApi } from './api';
import { authService } from './auth';
import notifee, { AndroidImportance, AndroidVisibility, AndroidStyle, EventType } from '@notifee/react-native';
import { navigationRef } from '../navigation/AppNavigator';
import { FeatureFlags } from '../config/FeatureFlags';
import { handleFcmBackgroundMessage } from './fcmBackgroundHandler';

export const requestUserPermission = async () => {
    try {
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
            console.log('[FCM] Authorization status:', authStatus);
        }
        return enabled;
    } catch (error) {
        console.error('[FCM] Permission Request Error:', error);
        return false;
    }
};

export const getFCMToken = async () => {
    try {
        if (Platform.OS === 'ios' && !messaging().isDeviceRegisteredForRemoteMessages) {
            await messaging().registerDeviceForRemoteMessages();
        }

        const token = await messaging().getToken();
        if (!token) {
            console.log('[FCM] No token received from Firebase');
            return null;
        }

        console.log('<<< Firebase FCM Token:', token);

        const user = await authService.getUser();
        const userId = user?.id || user?.userId;
        if (userId) {
            console.log(`[FCM] Syncing token for user ${userId} to backend...`);
            try {
                await notificationApi.registerFcmToken(userId, token);
                console.log('[FCM] Token registered successfully with backend');
            } catch (apiErr) {
                console.warn('[FCM] Failed to register token with backend:', apiErr.message);
            }
        }

        return token;
    } catch (error) {
        console.warn('[FCM] Error getting/syncing FCM token:', error.message);
        return null;
    }
};

export const registerFCM = async () => {
    try {
        const hasPermission = await requestUserPermission();
        if (!hasPermission) {
            console.log('[FCM] Notification permission denied');
            return null;
        }
        return await getFCMToken();
    } catch (error) {
        console.warn('[FCM] Failed to register FCM:', error.message);
        return null;
    }
};

const sanitizeNotificationText = (text) => {
    if (!text) return text;
    let sanitized = text;
    sanitized = sanitized.replace(/sales_registered/gi, 'Order Placed');
    sanitized = sanitized.replace(/in_production/gi, 'In Production');
    sanitized = sanitized.replace(/production_complete/gi, 'Ready to Ship');
    sanitized = sanitized.replace(/scm_complete/gi, 'Ready to Ship');
    sanitized = sanitized.replace(/dispatched/gi, 'Dispatched');
    sanitized = sanitized.replace(/cancelled/gi, 'Cancelled');
    
    sanitized = sanitized.replace(/sales registered/gi, 'Order Placed');
    sanitized = sanitized.replace(/production complete/gi, 'Ready to Ship');
    sanitized = sanitized.replace(/scm complete/gi, 'Ready to Ship');
    
    return sanitized;
};

export const NotificationListener = () => {
    // Pre-create Android notification channels so they are registered in the OS
    const initializeChannels = async () => {
        try {
            await notifee.createChannel({
                id: 'bentork-session',
                name: 'Session Updates',
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
            });
            await notifee.createChannel({
                id: 'default',
                name: 'General Notifications',
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
            });
        } catch (err) {
            console.warn('[FCM] Failed to initialize Notifee channels:', err);
        }
    };
    initializeChannels();

    // 1. Foreground Message Handler
    const unsubscribe = messaging().onMessage(async remoteMessage => {
        console.log('[FCM] Foreground Message:', JSON.stringify(remoteMessage));

        try {
            const data = remoteMessage.data;
            const STATIC_NOTIFICATION_ID = 'active-charging-session-notification';
            const CHANNEL_ID = 'bentork-session';

            if (data && (data.type === 'SESSION_COMPLETED' || data.status === 'COMPLETED' || data.status === 'STOPPED')) {
                try {
                    await notifee.cancelNotification(STATIC_NOTIFICATION_ID);
                } catch (err) {
                    console.warn('[FCM] Error cancelling notification on completed:', err);
                }
                return;
            }

            if (data && data.type === 'SESSION_UPDATE') {
                const sessionId = data.sessionId || data.id;
                let soc = parseInt(data.progress || data.soc || '0', 10);
                let kw = parseFloat(data.kw || '0').toFixed(1);
                let energyVal = parseFloat(data.energyKwh || '0').toFixed(2);
                let status = data.status || 'CHARGING';
                const channelId = data.channelId || CHANNEL_ID;
 
                if (sessionId) {
                    try {
                        const raw = await sessionApi.getSessionDetails(sessionId);
                        if (raw) {
                            // Calculate elapsed seconds
                            let startTimeTs = Date.now();
                            if (Array.isArray(raw.startTime)) {
                                const [y, m, d, h, min, s] = raw.startTime;
                                startTimeTs = new Date(y, m - 1, d, h, min, s || 0).getTime();
                            } else if (raw.startTime) {
                                startTimeTs = new Date(raw.startTime).getTime();
                            }
                            const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTimeTs) / 1000));
                            
                            // Fetch live energy consumed if not in payload
                            let energyUsed = parseFloat(data.energyKwh || '0');
                            if (!data.energyKwh) {
                                energyUsed = await sessionApi.getSessionEnergy(sessionId);
                                energyVal = energyUsed.toFixed(2);
                            }

                            // Calculate progress percentage (soc) if not provided in progress payload
                            if (!data.progress) {
                                const durationMin = raw.durationMin || raw.plan?.durationMin || raw.plan?.duration || 0;
                                const durationSeconds = durationMin * 60;
                                if (durationSeconds > 0) {
                                    soc = Math.min(100, Math.round((elapsedSeconds / durationSeconds) * 100));
                                } else {
                                    const selectedKwh = raw.selectedKwh || 45;
                                    soc = Math.min(100, Math.round((energyUsed / selectedKwh) * 100));
                                }
                            }

                            // Calculate charging speed (kw) estimate if not provided
                            if (!data.kw) {
                                const energy = parseFloat(data.energyKwh || '0');
                                const duration = elapsedSeconds > 0 ? elapsedSeconds : parseFloat(data.durationSeconds || '0');
                                
                                let calculatedKw = 0;
                                if (duration > 0 && energy > 0) {
                                    calculatedKw = (energy * 3600) / duration;
                                }
                                
                                if (calculatedKw > 0.1 && calculatedKw < 150) {
                                    kw = calculatedKw.toFixed(1);
                                } else {
                                    let chargerPower = raw.charger?.maxPower || raw.charger?.power || raw.maxPower || raw.power;
                                    if (!chargerPower && raw.chargerId) {
                                        try {
                                            const chargerInfo = await chargersApi.getChargerById(raw.chargerId);
                                            if (chargerInfo) {
                                                chargerPower = chargerInfo.maxPower || chargerInfo.power;
                                            }
                                        } catch (err) {
                                            console.warn('[FCM] Failed to fetch charger power:', err.message);
                                        }
                                    }
                                    const chargerType = raw.charger?.chargerType || raw.charger?.type || raw.chargerType || 'AC';
                                    kw = chargerPower ? parseFloat(chargerPower).toFixed(1) : (chargerType.toUpperCase() === 'DC' ? '30.0' : '7.4');
                                }
                            }
                            status = raw.status || status;
                        }
                    } catch (fetchErr) {
                        console.warn('[FCM] Failed to enrich session notification details:', fetchErr.message);
                    }
                }

                await notifee.createChannel({
                    id: channelId,
                    name: 'Session notifications',
                    importance: AndroidImportance.HIGH,
                    visibility: AndroidVisibility.PUBLIC,
                });

                const notificationBody = `Charged: ${energyVal} kWh | Speed: ${kw} kW | Status: ${status}`;
                await notifee.displayNotification({
                    id: STATIC_NOTIFICATION_ID,
                    title: `Charging Session Active - ${soc}%`,
                    body: notificationBody,
                    android: {
                        channelId: channelId,
                        smallIcon: 'ic_launcher_foreground',
                        onlyAlertOnce: true,
                        ongoing: true,
                        autoCancel: false,
                        importance: AndroidImportance.HIGH,
                        visibility: AndroidVisibility.PUBLIC,
                        style: {
                            type: AndroidStyle.BIGTEXT,
                            text: notificationBody,
                        },
                        progress: {
                            max: 100,
                            current: soc,
                            indeterminate: false,
                        },
                        pressAction: { id: 'default' },
                    },
                });
                return;
            }

            // Fallback for general non-session notifications
            const rawTitle = remoteMessage.notification?.title || remoteMessage.data?.title || '⚡ Session Update';
            const rawBody = remoteMessage.notification?.body || remoteMessage.data?.body || 'Check your charging session details.';
            
            const title = sanitizeNotificationText(rawTitle);
            const body = sanitizeNotificationText(rawBody);

            await notifee.displayNotification({
                title: title,
                body: body,
                data: remoteMessage.data,
                android: {
                    channelId: remoteMessage.data?.channelId || remoteMessage.notification?.android?.channelId || CHANNEL_ID,
                    smallIcon: 'ic_launcher_foreground',
                    pressAction: { id: 'default' },
                    style: {
                        type: AndroidStyle.BIGTEXT,
                        text: body,
                    },
                },
            });
        } catch (error) {
            console.error('[FCM] Foreground Alert Error:', error);
        }
    });

    const safeNavigate = (routeName, params) => {
        if (navigationRef.isReady()) {
            navigationRef.navigate(routeName, params);
        } else {
            const checkReady = setInterval(() => {
                if (navigationRef.isReady()) {
                    clearInterval(checkReady);
                    navigationRef.navigate(routeName, params);
                }
            }, 100);
            setTimeout(() => clearInterval(checkReady), 5000);
        }
    };

    const handleOrderRedirection = (remoteMessage) => {
        if (!remoteMessage?.data) return false;
        const typeStr = String(remoteMessage.data.type || '').toUpperCase();
        if (typeStr === 'ORDER' || typeStr.includes('ORDER')) {
            const orderId = remoteMessage.data.orderId;
            if (orderId) {
                safeNavigate('OrderDetail', { orderId });
            } else {
                safeNavigate('MyOrders');
            }
            return true;
        }
        return false;
    };

    // 2. Background State Message (Tap on notification)
    messaging().onNotificationOpenedApp(remoteMessage => {
        console.log(
            '[FCM] Notification opened app from background state:',
            remoteMessage,
        );
        if (handleOrderRedirection(remoteMessage)) return;

        const sessionIdStr = remoteMessage.data?.sessionId;
        const sessionId = sessionIdStr ? parseInt(sessionIdStr, 10) : null;
        if (sessionId && !isNaN(sessionId)) {
            safeNavigate('ActiveSessionScreen', { sessionId });
        }
    });

    // 3. Quit State Message (Tap on notification)
    messaging()
        .getInitialNotification()
        .then(remoteMessage => {
            if (remoteMessage) {
                console.log(
                    '[FCM] Notification opened app from quit state:',
                    remoteMessage,
                );
                if (remoteMessage.data) {
                    const typeStr = String(remoteMessage.data.type || '').toUpperCase();
                    if (typeStr === 'ORDER' || typeStr.includes('ORDER')) {
                        const orderId = remoteMessage.data.orderId;
                        if (orderId) {
                            safeNavigate('OrderDetail', { orderId });
                        } else {
                            safeNavigate('MyOrders');
                        }
                        return;
                    }
                }

                const sessionIdStr = remoteMessage.data?.sessionId;
                const sessionId = sessionIdStr ? parseInt(sessionIdStr, 10) : null;
                if (sessionId && !isNaN(sessionId)) {
                    safeNavigate('ActiveSessionScreen', { sessionId });
                }
            }
        });

    // 4. Notifee Foreground Press Handler
    const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS) {
            const notification = detail.notification;
            if (notification && notification.data) {
                const typeStr = String(notification.data.type || '').toUpperCase();
                if (typeStr === 'ORDER' || typeStr.includes('ORDER')) {
                    const orderId = notification.data.orderId;
                    if (orderId) {
                        safeNavigate('OrderDetail', { orderId });
                    } else {
                        safeNavigate('MyOrders');
                    }
                }
            }
        }
    });

    // 5. Notifee Quit State Tap Handler
    notifee.getInitialNotification().then(initialNotification => {
        if (initialNotification) {
            const notification = initialNotification.notification;
            if (notification && notification.data) {
                const typeStr = String(notification.data.type || '').toUpperCase();
                if (typeStr === 'ORDER' || typeStr.includes('ORDER')) {
                    const orderId = notification.data.orderId;
                    if (orderId) {
                        safeNavigate('OrderDetail', { orderId });
                    } else {
                        safeNavigate('MyOrders');
                    }
                }
            }
        }
    });

    return () => {
        unsubscribe();
        unsubscribeNotifee();
    };
};

// Background Handler
export const setupBackgroundHandler = () => {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
        if (FeatureFlags.USE_FCM_BACKGROUND_UPDATES) {
            return handleFcmBackgroundMessage(remoteMessage);
        }

        console.log('[FCM] Background Message Received (Legacy):', JSON.stringify(remoteMessage));

        try {
            const channelId = remoteMessage.data?.channelId || remoteMessage.notification?.android?.channelId || 'bentork-session';

            // NOTE: If this is a "Notification" message, the system already displayed it 
            // if we are in the background. To have NO notification shown for invalid channels,
            // always send messages as "Data only" (omit notification block).
            
            // For data messages, we display manually:
            if (!remoteMessage.notification) {
                const rawTitle = remoteMessage.data?.title || 'New Update';
                const rawBody = remoteMessage.data?.body || 'Check the app for details';
                const title = sanitizeNotificationText(rawTitle);
                const body = sanitizeNotificationText(rawBody);
                await notifee.displayNotification({
                    title: title,
                    body: body,
                    data: remoteMessage.data,
                    android: {
                        channelId: channelId,
                        smallIcon: 'ic_launcher_foreground',
                        pressAction: { id: 'default' },
                        style: {
                            type: AndroidStyle.BIGTEXT,
                            text: body,
                        },
                    },
                });
            }
        } catch (err) {
            console.error('[FCM] Background Display Error:', err);
        }
    });
};
