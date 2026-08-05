import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity, ScrollView, Image, PanResponder, Easing, Share, Linking, Platform, DeviceEventEmitter, LayoutAnimation, UIManager } from 'react-native';
import { chargersApi, cafesApi } from '../services/api';
import BoltIcon from '../assets/icons/Rounded Fill/bolt_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import NavigationIcon from '../assets/icons/Rounded Fill/navigation_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import { X, ChevronRight, Star, Clock, Share2, HelpCircle, Utensils, Coffee, Phone, ShoppingBag } from 'lucide-react-native';
import { getConnectorIcon } from '../utils/connectorUtils';
import EmergencyContactDialog from './EmergencyContactDialog';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function StationBottomSheet({
    station,
    chargers,
    visible,
    nearbyCafes = [],
    onClose,
    onSelectCharger,
    navigation
}) {
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const isClosing = useRef(false);

    const [lastStation, setLastStation] = useState(station);
    const [showEmergency, setShowEmergency] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');

    useEffect(() => {
        if (station) {
            setLastStation(station);
        }
    }, [station]);

    const activeStation = station || lastStation;

    const [chargerList, setChargerList] = useState(chargers || []);
    const [backendCafes, setBackendCafes] = useState([]);

    useEffect(() => {
        const fetchBackendCafes = async () => {
            if (!activeStation?.id) return;
            try {
                const data = await cafesApi.getCafesByStation(activeStation.id);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                if (Array.isArray(data)) {
                    setBackendCafes(data);
                } else {
                    setBackendCafes([]);
                }
            } catch (err) {
                console.log('Backend cafe fetch failed in bottom sheet:', err?.message);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setBackendCafes([]);
            }
        };
        if (visible && activeStation?.id) {
            fetchBackendCafes();
        } else if (!visible) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setBackendCafes([]);
        }
    }, [activeStation?.id, visible]);

    useEffect(() => {
        if (chargers) setChargerList(chargers);
    }, [chargers]);

    const chargerListRef = useRef(chargerList);
    useEffect(() => {
        chargerListRef.current = chargerList;
    }, [chargerList]);

    const fetchFreshChargerStatuses = useCallback(async () => {
        const currentList = chargerListRef.current;
        if (currentList && currentList.length > 0 && activeStation) {
            try {
                console.log("StationBottomSheet: Fetching fresh charger statuses...");
                const stationIdStr = String(activeStation.id);
                const updatedList = await Promise.all(
                    currentList.map(async (c) => {
                        const sId = c.stationId || c.station_id || (c.station && (c.station.id || c.station));
                        if (String(sId) === stationIdStr) {
                             try {
                                 const identifier = c.ocppId || c.boxId;
                                 let fresh = null;
                                 if (identifier) {
                                     fresh = await chargersApi.getChargerByOcppId(identifier);
                                 } else {
                                     fresh = await chargersApi.getChargerById(c.id);
                                 }
                                 if (fresh) {
                                     return { ...c, ...fresh };
                                 }
                             } catch (err) {
                                 console.log(`Failed to fetch fresh status for charger ${c.id}:`, err.message);
                             }
                        }
                        return c;
                    })
                );
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setChargerList(updatedList);
            } catch (error) {
                console.log("Error in fetchFreshChargerStatuses:", error.message);
            }
        }
    }, [activeStation]);

    useEffect(() => {
        if (visible && activeStation) {
            fetchFreshChargerStatuses();
        }
    }, [visible, activeStation, fetchFreshChargerStatuses]);

    useEffect(() => {
        if (!activeStation) return;
        
        const handleBatchUpdate = ({ chargers: newChargers }) => {
            if (newChargers) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setChargerList(prevList => {
                    const updatedList = [...prevList];
                    newChargers.forEach(nc => {
                        const idx = updatedList.findIndex(c => c.id === nc.id);
                        if (idx !== -1) {
                            updatedList[idx] = { ...updatedList[idx], ...nc };
                        }
                    });
                    return updatedList;
                });
            }
        };

        const batchSubscription = DeviceEventEmitter.addListener('charger_sync_batch', handleBatchUpdate);

        const stationId = activeStation.id;
        const syncSubscription = DeviceEventEmitter.addListener(
            `station_chargers_updated_${stationId}`,
            ({ chargers: stationChargers }) => {
                if (stationChargers) {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setChargerList(prevList => {
                        const updatedList = [...prevList];
                        stationChargers.forEach(nc => {
                            const idx = updatedList.findIndex(c => c.id === nc.id);
                            if (idx !== -1) {
                                updatedList[idx] = { ...updatedList[idx], ...nc };
                            } else {
                                updatedList.push(nc);
                            }
                        });
                        return updatedList;
                    });
                    fetchFreshChargerStatuses();
                }
            }
        );

        return () => {
            batchSubscription.remove();
            syncSubscription.remove();
        };
    }, [activeStation]);

    const handleDirections = () => {
        if (!activeStation) return;
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${activeStation.latitude},${activeStation.longitude}`;
        const label = activeStation.name;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        Linking.openURL(url);
    };

    const handleHelp = () => {
        console.log("Help pressed");
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this charging station: ${activeStation?.name || 'Bentork Station'} at ${activeStation?.location || 'Unknown Location'}`,
            });
        } catch (error) {
            console.log("Share Error:", error.message);
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                    isClosing.current = true;
                    onClose();

                    Animated.timing(translateY, {
                        toValue: SCREEN_HEIGHT,
                        duration: 200,
                        useNativeDriver: true,
                    }).start();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        bounciness: 1,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            isClosing.current = false;
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 20,
                    stiffness: 90,
                    mass: 0.8,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 0.5,
                    duration: 250,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            if (isClosing.current) {
                isClosing.current = false;
                Animated.timing(overlayOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
                return;
            }

            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: SCREEN_HEIGHT,
                    duration: 200,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [visible]);

    const stationChargers = activeStation && chargerList ? chargerList.filter(c => {
        const sId = c.stationId || c.station_id || (c.station && (c.station.id || c.station));
        return String(sId) === String(activeStation.id);
    }) : [];
    const isStationOffline = stationChargers.length > 0 && stationChargers.every(c => {
        const s = (c.status || '').toLowerCase();
        return s === 'offline' || s === 'unavailable' || (!s);
    });

    return (
        <>
            {activeStation && (
                <>
                    {/* Background Overlay */}
                    <Animated.View
                        style={[
                            styles.overlay,
                            { opacity: overlayOpacity }
                        ]}
                        pointerEvents={visible ? "auto" : "none"}
                    >
                        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
                    </Animated.View>

                    {/* Draggable Bottom Sheet */}
                    <Animated.View
                        style={[
                            styles.bottomSheet,
                            { transform: [{ translateY }] }
                        ]}
                    >
                        {/* Header / Drag Handle */}
                        <View style={styles.header} {...panResponder.panHandlers}>
                            <View style={styles.dragHandle} />
                        </View>

                        {/* Content */}
                        <ScrollView
                            style={styles.content}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.stationHeader}>
                                <View style={styles.stationInfo}>
                                    <Text style={styles.stationName} numberOfLines={1}>{activeStation.name}</Text>
                                    <Text style={styles.stationAddress} numberOfLines={2}>
                                        {activeStation.locationName || activeStation.location || activeStation.address || 'Unknown Location'}
                                    </Text>

                                    <View style={[styles.statusRow, { marginBottom: 8 }]}>
                                        {isStationOffline ? (
                                            <View style={[styles.statusPill, { backgroundColor: '#FFFFFF' }]}>
                                                <BoltIcon width={16} height={16} fill="#EF5350" />
                                                <Text style={[styles.statusText, { color: '#EF5350' }]}>
                                                    Offline
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.statusPill, { backgroundColor: '#FFFFFF' }]}>
                                                <BoltIcon width={16} height={16} fill={(activeStation.status || '').toUpperCase() === 'ACTIVE' ? '#00B074' : '#EF5350'} />
                                                <Text style={[styles.statusText, { color: (activeStation.status || '').toUpperCase() === 'ACTIVE' ? '#00B074' : '#EF5350' }]}>
                                                    {(activeStation.status || '').toUpperCase() === 'ACTIVE' ? 'Operational' : 'Non-Operational'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    <TouchableOpacity
                                        style={styles.ratingRow}
                                        onPress={() => {
                                            onClose();
                                            navigation.navigate('StationReviews', {
                                                stationId: activeStation.id,
                                                stationName: activeStation.name
                                            });
                                        }}
                                    >
                                        <Star fill="#FFD700" color="#FFD700" size={16} />
                                        <Text style={styles.ratingText}>{activeStation.rating ? Number(activeStation.rating).toFixed(1) : '4.5'}</Text>
                                        <Text style={styles.ratingCount}>({activeStation.reviews || activeStation.reviewCount || '0'} Reviews)</Text>
                                        <ChevronRight size={14} color="#5A6B7C" />
                                    </TouchableOpacity>
                                </View>
                                <Image
                                    source={{ uri: activeStation.image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7' }}
                                    style={styles.stationImage}
                                />
                            </View>

                            <View style={{ marginTop: 0, marginBottom: 16, height: 50, marginHorizontal: -20 }}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 20 }}
                                >
                                    <TouchableOpacity style={[styles.actionChip, { backgroundColor: '#00B074' }]} onPress={handleDirections}>
                                        <NavigationIcon width={20} height={20} fill="#FFFFFF" />
                                        <Text style={[styles.actionText, { color: '#FFFFFF', fontWeight: '900' }]}>Navigate</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.actionChip, { backgroundColor: '#FFFFFF' }]} onPress={() => setShowEmergency(true)}>
                                        <Phone size={16} color="#5A6B7C" />
                                        <Text style={[styles.actionText, { marginLeft: 6, color: '#5A6B7C', fontWeight: '800' }]}>Support</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.actionChip, { paddingHorizontal: 12, backgroundColor: '#FFFFFF' }]} onPress={handleHelp}>
                                        <HelpCircle size={20} color="#5A6B7C" />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.actionChip, { paddingHorizontal: 12, backgroundColor: '#FFFFFF' }]} onPress={handleShare}>
                                        <Share2 size={20} color="#5A6B7C" />
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>

                            <View style={styles.divider} />
                            <Text style={styles.sectionTitle}>Available Chargers</Text>

                            {/* Chargers List */}
                            <View style={styles.chargersList}>
                                {stationChargers.length > 0 ? (
                                    stationChargers.map((charger) => {
                                        const statusLower = (charger.status || '').toLowerCase();
                                        const isOffline = statusLower === 'offline' || statusLower === 'faulted' || statusLower === 'unavailable' || statusLower === 'disabled' || (!statusLower);
                                        const isBusy = statusLower === 'busy' || statusLower === 'occupied' || statusLower === 'charging' || statusLower === 'preparing' || statusLower === 'finishing' || statusLower === 'reserved' || statusLower === 'suspendedev' || statusLower === 'suspendedevse';
                                        const isAvail = !isOffline && !isBusy;
                                        
                                        const pillColor = isAvail ? '#00B074' : (isBusy ? '#FF9800' : '#7E8E9F');

                                        return (
                                            <TouchableOpacity
                                                key={charger.id}
                                                style={[styles.chargerCard, isOffline && { opacity: 0.5 }]}
                                                onPress={() => onSelectCharger(charger)}
                                                disabled={isOffline}
                                            >
                                                {/* Left Status Stripe */}
                                                <View style={{ width: 4, height: '80%', backgroundColor: pillColor, borderRadius: 2, marginRight: 16 }} />

                                                {/* Icon */}
                                                <View style={styles.chargerIconBox}>
                                                    <Image
                                                        source={getConnectorIcon(charger.connectorType || charger.connector_type)}
                                                        style={{ width: 36, height: 36, tintColor: '#1A1A1A' }}
                                                        resizeMode="contain"
                                                    />
                                                </View>

                                                {/* Details */}
                                                <View style={styles.chargerInfo}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                        <Text style={styles.primaryInfoText}>
                                                            {charger.connectorType || charger.connector_type || ((charger.chargerType || '').toString().includes('AC') ? 'Type 2' : 'CCS 2')}
                                                        </Text>
                                                        <Text style={styles.separatorText}> • </Text>
                                                        <Text style={styles.connectorText}>
                                                            {charger.max_power || charger.rate || '120'} kW
                                                        </Text>
                                                    </View>

                                                    <Text style={[styles.priceInfo, { marginBottom: 4 }]}>
                                                        {(charger.chargerType || '').toString().includes('AC') || (charger.connectorType || '').toString().includes('Type 2') ? 'AC' : 'DC'} Charging
                                                    </Text>

                                                    <Text style={styles.priceInfo}>
                                                        Rate: ₹{charger.price_per_kwh || charger.price || '18.00'} / kWh
                                                    </Text>
                                                </View>

                                                {/* Right Action */}
                                                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                                    {!isOffline && (
                                                        <ChevronRight size={20} color="#5A6B7C" />
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No chargers found for this station.</Text>
                                    </View>
                                )}
                            </View>

                            {(backendCafes.length > 0 || nearbyCafes.length > 0) && <View style={styles.divider} />}

                            {/* Amenities Section */}
                            {(backendCafes.length > 0 || nearbyCafes.length > 0) && (
                                <>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Amenities</Text>
                                    </View>

                                    {/* Filters */}
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingBottom: 15 }}>
                                        {['All', 'Cafes', 'Malls', 'Restaurants'].map((filter) => (
                                            <TouchableOpacity
                                                key={filter}
                                                style={[
                                                    styles.filterChip,
                                                    activeFilter === filter && styles.filterChipActive
                                                ]}
                                                onPress={() => {
                                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                                    setActiveFilter(filter);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.filterText,
                                                    activeFilter === filter && styles.filterTextActive
                                                ]}>
                                                    {filter}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <View style={styles.nearbyContainer}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 116 }}>
                                            {backendCafes.filter(c => {
                                                if (activeFilter === 'All') return true;
                                                const type = (c.category || c.type || '').toLowerCase();
                                                if (activeFilter === 'Cafes') return type.includes('cafe') || type.includes('coffee');
                                                if (activeFilter === 'Malls') return type.includes('mall') || type.includes('shopping');
                                                if (activeFilter === 'Restaurants') return type.includes('restaurant') || type.includes('food') || type.includes('rest stop');
                                                return true;
                                            }).map((cafe, index) => {
                                                const openMapsUrl = cafe.googleMapsUri || cafe.google_maps_uri || (cafe.latitude && cafe.longitude
                                                    ? Platform.select({
                                                          ios: `maps:0,0?q=${encodeURIComponent(cafe.name)}@${cafe.latitude},${cafe.longitude}`,
                                                          android: `geo:0,0?q=${cafe.latitude},${cafe.longitude}(${encodeURIComponent(cafe.name)})`
                                                      })
                                                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.name)}`);
                                                const cafeType = (cafe.category || cafe.type || 'Cafe');
                                                const imageUri = cafe.imageUrl || cafe.image_url || cafe.thumb || cafe.photoUrl || cafe.googleMapImageUrl;

                                                return (
                                                    <TouchableOpacity key={`backend_cafe_${index}`} style={styles.cafeCard} activeOpacity={0.8} onPress={() => Linking.openURL(openMapsUrl)}>
                                                        {imageUri ? (
                                                            <Image
                                                                source={{ uri: imageUri }}
                                                                style={styles.cafeImage}
                                                                resizeMode="cover"
                                                            />
                                                        ) : (
                                                            <View style={styles.cafeImagePlaceholder}>
                                                                {(cafeType.toLowerCase().includes('restaurant') || cafeType.toLowerCase().includes('food')) ? <Utensils size={36} color="#5A6B7C" /> :
                                                                    (cafeType.toLowerCase().includes('mall') || cafeType.toLowerCase().includes('shopping') ? <ShoppingBag size={36} color="#5A6B7C" /> : <Coffee size={36} color="#5A6B7C" />)}
                                                            </View>
                                                        )}
                                                        <View style={styles.cafeCardContent}>
                                                            <Text style={styles.cafeName} numberOfLines={1}>{cafe.name}</Text>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                                                <Text style={styles.cafeRating}>★ {cafe.rating ?? '—'}</Text>
                                                                {cafe.isOpen !== undefined && (
                                                                    <Text style={{ color: cafe.isOpen ? '#00B074' : '#EF5350', fontSize: 11, fontWeight: 'bold' }}>
                                                                        {cafe.isOpen ? 'Open' : 'Closed'}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}

                                            {nearbyCafes.filter(c => {
                                                if (activeFilter === 'All') return true;
                                                const type = c.type;
                                                if (activeFilter === 'Cafes') return type === 'Cafe';
                                                if (activeFilter === 'Malls') return type === 'Shopping mall' || type === 'Mall';
                                                if (activeFilter === 'Restaurants') return type === 'Restaurant' || type === 'Rest stop';
                                                return true;
                                            }).map((cafe, index) => {
                                                const imageUri = cafe.photoUrl || cafe.imageUrl || cafe.image_url || cafe.thumb;
                                                return (
                                                    <TouchableOpacity key={`cafe_${index}`} style={styles.cafeCard} activeOpacity={0.8} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${cafe.geometry?.location?.lat},${cafe.geometry?.location?.lng}`)}>
                                                        {imageUri ? (
                                                            <Image
                                                                source={{ uri: imageUri }}
                                                                style={styles.cafeImage}
                                                                resizeMode="cover"
                                                            />
                                                        ) : (
                                                            <View style={styles.cafeImagePlaceholder}>
                                                                {(cafe.type === 'Rest stop' || cafe.type === 'Restaurant') ? <Utensils size={36} color="#5A6B7C" /> :
                                                                    (cafe.type === 'Shopping mall' || cafe.type === 'Mall' ? <ShoppingBag size={36} color="#5A6B7C" /> : <Coffee size={36} color="#5A6B7C" />)}
                                                            </View>
                                                        )}
                                                        <View style={styles.cafeCardContent}>
                                                            <Text style={styles.cafeName} numberOfLines={1}>{cafe.name}</Text>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                                                <Text style={styles.cafeRating}>★ {cafe.rating}</Text>
                                                                <Text style={{ color: cafe.isOpen ? '#00B074' : '#EF5350', fontSize: 11, fontWeight: 'bold' }}>
                                                                    {cafe.isOpen ? 'Open' : 'Closed'}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </Animated.View>
                </>
            )}
            <EmergencyContactDialog
                visible={showEmergency}
                onClose={() => setShowEmergency(false)}
                stationId={activeStation?.id}
            />
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
    },
    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: '90%',
        backgroundColor: '#E2E7EC',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        zIndex: 1001,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 10,
        height: 40,
        justifyContent: 'center',
    },
    dragHandle: {
        width: 50,
        height: 5,
        backgroundColor: '#BFC7CE',
        borderRadius: 3,
        position: 'absolute',
        top: 10,
    },
    content: {
        flexGrow: 0,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    stationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        alignItems: 'flex-start',
    },
    stationInfo: {
        flex: 1,
        paddingRight: 10,
    },
    stationName: {
        color: '#1A1A1A',
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 5,
        flexWrap: 'wrap',
    },
    stationAddress: {
        color: '#5A6B7C',
        fontSize: 13,
        marginBottom: 8,
        lineHeight: 18,
        fontWeight: '600',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    ratingText: {
        color: '#1A1A1A',
        fontWeight: '900',
        fontSize: 14,
    },
    ratingCount: {
        color: '#5A6B7C',
        fontSize: 12,
        fontWeight: '600',
    },
    stationImage: {
        width: 110,
        height: 110,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
    },
    statusRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 5,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '900',
    },
    divider: {
        height: 1,
        backgroundColor: '#BFC7CE',
        marginTop: 6,
        marginBottom: 16,
    },
    sectionTitle: {
        color: '#1A1A1A',
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 15,
    },
    chargersList: {
        paddingBottom: 10,
    },
    chargerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    chargerIconBox: {
        width: 48,
        height: 48,
        backgroundColor: '#E2E7EC',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    chargerInfo: {
        flex: 1,
    },
    priceInfo: {
        color: '#5A6B7C',
        fontSize: 12,
        fontWeight: '700',
    },
    primaryInfoText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#1A1A1A',
    },
    separatorText: {
        fontSize: 14,
        color: '#BFC7CE',
        marginHorizontal: 4,
    },
    connectorText: {
        fontSize: 14,
        color: '#5A6B7C',
        fontWeight: '700',
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#5A6B7C',
        fontStyle: 'italic',
        fontWeight: '600',
    },
    actionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 30,
        height: 44,
        paddingHorizontal: 20,
        gap: 6,
    },
    actionText: {
        fontSize: 14,
    },
    nearbyContainer: {
        marginBottom: 30,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#BFC7CE',
    },
    filterChipActive: {
        backgroundColor: '#00B074',
        borderColor: '#00B074',
    },
    filterText: {
        color: '#5A6B7C',
        fontSize: 13,
        fontWeight: '700',
    },
    filterTextActive: {
        color: '#FFFFFF',
        fontWeight: '900',
    },
    cafeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginRight: 12,
        width: 140,
        overflow: 'hidden',
    },
    cafeImage: {
        width: 140,
        height: 110,
        resizeMode: 'cover',
    },
    cafeImagePlaceholder: {
        width: 140,
        height: 110,
        backgroundColor: '#E2E7EC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cafeCardContent: {
        padding: 12,
        paddingTop: 10,
    },
    cafeName: {
        color: '#1A1A1A',
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 2,
    },
    cafeRating: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: '800',
    },
});
