/**
 * LiveStationStatus.js
 *
 * Self-subscribing, render-isolated component that displays real-time
 * charger availability status and connector pills for a single station.
 *
 * Subscribes to `station_chargers_updated_<stationId>` events from
 * chargerStatusSyncService. When a status update arrives, ONLY this
 * component re-renders — the parent FlatList, Map, and other cards
 * remain completely untouched.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Image, DeviceEventEmitter } from 'react-native';
import { Colors } from '../styles/GlobalStyles';
import { getConnectorIcon } from '../utils/connectorUtils';
import { useTheme } from '../context/ThemeContext';

/**
 * Derive availability count and grouped connector data from a chargers array.
 */
const isChargerAvailable = (c) => {
    const s = (c.status || '').toLowerCase();
    return s === 'available' || s === 'online';
};

const isChargerBusy = (c) => {
    const s = (c.status || '').toLowerCase();
    return s === 'busy' || s === 'occupied' || s === 'charging' || s === 'preparing' || s === 'finishing' || s === 'reserved' || s === 'suspendedev' || s === 'suspendedevse';
};

const isChargerFaulted = (c) => {
    const s = (c.status || '').toLowerCase();
    return s === 'faulted';
};

const isChargerOffline = (c) => {
    const s = (c.status || '').toLowerCase();
    return s === 'offline' || s === 'unavailable' || (!s);
};

const deriveStatus = (chargers) => {
    const availableCount = chargers.filter(isChargerAvailable).length;

    const totalChargers = chargers.length;
    const offlineCount = chargers.filter(isChargerOffline).length;
    const faultedCount = chargers.filter(isChargerFaulted).length;
    const isAllOffline = totalChargers > 0 && (offlineCount + faultedCount) === totalChargers;
    const isAllFaulted = totalChargers > 0 && faultedCount === totalChargers;
    const hasFaulted = faultedCount > 0;

    const connectorGroups = {};
    chargers.forEach(c => {
        let connType = c.connectorType || c.connector_type;
        const chgTypeRaw = (c.chargerType || c.type || '').toString();

        if (!connType) {
            if (chgTypeRaw.includes('CCS')) connType = 'CCS 2';
            else if (chgTypeRaw.includes('Type 2')) connType = 'Type 2';
            else if (chgTypeRaw.includes('AC')) connType = 'Type 2';
            else connType = 'Unknown';
        }

        let currentType = 'DC';
        if (
            chgTypeRaw.includes('AC') ||
            (connType && (connType.includes('Type 2') || connType.includes('3-Pin')))
        ) {
            currentType = 'AC';
        }

        const key = `${connType}-${currentType}`;
        if (!connectorGroups[key]) {
            connectorGroups[key] = {
                connectorType: connType,
                currentType,
                total: 0,
                available: 0,
                busy: 0,
            };
        }
        connectorGroups[key].total += 1;

        if (isChargerAvailable(c)) connectorGroups[key].available += 1;
        else if (isChargerBusy(c)) connectorGroups[key].busy += 1;
    });

    return {
        availableCount,
        isAllOffline,
        isAllFaulted,
        hasFaulted,
        groupedConnectors: Object.values(connectorGroups),
    };
};

const LiveStationStatus = React.memo(({ stationId, initialChargers }) => {
    const { theme } = useTheme();
    const [status, setStatus] = useState(() => deriveStatus(initialChargers));

    // Re-derive whenever parent passes updated chargers (after OCPP fetch)
    useEffect(() => {
        setStatus(deriveStatus(initialChargers));
    }, [initialChargers]);

    const { availableCount, isAllOffline, isAllFaulted, hasFaulted } = status;

    // Check if status data has actually loaded (status !== null for at least one charger)
    const hasStatusData = initialChargers.some(c => c.status !== null && c.status !== undefined);

    if (!hasStatusData) {
        return (
            <Text
                style={{
                    color: theme.textSecondary,
                    fontWeight: '600',
                    fontSize: 13,
                    fontStyle: 'italic',
                    fontFamily: 'Geist',
                }}
            >
                Loading...
            </Text>
        );
    }

    let labelText = 'Busy';
    let labelColor = Colors.statusRed;
    if (availableCount > 0) {
        labelText = 'Available';
        labelColor = Colors.statusGreen;
    } else if (isAllFaulted || (hasFaulted && availableCount === 0)) {
        labelText = 'Faulted';
        labelColor = Colors.statusRed;
    } else if (isAllOffline) {
        labelText = 'Offline';
        labelColor = theme.textSecondary;
    }

    return (
        <>
            {/* Availability Label */}
            <Text
                style={{
                    color: labelColor,
                    fontWeight: '600',
                    fontSize: 13,
                    fontFamily: 'Geist',
                }}
            >
                {labelText}
            </Text>
        </>
    );
});

/**
 * Separate component for connector pills, also self-subscribing.
 * Kept separate so we can place it in the correct spot in the card layout.
 */
const LiveConnectorPills = React.memo(({ stationId, initialChargers }) => {
    const { theme, isDark } = useTheme();
    const [status, setStatus] = useState(() => deriveStatus(initialChargers));

    // Re-derive whenever parent passes updated chargers (after OCPP fetch)
    useEffect(() => {
        setStatus(deriveStatus(initialChargers));
    }, [initialChargers]);

    const { groupedConnectors } = status;

    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
            {groupedConnectors.length > 0 ? (
                groupedConnectors.map((group, gIndex) => {
                    const iconColor =
                        group.available > 0
                            ? '#00B074'
                            : group.busy > 0
                                ? '#FFB300'
                                : theme.textSecondary;
                    const isOffline = group.available === 0 && group.busy === 0;

                    return (
                        <View
                            key={gIndex}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isDark ? theme.background : '#E2E7EC',
                                borderRadius: 12,
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                marginRight: 8,
                                marginBottom: 4,
                                opacity: isOffline ? 0.6 : 1,
                            }}
                        >
                            <Image
                                source={getConnectorIcon(group.connectorType)}
                                style={{
                                    width: 18,
                                    height: 18,
                                    marginRight: 6,
                                    tintColor: iconColor,
                                }}
                                resizeMode="contain"
                            />
                            <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700', fontFamily: 'Geist' }}>
                                {group.connectorType} • {group.currentType}
                            </Text>
                        </View>
                    );
                })
            ) : (
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Geist' }}>No Connectors</Text>
            )}
        </View>
    );
});

export { LiveStationStatus, LiveConnectorPills };
