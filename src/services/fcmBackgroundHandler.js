import notifee, { AndroidImportance, AndroidVisibility, AndroidStyle } from '@notifee/react-native';
import { FeatureFlags } from '../config/FeatureFlags';
import { sessionApi, chargersApi } from './api';

const STATIC_NOTIFICATION_ID = 'active-charging-session-notification';
const CHANNEL_ID = 'bentork-session';

/**
 * Headless JS Background Task Handler for FCM Data Messages.
 * Wakes up briefly to update the persistent Notifee notification on Android.
 */
export const handleFcmBackgroundMessage = async (remoteMessage) => {
  console.log('[FCM-Background] Received background message:', JSON.stringify(remoteMessage));

  if (!FeatureFlags.USE_FCM_BACKGROUND_UPDATES) {
    console.log('[FCM-Background] FCM background updates feature flag is disabled.');
    return;
  }

  const { data } = remoteMessage;
  if (!data) return;

  // If the session is completed or stopped, clear the notification and exit
  if (data.type === 'SESSION_COMPLETED' || data.status === 'COMPLETED' || data.status === 'STOPPED') {
    console.log('[FCM-Background] Session ended. Clearing notification.');
    try {
      await notifee.cancelNotification(STATIC_NOTIFICATION_ID);
    } catch (err) {
      console.warn('[FCM-Background] Error cancelling notification:', err);
    }
    return;
  }

  if (data.type !== 'SESSION_UPDATE') {
    return;
  }

  const sessionId = data.sessionId || data.id;
  let soc = parseInt(data.progress || data.soc || '0', 10);
  let kw = parseFloat(data.kw || '0').toFixed(1);
  let energyVal = parseFloat(data.energyKwh || '0').toFixed(2);
  let status = data.status || 'CHARGING';

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
                console.warn('[FCM-Background] Failed to fetch charger power:', err.message);
              }
            }
            const chargerType = raw.charger?.chargerType || raw.charger?.type || raw.chargerType || 'AC';
            kw = chargerPower ? parseFloat(chargerPower).toFixed(1) : (chargerType.toUpperCase() === 'DC' ? '30.0' : '7.4');
          }
        }
        status = raw.status || status;
      }
    } catch (fetchErr) {
      console.warn('[FCM-Background] Failed to enrich session details:', fetchErr.message);
    }
  }

  try {
    // Ensure the session notification channel exists (fallback)
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Session notifications',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
    });

    // Update the persistent progress notification
    const notificationBody = `Charged: ${energyVal} kWh | Speed: ${kw} kW | Status: ${status}`;
    await notifee.displayNotification({
      id: STATIC_NOTIFICATION_ID,
      title: `Charging Session Active - ${soc}%`,
      body: notificationBody,
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher_foreground',
        onlyAlertOnce: true, // Only alert the user once, don't play sound/vibrate on each percent update
        ongoing: true, // User cannot swipe away this notification
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
        pressAction: {
          id: 'default',
        },
      },
    });
    console.log('[FCM-Background] Successfully updated Notifee notification.');
  } catch (error) {
    console.error('[FCM-Background] Failed to display Notifee notification:', error);
  }
};
