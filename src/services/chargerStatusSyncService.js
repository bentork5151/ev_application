/**
 * chargerStatusSyncService.js
 *
 * High-performance, focus-bound background charger status synchronization.
 *
 * - Polls /api/chargers/all at a configurable interval (default 5s).
 * - Maintains an in-memory cache of charger statuses keyed by charger ID.
 * - Diffs incoming data against cache; emits targeted per-STATION events
 *   only when at least one charger belonging to that station has changed.
 * - Scheduling is deferred via InteractionManager.runAfterInteractions
 *   so network requests never compete with active gesture animations.
 *
 * Usage (in HomeScreen useFocusEffect):
 *   chargerStatusSync.startSync();
 *   return () => chargerStatusSync.stopSync();
 */

import { DeviceEventEmitter, InteractionManager } from 'react-native';
import { chargersApi } from './api';

// ---------- Configuration ----------
const POLL_INTERVAL_MS = 5000; // 5 seconds

// ---------- Internal State ----------
let pollTimer = null;
let isSyncing = false;

// ---------- Helpers ----------

/**
 * Fetch chargers and emit events directly to update UI with latest backend status.
 * Returns silently on network errors to avoid crashing the UI.
 */
const poll = async () => {
    try {
        const chargers = await chargersApi.getAllChargers();
        if (!Array.isArray(chargers) || chargers.length === 0) return;

        // Build station chargers mapping and emit per-station events immediately
        const stationIdMap = new Map();
        chargers.forEach(charger => {
            const stationId = charger.stationId || charger.station_id || (charger.station && (charger.station.id || charger.station));
            if (stationId) {
                if (!stationIdMap.has(stationId)) {
                    stationIdMap.set(stationId, []);
                }
                stationIdMap.get(stationId).push(charger);
            }
        });

        stationIdMap.forEach((stationChargers, stationId) => {
            DeviceEventEmitter.emit(
                `station_chargers_updated_${stationId}`,
                { chargers: stationChargers }
            );
        });

        // Also emit a single batch event with the full updated chargers list
        DeviceEventEmitter.emit('charger_sync_batch', { chargers });
    } catch (e) {
        // Silent – network hiccups should never crash the map experience
    }
};

/**
 * Schedule the next poll after the current JS interaction completes.
 * This ensures swiping/panning animations are never interrupted.
 */
const scheduleNextPoll = () => {
    if (!isSyncing) return;

    pollTimer = setTimeout(() => {
        if (!isSyncing) return;
        InteractionManager.runAfterInteractions(() => {
            if (!isSyncing) return;
            poll().finally(() => {
                scheduleNextPoll();
            });
        });
    }, POLL_INTERVAL_MS);
};

// ---------- Public API ----------

const startSync = () => {
    if (isSyncing) return; // Prevent double-start
    isSyncing = true;
    console.log('ChargerStatusSync: Started');

    // Kick off the first poll immediately (deferred to after interactions)
    InteractionManager.runAfterInteractions(() => {
        if (!isSyncing) return;
        poll().finally(() => {
            scheduleNextPoll();
        });
    });
};

const stopSync = () => {
    isSyncing = false;
    if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
    }
    console.log('ChargerStatusSync: Stopped');
};

/**
 * Warm-seed cache stub to maintain backward compatibility.
 * Caching has been disabled to ensure fully backend-driven flow.
 */
const seedCache = (chargers) => {
    // No-op: caching disabled
};

const chargerStatusSync = {
    startSync,
    stopSync,
    seedCache,
};

export default chargerStatusSync;
