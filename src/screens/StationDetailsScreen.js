import React, { useState, useEffect, useRef, useCallback } from 'react';
import remoteConfig from '@react-native-firebase/remote-config';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, Share, Platform, StatusBar, DeviceEventEmitter, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Navigation, Star, Share2, ChevronRight, Clock, CreditCard, Zap, Info, Coffee, ShoppingBag, Utensils, Headphones } from 'lucide-react-native';
import { Colors } from '../styles/GlobalStyles';
import { useAlert } from '../context/AlertContext';
import { parseMaintenanceDate, isTodayOrFuture } from '../utils/dateUtils';
import { shouldRespectMaintenance } from '../utils/devSettings';
import EmergencyContactDialog from '../components/EmergencyContactDialog';
import StationReviewsTab from '../components/StationReviewsTab';
import { cafesApi, chargersApi, stationsApi } from '../services/api';
import placesService from '../services/placesService';
import chargerStatusSync from '../services/chargerStatusSyncService';
import { authService } from '../services/auth';
import { useTheme } from '../context/ThemeContext';
import { getConnectorIcon } from '../utils/connectorUtils';

const getFallbackImage = (cafe) => {
    const cat = (cafe?.category || cafe?.type || cafe?.categoryLabel || '').toLowerCase();
    const name = (cafe?.name || cafe?.title || '').toLowerCase();
    if (cat.includes('mall') || cat.includes('shopping') || name.includes('mall')) {
        return 'https://images.unsplash.com/photo-1567449303078-57ad995bd301?q=80&w=600&auto=format&fit=crop';
    } else if (cat.includes('restaurant') || cat.includes('food') || cat.includes('dine') || name.includes('restaurant')) {
        return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=600&auto=format&fit=crop';
};

const AmenityImage = React.memo(({ cafe, imageUrl, style, isDark }) => {
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [imageUrl]);

    const finalUrl = (imageUrl && !imgError) ? imageUrl : getFallbackImage(cafe);

    return (
        <Image
            source={{ uri: finalUrl }}
            style={style}
            resizeMode="cover"
            onError={() => setImgError(true)}
        />
    );
});

export default function StationDetailsScreen({ route, navigation }) {
    const { theme, isDark } = useTheme();
    const { showAlert } = useAlert();
    const { station, chargers, nearbyCafes = [] } = route.params || {};

    const [stationDetails, setStationDetails] = useState(station);
    const [chargerList, setChargerList] = useState(() => {
        if (chargers && chargers.length > 0) return chargers;
        if (station && station.chargers && station.chargers.length > 0) return station.chargers;
        return [];
    });
    const [backendCafes, setBackendCafes] = useState([]);
    const [fetchedAmenities, setFetchedAmenities] = useState([]);
    const [activeFilter, setActiveFilter] = useState('All');
    const [showEmergency, setShowEmergency] = useState(false);
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [maintenanceDate, setMaintenanceDate] = useState('');

    const stationDetailsRef = useRef(stationDetails);
    useEffect(() => {
        stationDetailsRef.current = stationDetails;
    }, [stationDetails]);

    const isChargerForStation = (charger, stationId) => {
        if (!charger || !stationId) return false;
        const sId = charger.stationId || charger.station_id || (charger.station && (charger.station.id || charger.station));
        return String(sId) === String(stationId);
    };

    // Priority 1: Use live updated chargerList state
    // Priority 2: Fall back to route params or station.chargers
    const rawChargers = chargerList.length > 0
        ? chargerList
        : ((chargers && chargers.length > 0)
            ? chargers
            : ((stationDetails && stationDetails.chargers && stationDetails.chargers.length > 0)
                ? stationDetails.chargers
                : []));

    const stationChargers = rawChargers.filter(c => isChargerForStation(c, stationDetails?.id));

    // Fetch initial station info if not passed via route
    useEffect(() => {
        if (!stationDetails) {
            const loadStation = async () => {
                try {
                    const isGuest = await authService.isGuestMode();
                    const stationsData = isGuest 
                        ? await stationsApi.getPublicStations() 
                        : await stationsApi.getAllStations();
                    
                    const validStations = Array.isArray(stationsData) ? stationsData : (stationsData?.stations || []);
                    if (validStations.length > 0) {
                        setStationDetails(validStations[0]);
                    }
                } catch (error) {
                    console.log("Failed to load station data in StationDetailsScreen:", error);
                }
            };
            loadStation();
        }
    }, [stationDetails]);

    // Fetch fresh real-time charger status on mount and whenever stationDetails.id changes
    useEffect(() => {
        if (!stationDetails?.id) return;
        const fetchLiveChargers = async () => {
            try {
                const chargersData = await chargersApi.getAllChargers().catch(() => []);
                const validChargers = Array.isArray(chargersData) ? chargersData : (chargersData?.chargers || []);
                const filtered = validChargers.filter(c => isChargerForStation(c, stationDetails.id));
                if (filtered.length > 0) {
                    setChargerList(filtered);
                    chargerStatusSync.seedCache(filtered);
                }
            } catch (error) {
                console.log("Failed to load fresh live chargers:", error);
            }
        };
        fetchLiveChargers();
        chargerStatusSync.startSync();
    }, [stationDetails?.id]);

    // Listen for high-frequency live charger status updates for this station
    useEffect(() => {
        if (!stationDetails?.id) return;
        const sub = DeviceEventEmitter.addListener(`station_chargers_updated_${stationDetails.id}`, ({ chargers: updatedChargers }) => {
            if (updatedChargers && updatedChargers.length > 0) {
                setChargerList(updatedChargers);
            }
        });
        const globalSub = DeviceEventEmitter.addListener('chargers_updated', ({ chargers: allUpdatedChargers }) => {
            if (allUpdatedChargers && allUpdatedChargers.length > 0) {
                const filtered = allUpdatedChargers.filter(c => isChargerForStation(c, stationDetails.id));
                if (filtered.length > 0) {
                    setChargerList(filtered);
                }
            }
        });
        return () => {
            sub.remove();
            globalSub.remove();
        };
    }, [stationDetails?.id]);

    // Sync station if route param changes
    useEffect(() => {
        if (station && station.id !== stationDetailsRef.current?.id) {
            setStationDetails(station);
            if (chargers) setChargerList(chargers);
        }
    }, [station, chargers]);

    // Fetch maintenance configs
    useEffect(() => {
        const fetchMaintenance = async () => {
            const respectMaintenance = await shouldRespectMaintenance();
            if (!respectMaintenance) {
                setIsMaintenance(false);
                setMaintenanceDate('');
                return;
            }
            try {
                const defaults = {
                    maintenance_key: false,
                    maintenance_date: ''
                };
                await remoteConfig().setDefaults(defaults);
                await remoteConfig().fetchAndActivate();

                setIsMaintenance(remoteConfig().getValue('maintenance_key').asBoolean());
                setMaintenanceDate(remoteConfig().getValue('maintenance_date').asString());
            } catch (e) {
                setIsMaintenance(false);
                setMaintenanceDate('');
            }
        };
        fetchMaintenance();
    }, []);

    // Fetch backend cafes or fallback to placesService nearby amenities
    useEffect(() => {
        const fetchCafesAndAmenities = async () => {
            if (!stationDetails?.id && (!stationDetails?.latitude || !stationDetails?.longitude)) return;
            const guest = await authService.isGuestMode();
            if (!guest && stationDetails?.id) {
                try {
                    const data = await cafesApi.getCafesByStation(stationDetails.id);
                    if (Array.isArray(data) && data.length > 0) {
                        setBackendCafes(data);
                        return;
                    }
                } catch (err) {
                    console.log('Backend cafe fetch failed:', err?.message);
                }
            }
            if (stationDetails?.latitude && stationDetails?.longitude) {
                try {
                    const nearby = await placesService.fetchNearbyAmenities(stationDetails.latitude, stationDetails.longitude);
                    if (Array.isArray(nearby) && nearby.length > 0) {
                        setFetchedAmenities(nearby);
                    }
                } catch (err) {
                    console.log('PlacesService amenities fetch failed:', err?.message);
                }
            }
        };
        fetchCafesAndAmenities();
    }, [stationDetails?.id, stationDetails?.latitude, stationDetails?.longitude]);

    const getCafeImageUrl = (item) => {
        if (!item) return null;
        const uri = item?.googleMapImageUrl || item?.google_map_image_url || item?.photoUrl || item?.imageUrl || item?.image_url || item?.photo_url || item?.photo || item?.image || item?.googleMapLocation;
        if (uri && typeof uri === 'string' && (uri.startsWith('http://') || uri.startsWith('https://'))) {
            return uri;
        }
        return getFallbackImage(item);
    };

    if (!stationDetails) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#212121' : theme.background }]}>
                <ActivityIndicator size="large" color="#00B074" style={{ marginTop: 40 }} />
            </SafeAreaView>
        );
    }

    const handleDirections = () => {
        const lat = stationDetails.latitude;
        const lng = stationDetails.longitude;
        const url = Platform.OS === 'ios'
            ? `http://maps.apple.com/?daddr=${lat},${lng}`
            : `google.navigation:q=${lat},${lng}`;
        Linking.openURL(url).catch(() => console.log('Could not open map navigation'));
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this EV Charging Station: ${stationDetails.name} at ${stationDetails.locationName || stationDetails.address || ''}`,
            });
        } catch (error) {
            console.log("Share Error:", error.message);
        }
    };

    const handleStationInfo = () => {
        const total = stationChargers.length;
        const availCount = stationChargers.filter(c => {
            const s = (c.status || '').toString().toLowerCase();
            return s === 'available' || s === 'online';
        }).length;
        const loc = stationDetails.locationName || stationDetails.address || 'Nanded City';

        showAlert(
            stationDetails.name,
            `📍 Location: ${loc}\n\n⚡ Chargers: ${availCount}/${total} Available\n\n🕒 Access: 24/7 Public Charging\n\n💳 Payments: RFID Card, In-App Wallet & UPI\n\nℹ️ Tap any available charger card below to start charging.`
        );
    };

    const handleSelectCharger = (charger) => {
        const typeStr = (charger.chargerType || charger.type || '').toString().toUpperCase();
        const isAC = typeStr.includes('AC');
        const fallbackConnector = isAC ? 'Type 2' : 'CCS 2';

        const initialConfig = {
            stationName: stationDetails.name,
            chargerId: charger.id,
            boxId: charger.boxId || charger.charger_id || charger.ocppId,
            ocppId: charger.charger_id || charger.ocppId || `CHG-${charger.id}`,
            connectorType: charger.connectorType || charger.connector_type || fallbackConnector,
            maxPower: charger.max_power || charger.capacityKw || charger.rate || 60,
            rate: charger.billingRate || charger.price_per_kwh || charger.price || 18,
            chargerType: charger.chargerType || ((charger.capacityKw || charger.max_power || 60) <= 22 ? 'AC' : 'DC'),
            status: charger.status,
            latitude: stationDetails.latitude,
            longitude: stationDetails.longitude
        };

        navigation.navigate('Config', {
            ...initialConfig,
            stationId: stationDetails.id
        });
    };

    const displayCafes = backendCafes.length > 0 
        ? backendCafes 
        : (nearbyCafes.length > 0 ? nearbyCafes : fetchedAmenities);

    const filteredAmenities = displayCafes.filter(item => {
        if (activeFilter === 'All') return true;
        const catLower = (item.category || item.type || item.categoryLabel || '').toLowerCase();
        const filterLower = activeFilter.toLowerCase();
        if (filterLower === 'cafe') return catLower.includes('cafe') || catLower.includes('coffee');
        if (filterLower === 'malls' || filterLower === 'mall') return catLower.includes('mall') || catLower.includes('shopping');
        if (filterLower === 'restaurants' || filterLower === 'restaurant') return catLower.includes('restaurant') || catLower.includes('food') || catLower.includes('dine');
        return catLower.includes(filterLower);
    });

    const dynamicStyles = getStyles(theme, isDark);

    return (
        <View style={dynamicStyles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dynamicStyles.scrollContent}>
                {/* Hero / Cover Image */}
                <View style={dynamicStyles.heroContainer}>
                    <Image
                        source={isDark ? require('../assets/images/dark/login_hero.webp') : require('../assets/images/login_hero.webp')}
                        style={dynamicStyles.heroImage}
                        resizeMode="cover"
                    />
                    <TouchableOpacity style={dynamicStyles.backBtnCircle} onPress={() => navigation.goBack()}>
                        <ChevronLeft size={24} color={isDark ? "#FFFFFF" : "#1A1A1A"} />
                    </TouchableOpacity>
                </View>

                {/* Body Details */}
                <View style={dynamicStyles.detailsBox}>
                    <Text style={dynamicStyles.stationTitle}>{stationDetails.name}</Text>
                    <Text style={dynamicStyles.stationSub}>{stationDetails.locationName || stationDetails.address || 'Nanded City'}</Text>

                    {/* Navigation/Support Pills Row */}
                    <View style={dynamicStyles.pillsRow}>
                        <TouchableOpacity style={dynamicStyles.pillButton} onPress={handleDirections}>
                            <Navigation size={16} color={theme.textPrimary} style={{ marginRight: 6 }} />
                            <Text style={dynamicStyles.pillText}>Navigate</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={dynamicStyles.pillButton} onPress={() => setShowEmergency(true)}>
                            <Headphones size={16} color={theme.textPrimary} style={{ marginRight: 6 }} />
                            <Text style={dynamicStyles.pillText}>Support</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={dynamicStyles.circleBtn} onPress={handleStationInfo}>
                            <Info size={16} color={theme.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={dynamicStyles.circleBtn} onPress={handleShare}>
                            <Share2 size={16} color={theme.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Summary 3-Column Card */}
                    <View style={dynamicStyles.summaryCard}>
                        <View style={dynamicStyles.summaryCol}>
                            <Zap size={20} color={theme.textPrimary} style={{ marginRight: 8 }} />
                            <View>
                                <Text style={dynamicStyles.summaryValue}>{stationChargers.length}</Text>
                                <Text style={dynamicStyles.summaryLabel}>Chargers</Text>
                            </View>
                        </View>
                        <View style={dynamicStyles.verticalDivider} />
                        <View style={dynamicStyles.summaryCol}>
                            <Clock size={20} color={theme.textPrimary} style={{ marginRight: 8 }} />
                            <View>
                                <Text style={dynamicStyles.summaryValue}>24/7</Text>
                                <Text style={dynamicStyles.summaryLabel}>Open</Text>
                            </View>
                        </View>
                        <View style={dynamicStyles.verticalDivider} />
                        <View style={dynamicStyles.summaryCol}>
                            <CreditCard size={20} color={theme.textPrimary} style={{ marginRight: 8 }} />
                            <View>
                                <Text style={dynamicStyles.summaryValue}>RFID</Text>
                                <Text style={dynamicStyles.summaryLabel}>Supported</Text>
                            </View>
                        </View>
                    </View>

                    {/* Available Chargers Section */}
                    <Text style={dynamicStyles.sectionHeader}>Available Chargers</Text>
                    
                    <View style={dynamicStyles.chargersList}>
                        {stationChargers.length > 0 ? (
                            stationChargers.map((charger, index) => {
                                const statusRaw = (charger.status || '').toString().trim().toUpperCase();
                                const isAvail = statusRaw === 'AVAILABLE' || statusRaw === 'ONLINE';
                                const isBusy = statusRaw === 'BUSY' || statusRaw === 'OCCUPIED' || statusRaw === 'CHARGING' || statusRaw === 'PREPARING' || statusRaw === 'FINISHING' || statusRaw === 'RESERVED' || statusRaw === 'SUSPENDEDEV' || statusRaw === 'SUSPENDEDEVSE';
                                const isFaulted = statusRaw === 'FAULTED';
                                const isOffline = statusRaw === 'OFFLINE' || statusRaw === 'UNAVAILABLE' || statusRaw === 'DISABLED' || (!isAvail && !isBusy && !isFaulted && statusRaw !== '');

                                let statusColor = '#00B074';
                                let statusText = 'Available';
                                let isCardDisabled = false;

                                if (isFaulted) {
                                    statusText = 'Faulted';
                                    statusColor = '#F44336';
                                    isCardDisabled = true;
                                } else if (isOffline) {
                                    statusText = 'Offline';
                                    statusColor = '#7E8E9F';
                                    isCardDisabled = true;
                                } else if (isBusy) {
                                    statusText = 'Busy';
                                    statusColor = '#FF9800';
                                    isCardDisabled = false;
                                }

                                return (
                                    <TouchableOpacity
                                        key={charger.id || index}
                                        style={[
                                            dynamicStyles.chargerCard,
                                            isCardDisabled && { opacity: 0.55 }
                                        ]}
                                        onPress={() => handleSelectCharger(charger)}
                                        disabled={isCardDisabled}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[dynamicStyles.cardIndicator, { backgroundColor: statusColor }]} />
                                        <View style={dynamicStyles.cardInner}>
                                            <View style={dynamicStyles.chargerIconCircle}>
                                                <Image
                                                    source={getConnectorIcon(charger.connectorType || charger.connector_type)}
                                                    style={{ width: 24, height: 24, tintColor: '#5A6B7C' }}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                            <View style={dynamicStyles.chargerMeta}>
                                                <Text style={dynamicStyles.chargerName}>
                                                    {charger.chargerName || charger.name || charger.connectorType || charger.connector_type || 'Type 1'} • {charger.chargerType || charger.type || 'AC'}
                                                </Text>
                                                <Text style={dynamicStyles.chargerSublabel}>
                                                    {charger.capacityKw || charger.max_power || charger.rate || '7.4'} kW • <Text style={{ color: statusColor, fontWeight: '700' }}>{statusText}</Text>
                                                </Text>
                                                <Text style={dynamicStyles.chargerRate}>
                                                    Rate: ₹{charger.billingRate || charger.price_per_kwh || charger.price || '18.00'}/kWh
                                                </Text>
                                            </View>
                                            <ChevronRight size={18} color={theme.textSecondary} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <Text style={dynamicStyles.emptyText}>No chargers available for this station.</Text>
                        )}
                    </View>

                    {/* Amenities Section */}
                    {displayCafes.length > 0 && (
                        <>
                            <Text style={dynamicStyles.sectionHeader}>Amenities</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dynamicStyles.chipsScroll} contentContainerStyle={{ gap: 8 }}>
                                {['All', 'Cafe', 'Malls', 'Restaurants'].map((category) => {
                                    const isActive = activeFilter === category;
                                    return (
                                        <TouchableOpacity
                                            key={category}
                                            style={[dynamicStyles.categoryChip, isActive && dynamicStyles.categoryChipActive]}
                                            onPress={() => setActiveFilter(category)}
                                        >
                                            <Text style={[dynamicStyles.categoryChipText, isActive && dynamicStyles.categoryChipTextActive]}>{category}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {filteredAmenities.length > 0 ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
                                    {filteredAmenities.map((cafe, index) => {
                                        const imageUrl = getCafeImageUrl(cafe);
                                        return (
                                            <View key={cafe.id || index} style={dynamicStyles.amenityCard}>
                                                <AmenityImage cafe={cafe} imageUrl={imageUrl} style={dynamicStyles.amenityImage} isDark={isDark} />
                                                <View style={dynamicStyles.amenityInfo}>
                                                    <Text style={dynamicStyles.amenityTitle} numberOfLines={1}>{cafe.name || cafe.title || 'Amenity'}</Text>
                                                    <View style={dynamicStyles.amenityMeta}>
                                                        <View style={dynamicStyles.ratingBox}>
                                                            <Star size={12} color="#FFD700" fill="#FFD700" style={{ marginRight: 4 }} />
                                                            <Text style={dynamicStyles.ratingVal}>{cafe.rating || '4.4'}</Text>
                                                        </View>
                                                        <Text style={dynamicStyles.amenityStatus}>{cafe.open !== false && cafe.isOpen !== false ? 'Open' : 'Closed'}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            ) : (
                                <Text style={dynamicStyles.emptyText}>No amenities found for this category.</Text>
                            )}
                        </>
                    )}

                    {/* Reviews & Ratings Section */}
                    <View style={{ marginTop: 24 }}>
                        <Text style={dynamicStyles.sectionHeader}>Ratings & Reviews</Text>
                        <StationReviewsTab stationId={stationDetails.id} stationName={stationDetails.name} />
                    </View>
                </View>
            </ScrollView>

            <EmergencyContactDialog
                visible={showEmergency}
                onClose={() => setShowEmergency(false)}
                stationId={stationDetails.id}
            />
        </View>
    );
}

const getStyles = (theme, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? '#212121' : theme.background,
    },
    scrollContent: {
        flexGrow: 1,
    },
    heroContainer: {
        width: '100%',
        height: 280,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    backBtnCircle: {
        position: 'absolute',
        top: 40,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(33, 33, 33, 0.85)' : 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    detailsBox: {
        paddingHorizontal: 20,
        paddingTop: 2,
    },
    stationTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: theme.textPrimary,
        marginBottom: 4,
    },
    stationSub: {
        fontSize: 14,
        color: theme.textSecondary,
        marginBottom: 20,
    },
    pillsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 10,
    },
    pillButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? '#2E2E2E' : theme.white,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 18,
    },
    pillText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.textPrimary,
    },
    circleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: isDark ? '#2E2E2E' : theme.white,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    summaryCard: {
        backgroundColor: isDark ? '#2A2A2A' : theme.cardBg,
        borderRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 12,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 28,
        borderWidth: isDark ? 0 : 0,
        borderColor: isDark ? '#333333' : 'transparent',
    },
    summaryCol: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.textPrimary,
    },
    summaryLabel: {
        fontSize: 10,
        color: theme.textSecondary,
    },
    verticalDivider: {
        width: 1,
        height: 30,
        backgroundColor: isDark ? '#383838' : theme.divider,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#333333' : theme.divider,
    },
    tabButton: {
        marginRight: 24,
        paddingVertical: 12,
    },
    activeTabButton: {
        borderBottomWidth: 3,
        borderBottomColor: '#00B074',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.textSecondary,
    },
    activeTabText: {
        color: theme.textPrimary,
        fontWeight: 'bold',
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.textPrimary,
        marginBottom: 16,
        marginTop: 8,
    },
    chargersList: {
        gap: 12,
        marginBottom: 24,
    },
    chargerCard: {
        backgroundColor: isDark ? '#2A2A2A' : theme.cardBg,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? '#333333' : 'transparent',
    },
    cardIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 5,
    },
    cardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingLeft: 18,
        paddingRight: 16,
    },
    chargerIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDark ? '#383838' : theme.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    chargerMeta: {
        flex: 1,
    },
    chargerName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.textPrimary,
        marginBottom: 2,
    },
    chargerSublabel: {
        fontSize: 11,
        color: theme.textSecondary,
        marginBottom: 2,
    },
    chargerRate: {
        fontSize: 11,
        color: theme.textSecondary,
    },
    emptyText: {
        fontSize: 13,
        color: theme.textSecondary,
        fontStyle: 'italic',
        paddingVertical: 10,
    },
    chipsScroll: {
        marginBottom: 16,
    },
    categoryChip: {
        backgroundColor: isDark ? '#2A2A2A' : theme.white,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDark ? '#383838' : theme.divider,
    },
    categoryChipActive: {
        backgroundColor: isDark ? '#00B074' : theme.textPrimary,
        borderColor: 'transparent',
    },
    categoryChipText: {
        fontSize: 12,
        color: isDark ? '#B0B0B0' : theme.textSecondary,
        fontWeight: '600',
    },
    categoryChipTextActive: {
        color: isDark ? '#FFFFFF' : theme.background,
    },
    amenityCard: {
        backgroundColor: isDark ? '#2A2A2A' : theme.cardBg,
        borderRadius: 18,
        width: 150,
        overflow: 'hidden',
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? '#333333' : 'transparent',
    },
    amenityImage: {
        width: '100%',
        height: 110,
    },
    amenityInfo: {
        padding: 12,
    },
    amenityTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.textPrimary,
        marginBottom: 4,
    },
    amenityMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ratingBox: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingVal: {
        fontSize: 11,
        color: theme.textSecondary,
    },
    amenityStatus: {
        fontSize: 11,
        color: '#00B074',
        fontWeight: '700',
    },
});
