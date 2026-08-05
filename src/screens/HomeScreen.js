import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar, Platform, Alert, Animated, Easing, ActivityIndicator, Linking, Share, Dimensions, LayoutAnimation, UIManager, ScrollView, PanResponder, DeviceEventEmitter, InteractionManager, AppState } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// import { BlurView } from "@react-native-community/blur";
// Custom Icons
// Custom Icons
import SearchIcon from '../assets/icons/Outlined/search_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
import HelpIcon from '../assets/icons/Outlined/help_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import NavigationIcon from '../assets/icons/Rounded Fill/navigation_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import ShareIcon from '../assets/icons/Rounded Fill/share_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import HomeIcon from '../assets/icons/Outlined/home_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
import HomeIconFilled from '../assets/icons/Rounded Fill/home_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import LibraryIcon from '../assets/icons/Outlined/library_books_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
import LibraryIconFilled from '../assets/icons/Rounded Fill/library_books_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import ScanIcon from '../assets/icons/Rounded Fill/qr_code_scanner_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import WalletIcon from '../assets/icons/Outlined/wallet_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import BellIcon from '../assets/icons/Outlined/notifications_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
import StationIcon from '../assets/icons/Outlined/ev_station_24dp_E3E3E3_FILL0_wght300_GRAD0_opsz24.svg';
import CafeIcon from '../assets/icons/Outlined/local_cafe_24dp_E3E3E3_FILL0_wght300_GRAD0_opsz24.svg';
import BoltIcon from '../assets/icons/Rounded Fill/bolt_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
const AnimatedBoltIcon = Animated.createAnimatedComponent(BoltIcon);

import BoltOutlineIcon from '../assets/icons/Outlined/bolt_24dp_E3E3E3_FILL0_wght300_GRAD0_opsz24.svg';
import MenuIcon from '../assets/icons/Rounded Fill/menu_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import WarningIcon from '../assets/icons/Rounded Fill/warning_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';

import mapStyle from '../assets/map style/mapStyle.json'
import mapStyleDark from '../assets/map style/mapStyleDark.json';

import { Colors, GlobalStyles } from '../styles/GlobalStyles';
import { useTheme } from '../context/ThemeContext';
import { ChevronRight, ChevronDown, Coffee, Utensils, Menu, CreditCard } from 'lucide-react-native';
import { MOCK_CAFES } from '../data/mockCafes';
import placesService from '../services/placesService';

import LibraryScreen from './LibraryScreen';
import TestScreen from './TestScreen';
import SideMenu from '../components/SideMenu';
import StationCardSkeleton from '../components/StationCardSkeleton';
import { stationsApi, locationsApi, chargersApi, sessionApi, notificationApi, reviewsApi, rfidApi, slotBookingApi } from '../services/api';
import { authService } from '../services/auth';
import { isBookingExpired } from '../utils/bookingUtils';
import { useAlert } from '../context/AlertContext';
import BackgroundLocationModal from '../components/BackgroundLocationModal';
import GetLocation from 'react-native-get-location';
import remoteConfig from '@react-native-firebase/remote-config'; // Firebase Remote Config
import { registerFCM } from '../services/fcmService';
import LoginRequiredDialog from '../components/LoginRequiredDialog';

import { useFocusEffect } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import { calculateDistance, getRawDistance } from '../utils/distanceUtils';
import { getConnectorIcon } from '../utils/connectorUtils';
import { parseMaintenanceDate, isTodayOrFuture } from '../utils/dateUtils';
import { shouldRespectMaintenance } from '../utils/devSettings';
import chargerStatusSync from '../services/chargerStatusSyncService';
import { LiveStationStatus, LiveConnectorPills } from '../components/LiveStationStatus';



const StarRating = ({ rating }) => {
    return (
        <View style={{ flexDirection: 'row' }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Text key={star} style={{ color: star <= Math.floor(rating) ? '#FFD700' : '#555', fontSize: 14 }}>
                    ★
                </Text>
            ))}
        </View>
    );
};

// const mapStyle = [
//     {
//   "variant": "dark",
//   "styles": [
//     {
//       "id": "infrastructure",
//       "geometry": {
//         "visible": false
//       },
//       "label": {
//         "visible": false
//       }
//     },
//     {
//       "id": "infrastructure.railwayTrack",
//       "geometry": {
//         "visible": true
//       }
//     },
//     {
//       "id": "infrastructure.roadNetwork",
//       "geometry": {
//         "visible": true
//       },
//       "label": {
//         "visible": true
//       }
//     },
//     {
//       "id": "infrastructure.transitStation",
//       "label": {
//         "visible": true
//       }
//     },
//     {
//       "id": "infrastructure.urbanArea",
//       "geometry": {
//         "visible": true
//       }
//     },
//     {
//       "id": "natural",
//       "geometry": {
//         "visible": false
//       },
//       "label": {
//         "visible": false
//       }
//     },
//     {
//       "id": "pointOfInterest",
//       "geometry": {
//         "visible": false
//       },
//       "label": {
//         "visible": false
//       }
//     },
//     {
//       "id": "political",
//       "geometry": {
//         "visible": true
//       },
//       "label": {
//         "visible": true
//       }
//     }
//   ]
// }
// ];

// Memoized StationMarkers component to prevent heavy map re-renders on every state change
const StationMarkers = React.memo(({
    isMaintenance,
    region,
    ZOOM_THRESHOLD_CITY,
    ZOOM_THRESHOLD_MID,
    clusters,
    stations,
    selectedStation,
    onStationPress,
    BoltIcon,
    CafeIcon,
    Colors,
    mapRef
}) => {
    if (isMaintenance) return null;

    if (region.latitudeDelta > ZOOM_THRESHOLD_CITY) {
        // STAGE 3: CITY CLUSTERS
        return clusters.city.map((cluster, index) => (
            <Marker
                key={`cluster_city_${index}`}
                coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
                onPress={() => {
                    const newRegion = {
                        latitude: cluster.latitude,
                        longitude: cluster.longitude,
                        latitudeDelta: 0.15,
                        longitudeDelta: 0.15,
                    };
                    onStationPress(null, newRegion);
                }}
                zIndex={100}
                tracksViewChanges={false}
            >
                <View style={styles.clusterContainer}>
                    <Text style={styles.clusterText}>{cluster.count}</Text>
                    <Text style={{ color: Colors.matteBlack, fontSize: 10, fontWeight: '600' }}>{cluster.name}</Text>
                </View>
            </Marker>
        ));

    } else if (region.latitudeDelta > ZOOM_THRESHOLD_MID) {
        // STAGE 2: MID CLUSTERS (Neighborhood)
        return clusters.city.map((cluster, index) => (
            <Marker
                key={`cluster_mid_${index}`}
                coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
                onPress={() => {
                    const newRegion = {
                        latitude: cluster.latitude,
                        longitude: cluster.longitude,
                        latitudeDelta: 0.04,
                        longitudeDelta: 0.04,
                    };
                    onStationPress(null, newRegion);
                }}
                zIndex={90}
                tracksViewChanges={false}
            >
                <View style={styles.midClusterContainer}>
                    <Text style={styles.midClusterText}>{cluster.count}</Text>
                </View>
            </Marker>
        ));

    } else {
        // STAGE 1: INDIVIDUAL PINS
        // Filter stations so that we only render markers that are within the current map viewport bounds
        const latDeltaHalf = (region.latitudeDelta || 0.04) / 2;
        const lngDeltaHalf = (region.longitudeDelta || 0.04) / 2;
        
        const minLat = region.latitude - latDeltaHalf;
        const maxLat = region.latitude + latDeltaHalf;
        const minLng = region.longitude - lngDeltaHalf;
        const maxLng = region.longitude + lngDeltaHalf;

        const visibleStations = stations.filter(station => {
            const lat = Number(station.latitude);
            const lng = Number(station.longitude);
            return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
        });

        return visibleStations.map((station, index) => {
            const isSelected = String(selectedStation?.id) === String(station.id);
            let MarkerIcon = BoltIcon;
            let baseColor = Colors.matteBlack;

            if (station.type === 'CAFE') {
                MarkerIcon = CafeIcon;
                baseColor = "#FF9800";
            }

            const bubbleColor = isSelected ? Colors.white : Colors.matteBlack;
            const iconFill = isSelected ? Colors.matteBlack : Colors.white;
            const borderWidth = isSelected ? 0 : 2;
            const borderColor = isSelected ? 'transparent' : Colors.white;

            return (
                <Marker
                    key={`station_${station.id}_${index}_${isSelected ? 'sel' : 'norm'}`}
                    coordinate={{ latitude: Number(station.latitude), longitude: Number(station.longitude) }}
                    onPress={() => onStationPress(station)}
                    zIndex={isSelected ? 20 : 10}
                    tracksViewChanges={false}
                >
                    <View style={[styles.markerContainer, { transform: [{ scale: isSelected ? 1.1 : 1 }] }]}>
                        <View style={[styles.markerBubble, { backgroundColor: bubbleColor, borderWidth: borderWidth, borderColor: borderColor }]}>
                            <MarkerIcon
                                width={22}
                                height={22}
                                fill={iconFill}
                            />
                        </View>
                        <View style={[styles.markerArrow, { borderTopColor: isSelected ? bubbleColor : borderColor, marginTop: -1 }]} />
                    </View>
                </Marker>
            );
        });
    }
}, (prev, next) => {
    return (
        prev.isMaintenance === next.isMaintenance &&
        prev.stations.length === next.stations.length &&
        prev.selectedStation?.id === next.selectedStation?.id &&
        Math.abs(prev.region.latitude - next.region.latitude) < 0.0001 &&
        Math.abs(prev.region.longitude - next.region.longitude) < 0.0001
    );
});

// High-performance spring scale animation wrapper for Station Cards
const AnimatedStationCard = React.memo(({ item, allChargers, throttledUserLocation, calculateDistance, handleCardPress }) => {
    const { theme, isDark } = useTheme();
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    const freshStatusesRef = React.useRef({});

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95, // scale down to 95% for nice press feedback
            useNativeDriver: true,
            tension: 400,
            friction: 15
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 400,
            friction: 15
        }).start();
    };

    // Initialize chargerList from allChargers directly with the backend status.
    const [chargerList, setChargerList] = useState(() => {
        return allChargers.filter(c => {
            const sId = c.stationId || c.station_id || (c.station && (c.station.id || c.station));
            return String(sId) === String(item.id);
        });
    });

    // Tracks whether real-time status has loaded at least once
    const [statusReady, setStatusReady] = useState(false);

    const chargerListRef = useRef(chargerList);
    useEffect(() => {
        chargerListRef.current = chargerList;
    }, [chargerList]);

    // When allChargers changes, merge all fields including status directly.
    useEffect(() => {
        const stationChargers = allChargers.filter(c => {
            const sId = c.stationId || c.station_id || (c.station && (c.station.id || c.station));
            return String(sId) === String(item.id);
        });
        if (stationChargers.length === 0) return;

        setChargerList(prevList => {
            const updatedList = [...prevList];
            stationChargers.forEach(nc => {
                const idx = updatedList.findIndex(c => c.id === nc.id);
                if (idx !== -1) {
                    const { status, ...nonStatus } = nc;
                    updatedList[idx] = { ...updatedList[idx], ...nonStatus };
                } else {
                    updatedList.push(nc);
                }
            });
            return updatedList;
        });
    }, [allChargers, item.id]);

    // Fetch real-time status for each charger on mount.
    const fetchFreshStatuses = useCallback(async () => {
        const currentList = chargerListRef.current;
        if (currentList && currentList.length > 0) {
            try {
                const updated = await Promise.all(
                    currentList.map(async (c) => {
                        const identifier = c.ocppId || c.boxId;
                        try {
                            let fresh = null;
                            if (identifier) {
                                fresh = await chargersApi.getChargerByOcppId(identifier);
                            } else {
                                fresh = await chargersApi.getChargerById(c.id);
                            }
                            if (fresh) {
                                freshStatusesRef.current[c.id] = fresh.status;
                                return { ...c, ...fresh };
                            }
                        } catch (err) {
                            console.log(`Failed to fetch fresh status for card charger ${c.id}:`, err.message);
                        }
                        return c;
                    })
                );
                setChargerList(updated);
                setStatusReady(true);
            } catch (err) {
                console.log("Error fetching card fresh statuses:", err);
            }
        }
    }, []);

    useEffect(() => {
        fetchFreshStatuses();
    }, [fetchFreshStatuses]);

    // Listen for targeted station status updates from sync service.
    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener(
            `station_chargers_updated_${item.id}`,
            ({ chargers: stationChargers }) => {
                if (stationChargers) {
                    setChargerList(prevList => {
                        const updatedList = [...prevList];
                        stationChargers.forEach(nc => {
                            const idx = updatedList.findIndex(c => c.id === nc.id);
                            if (idx !== -1) {
                                const { status, ...nonStatus } = nc;
                                updatedList[idx] = { ...updatedList[idx], ...nonStatus };
                            } else {
                                updatedList.push(nc);
                            }
                        });
                        return updatedList;
                    });
                    // Re-fetch real-time status after sync detects updates
                    fetchFreshStatuses();
                }
            }
        );
        return () => subscription.remove();
    }, [item.id, fetchFreshStatuses]);

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={{
                    width: Dimensions.get('window').width * 0.95,
                    marginRight: 16,
                    marginVertical: 18,
                }}
                activeOpacity={1}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => handleCardPress(item)}
            >
                {/* Station Card Shadow Wrapper */}
                <View style={{
                    borderRadius: 28,
                    backgroundColor: theme.white,
                    shadowColor: '#00000077',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: isDark ? 0.35 : 0.12,
                    shadowRadius: 18,
                    elevation: 6,
                    opacity: 0.98,
                }}>
                    {/* Inner Content Clip Container */}
                    <View style={{ borderRadius: 28, overflow: 'hidden' }}>
                        <View style={{ padding: 18 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <View style={{ flex: 1, paddingRight: 12 }}>
                                    <Text style={{ color: theme.textPrimary, fontSize: 18, fontWeight: '900', marginBottom: 4, fontFamily: 'DM Sans' }} numberOfLines={1}>{item.name}</Text>
                                    <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8, fontFamily: 'Geist' }} numberOfLines={2}>{item.location}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? theme.background : '#E2E7EC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 8 }}>
                                            <Text style={{ color: theme.textPrimary, fontSize: 11, fontWeight: '900', marginRight: 2, fontFamily: 'Geist' }}>★ {item.rating || '4.5'}</Text>
                                        </View>
                                        <LiveStationStatus stationId={item.id} initialChargers={chargerList} />
                                        <Text style={{ color: theme.divider, marginHorizontal: 8, fontFamily: 'Geist' }}>|</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <NavigationIcon width={14} height={14} fill={theme.textSecondary} style={{ marginRight: 4 }} />
                                            <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '700', fontFamily: 'Geist' }}>
                                                {throttledUserLocation ? calculateDistance(
                                                    throttledUserLocation.latitude,
                                                    throttledUserLocation.longitude,
                                                    item.latitude,
                                                    item.longitude
                                                ) : '--'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <Image source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7' }} style={{ width: 88, height: 100, borderRadius: 18, backgroundColor: theme.background }} />
                            </View>
                            <View style={{ height: 1, backgroundColor: theme.divider, marginBottom: 12 }} />
                            <View>
                                <LiveConnectorPills stationId={item.id} initialChargers={chargerList} />
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

const AnimatedLoadMoreCard = React.memo(({ onPress }) => {
    const { theme, isDark } = useTheme();
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
            tension: 400,
            friction: 15
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 400,
            friction: 15
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={{
                    width: Dimensions.get('window').width * 0.95,
                    marginRight: 16,
                    backgroundColor: 'transparent',
                    borderRadius: 28,
                }}
                activeOpacity={0.8}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
            >
                <View style={{ 
                    borderRadius: 28, 
                    backgroundColor: theme.cardBg, 
                    padding: 18,
                    height: 154, 
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: theme.divider,
                }}>
                    <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: isDark ? 'rgba(0, 176, 116, 0.2)' : 'rgba(0, 176, 116, 0.1)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 10
                    }}>
                        <Text style={{ color: '#00B074', fontSize: 22, fontWeight: 'bold' }}>+</Text>
                    </View>
                    <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '900', marginBottom: 4 }}>Load More Stations</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>Discover 5 more nearest charging stations</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});


export default function HomeScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const activeMapStyle = isDark ? mapStyleDark : mapStyle;
    const { showAlert } = useAlert();
    const [currentTab, setCurrentTab] = useState('Home');
    const [region, setRegion] = useState({
        latitude: 18.5204, // Pune approx
        longitude: 73.8567,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
        userLocation: null
    });

    const [stations, setStations] = useState([]);
    const [allChargers, setAllChargers] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [nearbyAmenities, setNearbyAmenities] = useState([]);
    const [visibleStationsCount, setVisibleStationsCount] = useState(5);

    // Throttled location for distance calculation (optimization)
    const [throttledUserLocation, setThrottledUserLocation] = useState(null);
    const lastLocationUpdateRef = useRef(0);
    const LOCATION_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes
    const [isLoading, setIsLoading] = useState(true);
    const [activeResumeSession, setActiveResumeSession] = useState(null);
    const [liveEnergy, setLiveEnergy] = useState(0);
    const [liveDuration, setLiveDuration] = useState('00:00');
    const [liveProgress, setLiveProgress] = useState(0);
    const [isSessionCheckComplete, setIsSessionCheckComplete] = useState(false); // Validating session
    const [unreadCount, setUnreadCount] = useState(0); // State for notifications
    const [activeBookingCount, setActiveBookingCount] = useState(0); // Active booking count
    const [isGuest, setIsGuest] = useState(false);
    const [loginPromptVisible, setLoginPromptVisible] = useState(false);
    const [loginPromptMessage, setLoginPromptMessage] = useState('');
    const [isLogoAnimEnabled, setIsLogoAnimEnabled] = useState(false); // Remote Config State regarding Logo Animation
    const [isMaintenance, setIsMaintenance] = useState(false); // Remote Config: maintenance_key
    const [rfidActive, setRfidActive] = useState(false);
    const [maintenanceDate, setMaintenanceDate] = useState(''); // Remote Config: maintenance_date
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [isSideMenuVisible, setIsSideMenuVisible] = useState(false);
    const [showBgLocationModal, setShowBgLocationModal] = useState(false);
    const skeletonOpacity = useRef(new Animated.Value(1)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const bottomUiFade = useRef(new Animated.Value(0)).current; // For fade-in animation
    const navTabAnim = React.useRef(new Animated.Value(0)).current;
    const mapRef = useRef(null);
    const qrGradientAnim = useRef(new Animated.Value(0)).current;
    const pollingLockedUntil = useRef(0);
    const lastFetchTime = useRef(0);
    const lastLocationFetchTime = useRef(0);



    const fetchUserLocation = async (force = false) => {
        if (!force && region.userLocation && Date.now() - lastLocationFetchTime.current < 30000) {
            console.log("Skipping fetchUserLocation as last location fetch was less than 30s ago.");
            return;
        }
        try {
            const location = await GetLocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 15000,
            });
            const userLoc = {
                latitude: location.latitude,
                longitude: location.longitude,
            };
            setThrottledUserLocation(userLoc);
            setRegion(prev => ({
                ...prev,
                userLocation: userLoc
            }));
            lastLocationFetchTime.current = Date.now();
        } catch (error) {
            console.warn("HomeScreen: Location fetch failed:", error);
        }
    };

    // Draggable Overlay Logic (Mocking TestScreen behavior)

    const homeTabStyle = {
        width: navTabAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [64, 30],
        }),
        backgroundColor: navTabAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['#ffffff', 'rgba(30,30,30,0)'],
        }),
    };

    const activityTabStyle = {
        width: navTabAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [30, 70],
        }),
        backgroundColor: navTabAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(30,30,30,0)', '#ffffff'],
        }),
    };

    const homeIconStyle1 = { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) };
    const homeIconStyle2 = { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) };
    const activityIconStyle1 = { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) };
    const activityIconStyle2 = { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) };
    const mapOpacityStyle = { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) };
    const activityScreenStyle = { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) };

    const sessionCardTranslateY = useRef(new Animated.Value(300)).current;

    const activeBoltPulseAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(activeBoltPulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(activeBoltPulseAnim, {
                    toValue: 0,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        pulseLoop.start();
        return () => pulseLoop.stop();
    }, [activeBoltPulseAnim]);

    // Live Tracking & Polling
    useEffect(() => {
        let durationInterval;
        let energyInterval;

        const formatDuration = (startMs) => {
            const now = Date.now();
            const diffSec = Math.floor((now - startMs) / 1000);
            if (diffSec < 0) return '00:00';
            const m = Math.floor((diffSec % 3600) / 60);
            const s = diffSec % 60;
            const h = Math.floor(diffSec / 3600);

            if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        const fetchEnergy = async () => {
            if (!activeResumeSession?.resumeSessionId) return;
            try {
                const energy = await sessionApi.getSessionEnergy(activeResumeSession.resumeSessionId);
                setLiveEnergy(energy);

                if (activeResumeSession.selectedKwh && activeResumeSession.selectedKwh > 0) {
                    let progress = (energy / activeResumeSession.selectedKwh) * 100;
                    if (progress > 100) progress = 100;
                    setLiveProgress(progress);
                } else {
                    setLiveProgress(0); // Indeterminate if no target set
                }
            } catch (e) {
                // Silent catch
            }
        };

        if (activeResumeSession?.startTime && activeResumeSession.status !== 'COMPLETED') {
            setLiveDuration(formatDuration(activeResumeSession.startTime));
            fetchEnergy();

            durationInterval = setInterval(() => {
                setLiveDuration(formatDuration(activeResumeSession.startTime));
            }, 1000);

            energyInterval = setInterval(() => {
                fetchEnergy();
            }, 10000); // User requested 10 secs min
        } else {
            setLiveDuration('00:00');
            setLiveEnergy(0);
            setLiveProgress(0);
        }

        return () => {
            if (durationInterval) clearInterval(durationInterval);
            if (energyInterval) clearInterval(energyInterval);
        };
    }, [activeResumeSession]);

    // Bounce in the session overlay when a session is found
    useEffect(() => {
        if (activeResumeSession) {
            Animated.spring(sessionCardTranslateY, {
                toValue: 0,
                useNativeDriver: true,
                friction: 8,
                tension: 40,
            }).start();
        } else {
            Animated.spring(sessionCardTranslateY, {
                toValue: 300,
                useNativeDriver: true,
                friction: 8,
                tension: 40,
            }).start();
        }
    }, [activeResumeSession, sessionCardTranslateY]);

    useEffect(() => {
        Animated.timing(qrGradientAnim, {
            toValue: 1,
            duration: 2000, // Slightly faster for a one-time 'in' effect
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
        }).start();
    }, [qrGradientAnim]);

    const qrRotate = qrGradientAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const ZOOM_THRESHOLD_MID = 0.5; // Switch from Pins to Mid-Clusters
    const ZOOM_THRESHOLD_CITY = 1.0; // Switch from Mid-Clusters to City Clusters

    // Unified Cluster Calculation
    const clusters = React.useMemo(() => {
        if (!stations.length) return { city: [], mid: [] };

        // 1. Group by City
        const cityGroups = {};
        stations.forEach(s => {
            const city = (s.city || 'Unknown').trim();
            if (!cityGroups[city]) cityGroups[city] = [];
            cityGroups[city].push(s);
        });

        // 2. Create City Clusters
        const cityClusters = Object.keys(cityGroups).map(city => {
            const group = cityGroups[city];
            const avgLat = group.reduce((sum, s) => sum + s.latitude, 0) / group.length;
            const avgLon = group.reduce((sum, s) => sum + s.longitude, 0) / group.length;
            return {
                id: `city-${city}`,
                latitude: avgLat,
                longitude: avgLon,
                count: group.length,
                name: city,
                type: 'city'
            };
        });

        // 3. Create Mid-Level Clusters (within cities potentially or simpler logic)
        // For now, let's just use simple grid clustering or just use city clusters.
        // Let's create 'Neighborhood' clusters for zoom level 12-14?
        // Simplifying: Mid-level clusters will be same as city for now or implementation skipped for brevity
        // and relying on map-clustering if we used a library.
        // Since we are manual, let's just return city clusters and we'll switch to pins.

        return { city: cityClusters, mid: [] };
    }, [stations]);

    // DERIVE ALL NEAREST STATIONS SORTED BY DISTANCE (Unlimited to ensure card exists for every map pin)
    const nearestStations = React.useMemo(() => {
        if (!throttledUserLocation) return stations;

        return [...stations]
            .map(s => ({
                ...s,
                _distance: getRawDistance(
                    throttledUserLocation.latitude,
                    throttledUserLocation.longitude,
                    s.latitude,
                    s.longitude
                )
            }))
            .sort((a, b) => a._distance - b._distance);
    }, [stations, throttledUserLocation]);

    const displayedStations = React.useMemo(() => {
        const sliced = nearestStations.slice(0, visibleStationsCount);
        if (nearestStations.length > visibleStationsCount) {
            return [...sliced, { id: 'LOAD_MORE_CARD', isLoadMoreCard: true }];
        }
        return sliced;
    }, [nearestStations, visibleStationsCount]);

    // Auto-focus nearest station on first location fix
    const hasAutoFocusedRef = useRef(false);
    useEffect(() => {
        const hasStationIdParam = !!route.params?.foundStationId;
        const hasStations = nearestStations.length > 0;
        if (throttledUserLocation && hasStations && !hasAutoFocusedRef.current && !hasStationIdParam) {
            hasAutoFocusedRef.current = true;
            const topStation = nearestStations[0];
            setSelectedStation(topStation);
            const newRegion = {
                latitude: Number(topStation.latitude),
                longitude: Number(topStation.longitude),
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
            };
            setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 1200);
        }
    }, [throttledUserLocation, nearestStations, route.params?.foundStationId]);


    // Moved Refs to Top Level to satisfy Rules of Hooks
    const isFetchingRef = useRef(false);
    const handleCardScrollRef = useRef(null);
    const isProgrammaticScrollRef = useRef(null);
    const programmaticScrollTimeoutRef = useRef(null);
    const flatListRef = useRef(null);

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0 && !viewableItems[0].item.isLoadMoreCard) {
            handleCardScrollRef.current?.(viewableItems[0].item);
        }
    }).current;
    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    // Creative/Dynamic Map Focus Logic for Card Scrolling
    const handleCardScroll = (station) => {
        // If we are currently scrolling programmatically to a specific station pin,
        // ignore intermediate viewable items to prevent animation conflicts.
        if (isProgrammaticScrollRef.current) {
            if (isProgrammaticScrollRef.current === station.id) {
                isProgrammaticScrollRef.current = null;
                if (programmaticScrollTimeoutRef.current) {
                    clearTimeout(programmaticScrollTimeoutRef.current);
                    programmaticScrollTimeoutRef.current = null;
                }
            }
            return;
        }

        if (selectedStation?.id === station.id) return;

        setSelectedStation(station); // Always highlight the marker

        // Check conditions:
        // 1. Is the map zoomed out too far (showing clusters instead of pins)?
        const isClustered = region.latitudeDelta > ZOOM_THRESHOLD_MID;

        // 2. Is station visible in viewport?
        const latDelta = region.latitudeDelta;
        const lngDelta = region.longitudeDelta;
        const latMin = region.latitude - (latDelta / 2) * 0.8;
        const latMax = region.latitude + (latDelta / 2) * 0.8;
        const lngMin = region.longitude - (lngDelta / 2) * 0.8;
        const lngMax = region.longitude + (lngDelta / 2) * 0.8;

        const isVisible = (
            station.latitude >= latMin &&
            station.latitude <= latMax &&
            station.longitude >= lngMin &&
            station.longitude <= lngMax
        );

        // Action:
        // If clustered -> Force Zoom In (to reveal pin)
        // If not clustered but off-screen -> Pan (keep zoom)
        if (isClustered || !isVisible) {
            const newRegion = {
                latitude: Number(station.latitude),
                longitude: Number(station.longitude),
                latitudeDelta: isClustered ? 0.04 : region.latitudeDelta, // Zoom in if clustered
                longitudeDelta: isClustered ? 0.04 : region.longitudeDelta,
            };
            mapRef.current?.animateToRegion(newRegion, 800);
            setRegion(newRegion);
        }
    };

    // Update ref effect
    useEffect(() => {
        handleCardScrollRef.current = handleCardScroll;
    });

    const getNearbyCafes = (station) => {
        if (!station) return [];

        // 1. Try direct city match
        let city = station.city;

        // 2. If no city, try to detect from location string
        if (!city && station.location) {
            if (station.location.includes('Pune')) city = 'Pune';
            else if (station.location.includes('Mumbai')) city = 'Mumbai';
            else if (station.location.includes('Bangalore') || station.location.includes('Bengaluru')) city = 'Bangalore';
            else if (station.location.includes('Delhi')) city = 'Delhi';
        }

        // 3. If still no city, try coordinate proximity (Fallback)
        if (!city) {
            const cities = {
                'Pune': { lat: 18.5204, lon: 73.8567 },
                'Mumbai': { lat: 19.0760, lon: 72.8777 },
                'Bangalore': { lat: 12.9716, lon: 77.5946 },
                'Delhi': { lat: 28.7041, lon: 77.1025 },
            };

            for (const [name, coords] of Object.entries(cities)) {
                const latDiff = Math.abs(station.latitude - coords.lat);
                const lonDiff = Math.abs(station.longitude - coords.lon);
                // Approx 30km radius check (0.3 degrees rough estimate)
                if (latDiff < 0.3 && lonDiff < 0.3) {
                    city = name;
                    break;
                }
            }
        }

        return city ? (MOCK_CAFES[city] || []) : [];
    };



    // Fetch Nearby Amenities
    useEffect(() => {
        if (selectedStation) {
            setNearbyAmenities([]);
            placesService.fetchNearbyAmenities(selectedStation.latitude, selectedStation.longitude)
                .then(items => {
                    if (items && items.length > 0) {
                        setNearbyAmenities(items);
                    } else {
                        console.log("Places API returned no results.");
                    }
                })
                .catch(err => {
                    console.log('Amenity fetch error:', err);
                });
        }
    }, [selectedStation]);


    // Fade In Bottom UI when ready
    useEffect(() => {
        if (!isLoading && isSessionCheckComplete) {
            Animated.timing(bottomUiFade, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [isLoading, isSessionCheckComplete, bottomUiFade]);

    // Fetch Notification Count
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const guest = await authService.isGuestMode();
                if (guest) {
                    setUnreadCount(0);
                    return;
                }
                const user = await authService.getUser();
                if (user) {
                    const countData = await notificationApi.getUnreadCount(user.id || user.userId);
                    const count = typeof countData === 'object' ? countData.count : countData;
                    setUnreadCount(Number(count) || 0);
                }
            } catch (e) {
                // Silent fail
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // 30s poll
        return () => clearInterval(interval);
    }, []);

    // Fetch Active Booking Count
    const fetchActiveBookingsCount = useCallback(async () => {
        try {
            const guest = await authService.isGuestMode();
            if (guest) {
                setActiveBookingCount(0);
                return;
            }
            const data = await slotBookingApi.getMyBookings();
            const bookingsList = data || [];
            const activeCount = bookingsList.filter(booking => {
                return !isBookingExpired(booking);
            }).length;
            setActiveBookingCount(activeCount);
        } catch (e) {
            // Silent fail
            console.log("[HomeScreen] Error fetching active bookings count:", e.message);
        }
    }, []);

    useEffect(() => {
        fetchActiveBookingsCount();
        const interval = setInterval(fetchActiveBookingsCount, 30000); // 30s poll
        return () => clearInterval(interval);
    }, [fetchActiveBookingsCount]);

    // Listen for Global API 401/429 Interceptor Events
    useEffect(() => {
        const loginSub = DeviceEventEmitter.addListener('show_login_prompt', (msg) => {
            triggerLoginPrompt(msg);
        });
        const toastSub = DeviceEventEmitter.addListener('show_rate_limit_toast', (msg) => {
            showAlert("Too Many Requests", msg || "Please wait a moment before trying again");
        });
        return () => {
            loginSub.remove();
            toastSub.remove();
        };
    }, []);

    const triggerLoginPrompt = (message = "Please login to access this feature") => {
        setLoginPromptMessage(message);
        setLoginPromptVisible(true);
    };

    useFocusEffect(
        useCallback(() => {
            const checkGuestStatus = async () => {
                const guest = await authService.isGuestMode();
                setIsGuest(guest);
            };
            checkGuestStatus();
            fetchActiveBookingsCount();
        }, [fetchActiveBookingsCount])
    );

    // Initialize FCM Push Notifications on startup/login
    useEffect(() => {
        const initFCM = async () => {
            const guest = await authService.isGuestMode();
            if (!guest) {
                registerFCM();
            }
        };
        initFCM();
    }, []);

    // AppState listener to refresh data when app returns from background
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active') {
                console.log("App returned to foreground, refreshing charger data...");
                fetchData(true); // Silent update
                checkActiveSession();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (Platform.OS === 'android') {
            if (UIManager.setLayoutAnimationEnabledExperimental) {
                UIManager.setLayoutAnimationEnabledExperimental(true);
            }
        }
    }, []);

    // Show background location consent popup once (first time user reaches HomeScreen)
    useEffect(() => {
        const checkBgLocationConsent = async () => {
            try {

                const alreadyShown = await authService.hasBgLocationConsentShown();
                if (!alreadyShown) {
                    // Small delay so the map / home UI renders first
                    setTimeout(() => setShowBgLocationModal(true), 800);
                }
            } catch (e) {
                console.warn('BG location/Survey consent check failed:', e);
            }
        };
        checkBgLocationConsent();
    }, []);


    // NOTE: In-app update check is handled on SplashScreen (shows a custom non-dismissable dialog).


    // Fetch Remote Config for Logo Animation + Maintenance Key
    useEffect(() => {
        const fetchRemoteConfig = async () => {
            try {
                // Set default values
                const defaults = {
                    logo_anim_enabled: false,
                    maintenance_key: false,
                    maintenance_date: '',
                };
                await remoteConfig().setDefaults(defaults);

                // Configure for dev/debugging (0 interval = instant fetch)
                await remoteConfig().setConfigSettings({
                    minimumFetchIntervalMillis: 0,
                });

                // Fetch and Activate
                await remoteConfig().fetchAndActivate();

                // Get logo anim value
                const logoAnimEnabled = remoteConfig().getValue('logo_anim_enabled').asBoolean();
                setIsLogoAnimEnabled(logoAnimEnabled);

                // Get maintenance key & date (controlled by Developer Settings toggle)
                const respectMaintenance = await shouldRespectMaintenance();
                if (!respectMaintenance) {
                    setIsMaintenance(false);
                    setMaintenanceDate('');
                } else {
                    const maintenanceEnabled = remoteConfig().getValue('maintenance_key').asBoolean();
                    const maintDateStr = remoteConfig().getValue('maintenance_date').asString();
                    setIsMaintenance(maintenanceEnabled);
                    setMaintenanceDate(maintDateStr);
                }
            } catch (error) {
                console.error('Firebase Remote Config Failed:', error);

                // Fallback attempt: read whatever is available/cached
                try {
                    const fallbackLogo = remoteConfig().getValue('logo_anim_enabled').asBoolean();
                    setIsLogoAnimEnabled(fallbackLogo);
                    const respectMaint = await shouldRespectMaintenance();
                    if (respectMaint) {
                        const fallbackMaint = remoteConfig().getValue('maintenance_key').asBoolean();
                        const fallbackDate = remoteConfig().getValue('maintenance_date').asString();
                        setIsMaintenance(fallbackMaint);
                        setMaintenanceDate(fallbackDate);
                    }
                } catch (e) {
                    setIsLogoAnimEnabled(false);
                    setIsMaintenance(false);
                    setMaintenanceDate('');
                }
            }
        };

        fetchRemoteConfig();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            let locationInterval = null;
            let sessionInterval = null;
            let syncBatchSub = null;

            const task = InteractionManager.runAfterInteractions(async () => {
                const guest = await authService.isGuestMode();

                checkActiveSession();
                checkRfidStatus();

                // Initial fetch - Only show loader if we have NO data
                fetchData(stations.length > 0);

                if (!guest) {
                    // Start high-frequency charger status sync (replaces the 30s full data poll)
                    // Seed the sync cache with existing chargers to prevent spurious first-poll events
                    chargerStatusSync.seedCache(allChargers);
                    chargerStatusSync.startSync();

                    // Listen for batch sync updates to keep allChargers ref in sync
                    syncBatchSub = DeviceEventEmitter.addListener('charger_sync_batch', ({ chargers }) => {
                        setAllChargers(chargers);
                    });

                    // Poll session every 10 seconds (Safety Check)
                    sessionInterval = setInterval(() => {
                        checkActiveSession();
                    }, 10000);
                }
            });

            // Fetch user location on focus
            fetchUserLocation();

            // Poll user location every 2 minutes
            locationInterval = setInterval(() => {
                fetchUserLocation();
            }, LOCATION_UPDATE_INTERVAL);

            // Listen for session stop events to clear state immediately
            const stopSub = DeviceEventEmitter.addListener('session_stopped', (id) => {
                console.log("HomeScreen received session_stopped for:", id);
                pollingLockedUntil.current = Date.now() + 20000;
                setActiveResumeSession(null);
            });

            return () => {
                task.cancel();
                if (locationInterval) clearInterval(locationInterval);
                chargerStatusSync.stopSync();
                if (syncBatchSub) syncBatchSub.remove();
                if (sessionInterval) clearInterval(sessionInterval);
                stopSub.remove();
            };
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [stations.length])
    );



    const checkActiveSession = async () => {
        const guest = await authService.isGuestMode();
        if (guest) {
            setIsSessionCheckComplete(true);
            return;
        }
        if (Date.now() < pollingLockedUntil.current) {
            console.log("Skipping active session check: polling is currently locked.");
            return;
        }
        try {
            const user = await authService.getUser();
            if (user) {
                const userId = user.id || user.userId || user.email; // Fallback
                console.log("Checking active session for user:", userId);

                if (!userId) return;

                const activeSession = await sessionApi.getActiveSession(userId);

                if (activeSession && activeSession.sessionId) {

                    const resumeData = {
                        resumeSessionId: activeSession.sessionId,
                        chargerId: activeSession.chargerId,
                        boxId: activeSession.boxId,
                        stationId: activeSession.stationId,
                        stationName: activeSession.stationName || 'Unknown Station',
                        startTime: activeSession.startTime,
                        selectedKwh: activeSession.selectedKwh, // Critical for % calc
                        amountEntered: activeSession.amountEntered,
                        chargingMode: activeSession.chargingMode,
                        planId: activeSession.planId,
                        rate: activeSession.rate,
                        connectorType: activeSession.connectorType,
                        chargerType: activeSession.chargerType,
                        durationMin: activeSession.durationMin
                    };

                    // If user manually minimized or navigated back, show Overlay
                    setActiveResumeSession(resumeData);
                } else {
                    setActiveResumeSession(null);
                }
            }
        } catch (e) {
            console.log("No active session to resume or error checking:", e.message);
        } finally {
            setIsSessionCheckComplete(true);
        }
    };

    const checkRfidStatus = async () => {
        const guest = await authService.isGuestMode();
        if (guest) {
            setRfidActive(false);
            return;
        }
        try {
            const apps = await rfidApi.getMyRfidApplications();
            if (apps && apps.length > 0) {
                const sorted = [...apps].sort((a, b) => b.id - a.id);
                const latest = sorted[0];
                const isActive = latest?.assignedCard?.active ?? false;
                setRfidActive(isActive);
            } else {
                setRfidActive(false);
            }
        } catch (error) {
            console.warn("HomeScreen: Failed to fetch RFID status:", error.message);
            setRfidActive(false);
        }
    };

    // Handle Station Found from QR Scanner
    useEffect(() => {
        if (route.params?.foundStationId && stations.length > 0) {
            const stationId = route.params.foundStationId;
            const station = stations.find(s => s.id === stationId);
            if (station) {
                // Determine if specific charger was requested (optional, for future)
                // const chargerId = route.params.foundChargerId;

                setSelectedStation(station);
                const newRegion = {
                    latitude: Number(station.latitude),
                    longitude: Number(station.longitude),
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                };
                setRegion(newRegion);
                mapRef.current?.animateToRegion(newRegion, 1000);

                setRegion(newRegion);
                mapRef.current?.animateToRegion(newRegion, 1000);

                const chargerId = route.params.foundChargerId;
                const charger = allChargers.find(c => c.id === chargerId) || allChargers.find(c => c.stationId === station.id);

                if (charger) {
                    navigation.navigate('Config', {
                        stationId: station.id,
                        stationName: station.name || station.stationName,
                        chargerId: charger.id,
                        boxId: charger.ocppId || charger.boxId,
                        chargerType: charger.chargerType || charger.type,
                        maxPower: charger.maxPower || charger.power,
                        connectorType: charger.connectorType,
                        status: charger.status,
                        latitude: station.latitude,
                        longitude: station.longitude,
                        rate: charger.rate || station.rate || '0',
                        platformFeePerKwh: charger.platformFeePerKwh
                    });
                } else {
                    const stationChargers = allChargers.filter(c => {
                        const sId = c.stationId || c.station_id || (c.station && (c.station.id || c.station));
                        return String(sId) === String(station.id);
                    });
                    navigation.navigate('StationDetails', {
                        station: station,
                        chargers: stationChargers,
                        nearbyCafes: nearbyAmenities
                    });
                }

                // Reset params so it doesn't trigger again
                navigation.setParams({ foundStationId: null, foundChargerId: null });
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route.params?.foundStationId, stations]);



    useEffect(() => {
        if (!isLoading && isSessionCheckComplete) {
            Animated.parallel([
                Animated.timing(skeletonOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(contentOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]).start(() => setShowSkeleton(false));
        } else if (isLoading || !isSessionCheckComplete) {
            setShowSkeleton(true);
            skeletonOpacity.setValue(1);
            contentOpacity.setValue(0);
        }
    }, [isLoading, isSessionCheckComplete, contentOpacity, skeletonOpacity]);

    const handleTabChange = (tab) => {
        // Layout animation for lively layout shifting (capsule expansion & screen fade)
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        // Manual Animated control
        setCurrentTab(tab);

        // Animate Tab highlight/position
        Animated.timing(navTabAnim, {
            toValue: tab === 'Home' ? 0 : 1,
            duration: 250,
            useNativeDriver: false, // Color and width interpolation don't always support native driver
        }).start();

        // Animate Overlay Transition: Slide bounce out when not Home, bounce in when Home
        const COLLAPSED_Y = 100;
        const OUT_Y = 300;

        Animated.spring(sessionCardTranslateY, {
            toValue: tab === 'Home' ? 0 : 300,
            useNativeDriver: true,
            speed: 12,
            bounciness: 4,
        }).start();
    };

    /**
     * Handle Tab Switching via External Navigation (e.g. SideMenu)
     */
    useEffect(() => {
        if (route.params?.tab) {
            handleTabChange(route.params.tab);
            navigation.setParams({ tab: undefined }); // Clear param
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route.params?.tab]);

    const fetchData = async (silent = false) => {
        if (isFetchingRef.current) return;
        
        // Skip silent/background updates if data was fetched less than 30 seconds ago
        if (silent && stations.length > 0 && (Date.now() - lastFetchTime.current < 30000)) {
            console.log("Skipping fetchData as last fetch was less than 30s ago.");
            return;
        }

        isFetchingRef.current = true;
        try {
            if (!silent && stations.length === 0) setIsLoading(true);
            // console.log("Fetching real data from backend..."); // Reduce log spam on polling

            const isGuest = await authService.isGuestMode();
            const token = await authService.getToken();
            if (!token && !isGuest) {
                console.warn("No auth token found, skipping API calls and using fallback.");
                throw new Error("No auth token");
            }

            const [stationsData, locationsData, chargersData] = await Promise.all([
                stationsApi.getAllStations().catch(err => {
                    console.warn("Failed to fetch stations:", err);
                    return null;
                }),
                locationsApi.getAllLocations().catch(err => {
                    console.warn("Failed to fetch locations:", err);
                    return [];
                }),
                chargersApi.getAllChargers().catch(err => {
                    console.warn("Failed to fetch chargers:", err);
                    return [];
                })
            ]);

            if (!stationsData) throw new Error("Stations API failed");

            const validStations = Array.isArray(stationsData) ? stationsData : (stationsData?.stations || []);
            const validLocations = Array.isArray(locationsData) ? locationsData : (locationsData?.locations || []);
            const validChargers = Array.isArray(chargersData) ? chargersData : (chargersData?.chargers || []);

            setAllChargers(validChargers);

            const locationsMap = new Map();
            if (Array.isArray(validLocations)) {
                validLocations.forEach(loc => locationsMap.set(loc.id, loc));
            }

            const mergedStations = validStations.map((st, index) => {
                const loc = locationsMap.get(st.locationId) ||
                    (st.locationName ? Array.from(locationsMap.values()).find(l => l.name === st.locationName) : null);

                let lat = 18.5204;
                let lng = 73.8567;

                if (loc && loc.latitude && loc.longitude) {
                    lat = parseFloat(loc.latitude);
                    lng = parseFloat(loc.longitude);
                } else if (st.latitude && st.longitude) {
                    lat = parseFloat(st.latitude);
                    lng = parseFloat(st.longitude);
                } else {
                    lat = 18.5204 + (index * 0.01);
                    lng = 73.8567 + (index * 0.005);
                }

                // Infer Type
                let type = 'STATION';
                if ((st.name && st.name.toLowerCase().includes('cafe')) ||
                    (st.location && st.location.toLowerCase().includes('cafe'))) {
                    type = 'CAFE';
                }

                return {
                    ...st,
                    latitude: lat,
                    longitude: lng,
                    location: loc ? `${loc.address || ''}, ${loc.city || ''}` : (st.locationName || 'Unknown Location'),
                    city: loc?.city || 'Unknown',
                    image_url: st.imageUrl || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
                    chargerId: st.id ? `STN-${st.id}` : 'UNKNOWN',
                    chargerType: 'Fast',
                    type: type
                };
            });

            // Fetch dynamic ratings
            let stationsWithRatings = mergedStations;
            if (!isGuest) {
                stationsWithRatings = await Promise.all(mergedStations.map(async (st) => {
                    if (st.type === 'CAFE') return st;
                    try {
                        const summary = await reviewsApi.getStationRatingSummary(st.id);
                        if (summary) {
                            return {
                                ...st,
                                rating: summary.averageRating ? Number(summary.averageRating).toFixed(1) : (st.rating || '4.5'),
                                reviewCount: summary.totalReviews || 0
                            };
                        }
                        return st;
                    } catch (e) {
                        return st;
                    }
                }));
            }

            if (stationsWithRatings.length === 0) throw new Error("No stations found");

            setStations(stationsWithRatings);

            // Only update Map Region on INITIAL LOAD (when stations were empty)
            if (stations.length === 0 && stationsWithRatings.length > 0) {
                let targetStation = stationsWithRatings[0];
                let initialRegion = {
                    latitude: targetStation.latitude,
                    longitude: targetStation.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                };

                if (throttledUserLocation) {
                    let minDistance = Infinity;
                    stationsWithRatings.forEach(s => {
                        const dist = getRawDistance(
                            throttledUserLocation.latitude,
                            throttledUserLocation.longitude,
                            s.latitude,
                            s.longitude
                        );
                        if (dist < minDistance) {
                            minDistance = dist;
                            targetStation = s;
                        }
                    });

                    initialRegion = {
                        latitude: Number(targetStation.latitude),
                        longitude: Number(targetStation.longitude),
                        latitudeDelta: 0.04,
                        longitudeDelta: 0.04,
                    };
                    hasAutoFocusedRef.current = true; // Mark as auto-focused to avoid double animation
                }

                setRegion(initialRegion);

                // Animate only once
                setTimeout(() => {
                    mapRef.current?.animateToRegion(initialRegion, 1000);
                }, 500);

                setSelectedStation(targetStation);
            } else if (selectedStation) {
                // Update currently selected station with new data (to show new rating immediately)
                const updated = stationsWithRatings.find(s => s.id === selectedStation.id);
                if (updated) setSelectedStation(updated);
            }

            // Broadcast updated chargers and stations for other screens
            DeviceEventEmitter.emit('chargers_updated', {
                chargers: validChargers,
                stations: stationsWithRatings
            });

            lastFetchTime.current = Date.now();
        } catch (error) {
            console.error("Fetching real data failed:", error);
            setStations([]);
            setSelectedStation(null);
            setAllChargers([]);
        } finally {
            isFetchingRef.current = false;
            setIsLoading(false);
        }
    };

    const handleStationPress = (station) => {
        isProgrammaticScrollRef.current = station.id;
        setSelectedStation(station);
        const newRegion = {
            latitude: Number(station.latitude),
            longitude: Number(station.longitude),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);

        // Find the index of the pressed station in the list and scroll to it smoothly
        const index = nearestStations.findIndex(s => s.id === station.id);
        if (index !== -1) {
            if (index >= visibleStationsCount) {
                setVisibleStationsCount(Math.ceil((index + 1) / 5) * 5);
            }
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index, animated: true });
            }, 100);
        }

        // Set safety timeout to clear lock ref in case the list was already at/near the target
        if (programmaticScrollTimeoutRef.current) {
            clearTimeout(programmaticScrollTimeoutRef.current);
        }
        programmaticScrollTimeoutRef.current = setTimeout(() => {
            isProgrammaticScrollRef.current = null;
        }, 1000);
    };

    // Creative/Dynamic Map Focus Logic for Card Scrolling
    // Moved handleCardScroll to top-level to fix React Hook rules



    const handleCardPress = (station) => {
        const targetStation = station || selectedStation;
        if (targetStation) {
            const stationChargers = allChargers.filter(c => {
                const sId = c.stationId || c.station_id || (c.station && (c.station.id || c.station));
                return String(sId) === String(targetStation.id);
            });
            navigation.navigate('StationDetails', {
                station: targetStation,
                chargers: stationChargers,
                nearbyCafes: nearbyAmenities
            });
        }
    };

    const handleDirections = () => {
        if (!selectedStation) return;
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${selectedStation.latitude},${selectedStation.longitude}`;
        const label = selectedStation.name;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        Linking.openURL(url);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this charging station: ${selectedStation?.name || 'Bentork Station'}`,
            });
        } catch (error) {
            showAlert("Error", error.message);
        }
    };

    const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0);
    const bottomNavHeight = 80 + (Platform.OS === 'ios' ? safeBottom / 2 : safeBottom);

    const parsedMDate = parseMaintenanceDate(maintenanceDate);
    const isMaintUpcoming = !!(parsedMDate && isTodayOrFuture(parsedMDate) && !isMaintenance);
    const isMaintenanceBannerActive = isMaintenance || isMaintUpcoming;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header (Single Top Floating Glassmorphism Capsule containing Menu, Centered Logo, and Action Buttons) */}
            <View style={[styles.headerContainer, { backgroundColor: 'transparent', top: Platform.OS === 'ios' ? -10 : 0 }]}>
                <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isDark ? '#1d1d1dfc' : theme.white,
                        borderRadius: 30,
                        height: 58,
                        paddingHorizontal: 14,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                        elevation: 8,
                        opacity: 0.95,
                        marginTop: 14,
                        position: 'relative',
                    }}>
                        {/* Left Side: Hamburger Menu */}
                        <TouchableOpacity 
                            onPress={() => setIsSideMenuVisible(true)} 
                            style={{ padding: 4, zIndex: 2 }}
                            activeOpacity={0.7}
                        >
                            <MenuIcon width={26} height={26} fill={theme.textPrimary} />
                        </TouchableOpacity>

                        {/* Center: Logo (Centered absolutely, size UNCHANGED) */}
                        <View style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            zIndex: 1,
                        }}>
                            {isLogoAnimEnabled ? (
                                <LottieView
                                    source={require('../assets/lottie/bentork_anim.json')}
                                    autoPlay
                                    loop
                                    style={{ width: 100, height: 40, borderWidth: 1, borderColor: theme.divider, borderRadius: 8 }}
                                    resizeMode="contain"
                                />
                            ) : (
                                <Image
                                    source={require('../assets/images/logo.png')}
                                    style={{ width: 80, height: 28 }}
                                    resizeMode="contain"
                                    tintColor={theme.textPrimary}
                                />
                            )}
                        </View>

                        {/* Right Side: Action Icons (Card, Search, Notification) */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, zIndex: 2 }}>
                            {/* RFID Card */}
                            {currentTab !== 'Activity' && rfidActive && (
                                <TouchableOpacity 
                                    style={{ padding: 6 }} 
                                    onPress={() => navigation.navigate('RfidApplication')}
                                    activeOpacity={0.7}
                                >
                                    <CreditCard size={20} color={theme.textPrimary} />
                                </TouchableOpacity>
                            )}

                            {/* Search */}
                            {currentTab !== 'Activity' && (
                                <TouchableOpacity 
                                    style={{ padding: 6 }} 
                                    onPress={() => navigation.navigate('Search')}
                                    activeOpacity={0.7}
                                >
                                    <SearchIcon width={20} height={20} fill={theme.textPrimary} />
                                </TouchableOpacity>
                            )}

                            {/* Notification */}
                            <TouchableOpacity
                                style={{ padding: 6, position: 'relative' }}
                                onPress={() => {
                                    if (isGuest) {
                                        triggerLoginPrompt("Sign in to view your notifications");
                                    } else {
                                        navigation.navigate('Notification');
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <BellIcon width={20} height={20} fill={theme.textPrimary} />
                                {unreadCount > 0 && (
                                    <View style={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        width: 7,
                                        height: 7,
                                        borderRadius: 4,
                                        backgroundColor: '#00B074',
                                    }} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            {/* Floating Active Session Button (Positioned Below Top App Bar on the Right) */}
            {currentTab !== 'Activity' && activeResumeSession && (
                <TouchableOpacity
                    style={{
                        position: 'absolute',
                        top: Platform.OS === 'ios' ? 115 : 125,
                        right: 18,
                        backgroundColor: isDark ? '#1d1d1dfc' : theme.white,
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        elevation: 8,
                        zIndex: 100,
                    }}
                    onPress={() => navigation.navigate('ActiveSessions')}
                    activeOpacity={0.8}
                >
                    <View style={styles.activeIndicatorContainer}>
                        <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                            {/* Base Green Bolt Icon */}
                            <BoltIcon width={22} height={22} fill={Colors.statusGreen} />
                            
                            {/* Smooth Lighter Green Overlay Bolt Icon */}
                            <Animated.View style={[StyleSheet.absoluteFill, { opacity: activeBoltPulseAnim }]}>
                                <BoltIcon width={22} height={22} fill="#86EFAC" />
                            </Animated.View>
                        </View>

                        <View style={[
                            styles.activePulseDot,
                            {
                                backgroundColor: Colors.statusGreen,
                                borderColor: isDark ? '#1d1d1dfc' : theme.white,
                            }
                        ]} />
                    </View>
                </TouchableOpacity>
            )}


            {/* Main Content Area (Map + Activity) */}
            <View style={{ flex: 1, position: 'relative' }}>

                {/* Map (Persisted) */}
                <Animated.View
                    pointerEvents={currentTab === 'Home' ? 'auto' : 'none'}
                    style={[
                        StyleSheet.absoluteFill, mapOpacityStyle
                    ]}
                >
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        customMapStyle={activeMapStyle}
                        mapType="standard"
                        style={styles.map}
                        initialRegion={region}
                        showsTraffic={false}
                        showsIndoors={false}
                        showsUserLocation={false}
                        onRegionChangeComplete={(r) => setRegion(prev => ({ ...r, userLocation: prev.userLocation }))}
                    >
                        <StationMarkers
                            isMaintenance={isMaintenance}
                            region={region}
                            ZOOM_THRESHOLD_CITY={ZOOM_THRESHOLD_CITY}
                            ZOOM_THRESHOLD_MID={ZOOM_THRESHOLD_MID}
                            clusters={clusters}
                            stations={stations}
                            selectedStation={selectedStation}
                            onStationPress={(station, newRegion) => {
                                if (newRegion) {
                                    setRegion(newRegion);
                                    mapRef.current?.animateToRegion(newRegion, 800);
                                } else {
                                    handleStationPress(station);
                                }
                            }}
                            BoltIcon={BoltIcon}
                            CafeIcon={CafeIcon}
                            Colors={Colors}
                        />
                    </MapView>
                </Animated.View>

                {/* Floating Controls (Home Only) - Still absolute over Map */}
                <Animated.View
                    pointerEvents={currentTab === 'Home' ? 'box-none' : 'none'}
                    style={
                        [
                            StyleSheet.absoluteFill, mapOpacityStyle, { zIndex: 20 }
                        ]}
                >


                    {/* Stations Horizontal Scroll List */}
                    {
                        !activeResumeSession && !isLoading && !isMaintenance && (
                            <Animated.FlatList
                                ref={flatListRef}
                                data={displayedStations}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                snapToInterval={Dimensions.get('window').width * 0.95 + 16}
                                decelerationRate="fast"
                                contentContainerStyle={{ paddingHorizontal: (Dimensions.get('window').width - (Dimensions.get('window').width * 0.95)) / 2 }}
                                keyExtractor={(item, index) => `${item.id}_${index}`}
                                onViewableItemsChanged={onViewableItemsChanged}
                                viewabilityConfig={viewabilityConfig}
                                getItemLayout={(data, index) => {
                                    const cardWidth = Dimensions.get('window').width * 0.95 + 16;
                                    return {
                                        length: cardWidth,
                                        offset: cardWidth * index,
                                        index,
                                    };
                                }}
                                renderItem={({ item }) => {
                                    if (item.isLoadMoreCard) {
                                        return (
                                            <AnimatedLoadMoreCard
                                                onPress={() => setVisibleStationsCount(prev => prev + 5)}
                                            />
                                        );
                                    }

                                    return (
                                        <AnimatedStationCard
                                            item={item}
                                            allChargers={allChargers}
                                            throttledUserLocation={throttledUserLocation}
                                            calculateDistance={calculateDistance}
                                            handleCardPress={handleCardPress}
                                        />
                                    );
                                }}
                                style={{ position: 'absolute', bottom: bottomNavHeight + 10, left: 0, right: 0, zIndex: 10, opacity: contentOpacity }}
                            />
                        )
                    }


                </Animated.View>

                {/* Activity Screen (Persisted) */}
                <Animated.View
                    pointerEvents={currentTab === 'Activity' ? 'auto' : 'none'}
                    style={[{ flex: 1, paddingTop: 100, ...StyleSheet.absoluteFillObject }, activityScreenStyle]}
                >
                    <LibraryScreen navigation={navigation} activeBookingCount={activeBookingCount} />
                </Animated.View>

            </View>
            <View style={[styles.bottomTabBarContainer, { bottom: safeBottom + 6 }]}>
                {/* Nav Capsule */}
                <View style={[styles.tabCapsule, { backgroundColor: isDark ? 'rgba(30, 27, 32, 0.92)' : 'rgba(255, 255, 255, 0.92)' }]}>
                    <TouchableOpacity 
                        style={[
                            styles.tabBtn, 
                            currentTab === 'Home' && [styles.tabBtnActive, { backgroundColor: isDark ? '#A7F3D0' : '#2e2e2e' }]
                        ]} 
                        onPress={() => handleTabChange('Home')}
                        activeOpacity={0.8}
                    >
                        {currentTab === 'Home' ? (
                            <HomeIconFilled width={18} height={18} fill={isDark ? '#1A1A1A' : '#FFFFFF'} />
                        ) : (
                            <HomeIcon width={18} height={18} fill={theme.textPrimary} />
                        )}
                        {currentTab === 'Home' && <Text style={[styles.tabBtnText, { color: isDark ? '#1A1A1A' : '#FFFFFF' }]}>Home</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[
                            styles.tabBtn, 
                            currentTab === 'Activity' && [styles.tabBtnActive, { backgroundColor: isDark ? '#A7F3D0' : '#2e2e2e' }]
                        ]} 
                        onPress={() => handleTabChange('Activity')}
                        activeOpacity={0.8}
                    >
                        {currentTab === 'Activity' ? (
                            <LibraryIconFilled width={18} height={18} fill={isDark ? '#1A1A1A' : '#FFFFFF'} />
                        ) : (
                            <LibraryIcon width={18} height={18} fill={theme.textPrimary} />
                        )}
                        {currentTab === 'Activity' && <Text style={[styles.tabBtnText, { color: isDark ? '#1A1A1A' : '#FFFFFF' }]}>Activity</Text>}
                    </TouchableOpacity>
                </View>

                {/* Floating QR Scanner Button */}
                <TouchableOpacity 
                    style={[styles.qrFloatingButton, { backgroundColor: isDark ? 'rgba(30, 27, 32, 0.92)' : 'rgba(255, 255, 255, 0.92)' }]}
                    onPress={() => {
                        if (isGuest) {
                            triggerLoginPrompt("Sign in to start charging your EV");
                        } else if (isMaintenance) {
                            showAlert("Maintenance in Progress", "QR Scanning is currently unavailable.");
                        } else {
                            navigation.navigate('QRScanner', { stations, allChargers });
                        }
                    }}
                    activeOpacity={0.8}
                >
                    <ScanIcon width={22} height={22} fill={theme.textPrimary} />
                </TouchableOpacity>
            </View>



            <SideMenu
                visible={isSideMenuVisible}
                onClose={() => setIsSideMenuVisible(false)}
                navigation={navigation}
            />

            {/* Background Location Consent – shown once on first HomeScreen visit */}
            <BackgroundLocationModal
                visible={showBgLocationModal}
                onDone={() => {
                    setShowBgLocationModal(false);
                    fetchUserLocation();
                }}
            />

            {/* Maintenance Banner – Positioned high but below top bar */}
            {currentTab === 'Home' && !isSideMenuVisible && (() => {
                if (!isMaintenanceBannerActive) return null;

                const isOngoing = isMaintenance;
                const title = isOngoing ? "Ongoing Maintenance" : "Upcoming Maintenance Break";
                const subtitle = isOngoing
                    ? "Some services are temporarily unavailable. We appreciate your patience."
                    : `On ${maintenanceDate}, some services will be unavailable. Please plan accordingly.`;

                return (
                    <View style={styles.maintenanceBanner}>
                        <View style={styles.maintenanceBannerIcon}>
                            <WarningIcon width={20} height={20} fill="#FFAB00" />
                        </View>
                        <View style={styles.maintenanceBannerContent}>
                            <Text style={styles.maintenanceBannerTitle}>{title}</Text>
                            <Text style={styles.maintenanceBannerSubtitle}>{subtitle}</Text>
                        </View>
                    </View>
                );
            })()}



            {/* Global Login Required Prompt Dialog */}
            <LoginRequiredDialog
                visible={loginPromptVisible}
                contextMessage={loginPromptMessage}
                onLoginPress={() => {
                    setLoginPromptVisible(false);
                    navigation.navigate('Login', {
                        returnRoute: 'Home',
                    });
                }}
                onClose={() => setLoginPromptVisible(false)}
            />
        </View>
    );
}


const styles = StyleSheet.create({
    
    container: {
        flex: 1,
        backgroundColor: '#D0D6DB',
    },
    map: {
        ...StyleSheet.absoluteFill,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 20,
        paddingBottom: 15,
        zIndex: 10,
        elevation: 0,
    },
    maintenanceBanner: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 95, // Adjust to float below the solid header
        left: 10,
        right: 10,
        zIndex: 50,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.matteBlack,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#444',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },  
    maintenanceBannerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 171, 0, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    maintenanceBannerContent: {
        flex: 1,
    },
    maintenanceBannerTitle: {
        color: '#ffda53ff',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    maintenanceBannerSubtitle: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 11,
        lineHeight: 15,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 16,
    },
    logo: {
        width: 100,
        height: 50,
    },
    headerIcons: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
    },
    headerIconButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 5,
        elevation: 3,
        opacity: 0.9,
    },
    iconBtn: {
        marginLeft: 20,
    },
    // Mock Overlay Styles
    mockOverlayWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        paddingHorizontal: 0,
        marginBottom: -12,
        zIndex: 100, // Above Map, Behind Navbar (200)
    },
    mockOverlayCard: {
        backgroundColor: Colors.matteBlack,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 16,
        paddingBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    mockHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 18,
        marginBottom: 42,
        gap: 6,
    },
    mockDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.statusGreen,
    },
    mockTitle: {
        color: '#999',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    mockStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    mockLabel: {
        color: '#777',
        fontSize: 13,
        fontWeight: '600',
    },
    mockValue: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        marginTop: 4,
    },
    mockUnit: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    mockProgressTrack: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    mockProgressFill: {
        height: '100%',
        backgroundColor: Colors.statusGreen,
        borderRadius: 4,
    },
    mockProgressInfo: {
        color: Colors.statusGreen,
        fontSize: 13,
        fontWeight: '700',
    },
    mockProgressDetail: {
        color: '#555',
        fontSize: 12,
        fontWeight: '600',
    },
    mockActionBtn: {
        backgroundColor: '#fff',
        height: 52,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    mockActionBtnText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 15,
    },
    dragHandleArea: {
        width: '100%',
        height: 30, // Large touch target
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -10, // Pull it into the padding
    },
    dragBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#444',
    },
    badge: {
        position: 'absolute',
        right: -6,
        top: -6,
        backgroundColor: Colors.statusRed,
        borderRadius: 10,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    activityBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: Colors.primaryContainer,
        borderRadius: 9,
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#121212',
        zIndex: 10,
    },
    activityBadgeText: {
        color: '#09231a',
        fontSize: 9,
        fontWeight: 'bold',
        fontFamily: 'Montserrat',
    },
    rfidFloatingBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 115,
        right: 20,
        backgroundColor: '#303030',
        width: 58,
        height: 58,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 12,
        shadowColor: "#000",
        shadowOffset: { width: 10, height: 13 },
        shadowOpacity: 0.9,
        shadowRadius: 4,
        zIndex: 30,
    },
    searchButton: {
        position: 'absolute',
        top: 100,
        right: 20,
        backgroundColor: Colors.matteBlack,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    zoomControls: {
        position: 'absolute',
        bottom: 380,
        left: 20,
        backgroundColor: '#fff',
        borderRadius: 25,
        width: 50,
        alignItems: 'center',
        paddingVertical: 5,
        elevation: 5,
    },
    zoomBtn: {
        padding: 10,
    },
    divider: {
        width: '60%',
        height: 1,
        backgroundColor: '#ddd',
    },
    helpButton: {
        position: 'absolute',
        bottom: 380,
        right: 20,
        backgroundColor: '#212121',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
    },
    markerBubble: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
    markerArrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1,
        elevation: 6,
    },
    // Station Card
    cardContainer: {
        position: 'absolute',
        bottom: 90,
        left: 5,
        right: 15,
        backgroundColor: Colors.matteBlack,
        opacity: 0,
        borderRadius: 20,
        padding: 15,
        elevation: 0,
        borderWidth: 1,
        borderColor: Colors.matteBlack,
        zIndex: 10,
    },
    cardContentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    leftColumn: {
        flex: 1,
        paddingRight: 15,
    },
    rightColumn: {
        width: 110,
        alignItems: 'center',
    },
    stationName: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    ratingText: {
        color: '#fff',
        marginRight: 5,
        fontWeight: 'bold',
    },
    addressText: {
        color: '#aaa',
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 10,
    },
    statusText: {
        color: Colors.statusGreen,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    connectorRow: {
        marginTop: 5,
    },
    connectorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    connectorText: {
        color: Colors.white,
        fontSize: 12,
        marginRight: 10,
    },
    totalText: {
        color: '#777',
        fontSize: 12,
    },
    imageContainer: {
        width: 100,
        height: 100,
        borderRadius: 15,
        marginBottom: 15,
        overflow: 'hidden',
        backgroundColor: '#333',
    },
    imageContainerNew: {
        width: 110,
        height: 110,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#333',
        marginLeft: 10,
    },
    stationImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)'
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 5,
    },
    actionBtn: {
        alignItems: 'center',
    },
    actionIconCircle: {
        backgroundColor: '#fff',
        width: 45,
        height: 45,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Montserrat',
    },

    bottomTabBarContainer: {
        position: 'absolute',
        left: 52,
        right: 52,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 200,
    },
    tabCapsule: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        borderRadius: 35,
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    tabBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 16,
    },
    tabBtnActive: {
        color: '#FFFFFF',
        backgroundColor: '#2e2e2e',
        paddingHorizontal: 22,
    },
    tabBtnText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    qrFloatingButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    // Session Snackbar
    sessionSnackbar: {
        position: 'absolute',
        bottom: 100, // Positioned well above the bottom nav
        left: 20,
        right: 20,
        backgroundColor: 'rgba(30, 30, 30, 1)',
        borderRadius: 16,
        // padding: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        // elevation: 10, // Increased elevation
        // shadowColor: '#00e677',
        // shadowOffset: { width: 0, height: 4 },
        // shadowOpacity: 0.3,
        // shadowRadius: 8,
        // borderWidth: 1, // Add border to make it pop
        // borderColor: '#00E676',
        zIndex: 9999, // Ensure it is on top of everything
    },
    snackbarIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.statusGreen,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    snackbarContent: {
        flex: 1,
    },
    snackbarTitle: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
        fontFamily: 'Montserrat',
    },
    snackbarSubtitle: {
        color: '#ccc',
        fontSize: 12,
        fontFamily: 'Montserrat',
    },
    snackbarAction: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    snackbarActionText: {
        color: Colors.statusGreen,
        fontWeight: 'bold',
        fontSize: 12,
        fontFamily: 'Montserrat',
    },
    iconNavContainer: {
        width: 24,
        height: 24,
    },
    iconNavWrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Cluster Styles
    clusterContainer: {
        backgroundColor: Colors.statusGreen,
        width: 70, // Bigger for City
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: Colors.white,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },
    clusterText: {
        color: Colors.matteBlack,
        fontWeight: 'bold',
        fontSize: 22,
        fontFamily: 'Montserrat',
    },
    // Mid Cluster Styles
    midClusterContainer: {
        backgroundColor: '#FFD700', // Gold/Yellow for neighborhood
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    midClusterText: {
        color: Colors.matteBlack,
        fontWeight: 'bold',
        fontSize: 14,
        fontFamily: 'Montserrat',
    },
    // Cafe Chips Styles
    cafeChipsContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 110 : 60, // Adjust based on header height + status bar
        left: 0,
        right: 0,
        zIndex: 50, // Above Map, Below Map Controls if needed
        height: 50,
    },
    cafeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(33, 33, 33, 0.95)', // Semi-transparent dark
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#444',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
        height: 36, // Compact height
    },
    cafeIconCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    cafeName: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginRight: 8,
        maxWidth: 120, // Limit width
        fontFamily: 'Montserrat',
    },
    cafeRating: {
        color: '#FFD700', // Gold
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Montserrat',
    },
    activePulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        position: 'absolute',
        top: -2,
        right: -2,
        borderWidth: 1.5,
    },
    // Persistent Guest Banner
    guestBanner: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 95, // float below header bar
        left: 10,
        right: 10,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(57, 226, 155, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(57, 226, 155, 0.3)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    guestBannerText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
        fontFamily: 'Montserrat',
    },
    guestBannerActionText: {
        color: '#39E29B',
        fontSize: 13,
        fontWeight: 'bold',
        fontFamily: 'Montserrat',
        textDecorationLine: 'underline',
    },
});