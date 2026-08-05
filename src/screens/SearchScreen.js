import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, StatusBar, Animated, Modal, Image, Keyboard, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Search, MapPin, X, Clock, Bolt, Coffee, ShoppingBag, Filter, Star, TrendingUp } from 'lucide-react-native';
import BoltOutlineIcon from '../assets/icons/Outlined/bolt_24dp_E3E3E3_FILL0_wght300_GRAD0_opsz24.svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { stationsApi, chargersApi, locationsApi } from '../services/api';
import StationBottomSheet from '../components/StationBottomSheet';
import remoteConfig from '@react-native-firebase/remote-config';
import { shouldRespectMaintenance } from '../utils/devSettings';
import { useTheme } from '../context/ThemeContext';

// Categories Constant
const CATEGORIES = [
    { id: '5', name: 'Most Used', icon: TrendingUp },
    { id: '1', name: 'Fast Charging', icon: Bolt },
    { id: '4', name: '24/7 Open', icon: Clock },
    { id: '2', name: 'Restaurants', icon: Coffee },
    { id: '3', name: 'Shopping', icon: ShoppingBag },
];

const RECENT_SEARCHES_KEY = '@recent_searches';
const ITEM_HEIGHT = 107;

// --- Optimized Station Item ---
const StationItem = React.memo(({ station, chargers = [], onPress }) => {
    const { theme, isDark } = useTheme();
    const isStationOffline = chargers.length > 0 && chargers.every(c => {
        const s = (c.status || '').toLowerCase();
        const isAvail = s === 'available' || s === 'online';
        const isBusy = s === 'busy' || s === 'occupied' || s === 'charging' || c.occupied === true || c.occupied === 1;
        return !isAvail && !isBusy;
    });
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[styles.stationCard, { borderBottomColor: theme.divider }]}
                activeOpacity={0.9}
                onPress={() => onPress(station)}
            >
                {/* Left: Icon Placeholder */}
                <View style={[styles.stationImageContainer, { backgroundColor: theme.white }]}>
                    <View style={styles.placeholderImage}>
                        <BoltOutlineIcon width={24} height={24} fill={isDark ? '#FFFFFF' : '#1A1A1A'} />
                    </View>
                </View>

                {/* Center: Info */}
                <View style={styles.stationInfo}>
                    <Text style={[styles.stationName, { color: theme.textPrimary }]} numberOfLines={1}>{station.name}</Text>
                    <View style={styles.stationAddressRow}>
                        <MapPin size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.stationAddress, { color: theme.textSecondary }]} numberOfLines={1}>
                            {station.locationName || 'Unknown Location'}
                        </Text>
                    </View>

                    <View style={styles.statusRow}>
                        {station.connectorCount > 0 ? (
                            <Text style={[styles.connectorInfo, { color: theme.textSecondary }]}>{station.connectorCount} Connectors</Text>
                        ) : (
                            <Text style={[styles.connectorInfo, { color: theme.textSecondary }]}>No Connectors</Text>
                        )}
                        {isStationOffline && (
                            <View style={styles.offlineBadge}>
                                <Text style={styles.offlineText}>OFFLINE</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Right: Actions/Rating */}
                <View style={styles.stationRight}>
                    <View style={[styles.ratingBadge, { backgroundColor: theme.white }]}>
                        <Star size={10} color="#FFD700" fill="#FFD700" style={{ marginRight: 2 }} />
                        <Text style={[styles.ratingText, { color: theme.textPrimary }]}>4.5</Text>
                    </View>
                    <ChevronRight size={18} color={theme.textSecondary} style={{ marginTop: 12, marginRight: 4 }} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

export default function SearchScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const [searchText, setSearchText] = useState('');
    const [recentSearches, setRecentSearches] = useState([]);
    const [isFilterVisible, setFilterVisible] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const [stations, setStations] = useState([]);
    const [allChargers, setAllChargers] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [isSheetVisible, setIsSheetVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const searchInputRef = useRef(null);

    useEffect(() => {
        loadStations();
        loadRecentSearches();

        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 300);

        const subscription = DeviceEventEmitter.addListener('chargers_updated', ({ chargers, stations: stationsData }) => {
            if (chargers) setAllChargers(chargers);
            if (stationsData) setStations(stationsData);
        });

        const syncSubscription = DeviceEventEmitter.addListener('charger_sync_batch', ({ chargers }) => {
            if (chargers) setAllChargers(chargers);
        });

        return () => {
            clearTimeout(timer);
            subscription.remove();
            syncSubscription.remove();
        };
    }, []);

    const loadRecentSearches = async () => {
        try {
            const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
            if (saved) {
                setRecentSearches(JSON.parse(saved));
            }
        } catch (error) {
            console.log('Error loading recent searches:', error);
        }
    };

    const addRecentSearch = async (text) => {
        if (!text.trim()) return;
        const newSearch = { id: Date.now().toString(), text: text.trim() };
        const updated = [newSearch, ...recentSearches.filter(s => s.text.toLowerCase() !== text.trim().toLowerCase())].slice(0, 5);
        setRecentSearches(updated);
        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    };

    const removeRecentSearch = async (id) => {
        const updated = recentSearches.filter(s => s.id !== id);
        setRecentSearches(updated);
        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    };

    const clearAllRecentSearches = async () => {
        setRecentSearches([]);
        await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    const loadStations = async () => {
        try {
            setLoading(true);

            const respectMaintenance = await shouldRespectMaintenance();
            if (respectMaintenance) {
                try {
                    const isMaintenance = remoteConfig().getValue('maintenance_key').asBoolean();
                    if (isMaintenance) {
                        setStations([]);
                        setAllChargers([]);
                        return;
                    }
                } catch (e) {
                    console.log('Error checking maintenance flag in search:', e);
                }
            }

            const [stationsData, locationsData, chargersData] = await Promise.all([
                stationsApi.getAllStations(),
                locationsApi.getAllLocations().catch(e => []),
                chargersApi.getAllChargers().catch(e => [])
            ]);

            const chargers = Array.isArray(chargersData) ? chargersData : (chargersData?.chargers || []);
            setAllChargers(chargers);

            const validStations = Array.isArray(stationsData) ? stationsData : (stationsData?.stations || []);
            const validLocations = Array.isArray(locationsData) ? locationsData : (locationsData?.locations || []);

            const locationsMap = new Map();
            validLocations.forEach(loc => locationsMap.set(loc.id, loc));

            const mergedStations = validStations.map((st) => {
                const loc = locationsMap.get(st.locationId) ||
                    (st.locationName ? validLocations.find(l => l.name === st.locationName) : null);

                let lat = 18.5204;
                let lng = 73.8567;

                if (loc && loc.latitude && loc.longitude) {
                    lat = parseFloat(loc.latitude);
                    lng = parseFloat(loc.longitude);
                } else if (st.latitude && st.longitude) {
                    lat = parseFloat(st.latitude);
                    lng = parseFloat(st.longitude);
                }

                return {
                    ...st,
                    latitude: lat,
                    longitude: lng,
                    location: loc ? `${loc.address || ''}, ${loc.city || ''}` : (st.locationName || 'Unknown Location'),
                };
            });

            setStations(mergedStations);
        } catch (error) {
            console.error('Failed to load stations:', error);
        } finally {
            setLoading(false);
        }
    };

    const listData = useMemo(() => {
        const query = searchText.toLowerCase();

        return stations
            .filter(station => {
                const matchesSearch = !query ||
                    (station.name?.toLowerCase() || '').includes(query) ||
                    (station.locationName?.toLowerCase() || '').includes(query);

                if (!matchesSearch) return false;

                if (activeCategory) {
                    switch (activeCategory) {
                        case '1': // Fast Charging
                            return station.isFast || (station.chargers?.some(c => c.type === 'DC' || c.isFast));
                        case '2': // Restaurants
                            const foodAmenities = Array.isArray(station.amenities)
                                ? station.amenities.join(' ').toLowerCase()
                                : String(station.amenities || '').toLowerCase();
                            const foodKeywords = ['restaurant', 'cafes', 'food', 'dining', 'eats', 'dhaba', 'canteen', 'eatery', 'kitchen', 'coffee', 'hotel', 'rest stop', 'diner', 'bistro', 'grill', 'bakery', 'tea', 'beverage', 'mcdonald', 'haldiram', 'starbucks', 'dominos', 'burger', 'pizza'];
                            return foodKeywords.some(keyword => 
                                foodAmenities.includes(keyword) || 
                                (station.name || '').toLowerCase().includes(keyword) || 
                                (station.locationName || '').toLowerCase().includes(keyword)
                            );
                        case '3': // Shopping
                            const shopAmenities = Array.isArray(station.amenities)
                                ? station.amenities.join(' ').toLowerCase()
                                : String(station.amenities || '').toLowerCase();
                            const shopKeywords = ['shop', 'mall', 'mart', 'store', 'market', 'plaza', 'bazaar', 'shopping', 'supermarket', 'd-mart', 'decathlon'];
                            return shopKeywords.some(keyword => 
                                shopAmenities.includes(keyword) || 
                                (station.name || '').toLowerCase().includes(keyword) || 
                                (station.locationName || '').toLowerCase().includes(keyword)
                            );
                        case '4': // 24/7 Open
                            return station.is_24_7 || station.openAlways;
                        case '5': // Most Used
                            return station.rating >= 4 || station.usageCount > 100 || true;
                        default:
                            return true;
                    }
                }

                return true;
            })
            .map(station => {
                const connectorCount = allChargers.filter(c =>
                    (c.stationId || c.station_id || c.station) == station.id
                ).length;

                return { ...station, connectorCount };
            });
    }, [stations, allChargers, searchText, activeCategory]);

    const handleSearchSubmit = () => {
        addRecentSearch(searchText);
    };

    const handleStationPress = useCallback((station) => {
        Keyboard.dismiss();
        setSelectedStation(station);
        setIsSheetVisible(true);
    }, []);

    const handleSelectCharger = (charger) => {
        setIsSheetVisible(false);
        const typeStr = (charger.chargerType || charger.type || '').toString().toUpperCase();
        navigation.navigate('SlotBooking', {
            charger,
            stationName: selectedStation?.name || 'Selected Station',
            chargerId: charger.id,
            stationId: selectedStation?.id,
            connectorType: typeStr,
            rate: charger.rate,
            pstRate: charger.pstRate,
            platformFeePerKwh: charger.platformFeePerKwh
        });
    };

    const handleCloseBottomSheet = () => {
        setIsSheetVisible(false);
    };

    const renderHeader = () => (
        <View style={{ backgroundColor: theme.background }}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.cardBg }]} onPress={() => navigation.goBack()}>
                        <ChevronLeft size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Find Stations</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.searchRow}>
                    <View style={[styles.searchContainer, { backgroundColor: theme.white }]}>
                        <Search size={20} color={theme.textSecondary} style={{ marginRight: 10 }} />
                        <TextInput
                            ref={searchInputRef}
                            style={[styles.searchInput, { color: theme.textPrimary }]}
                            placeholder="Search location or station..."
                            placeholderTextColor={theme.placeholder}
                            value={searchText}
                            onChangeText={setSearchText}
                            onSubmitEditing={handleSearchSubmit}
                            returnKeyType="search"
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearchText('')}
                                style={styles.clearBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X size={16} color={theme.textPrimary} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.filterBtn, 
                            { backgroundColor: theme.white },
                            activeCategory && styles.filterBtnActive
                        ]}
                        onPress={() => setFilterVisible(true)}
                    >
                        <Filter size={20} color={activeCategory ? '#FFFFFF' : theme.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Categories Horizontal Scroll */}
                <View style={{ marginTop: 6, marginBottom: 14 }}>
                    <FlatList
                        horizontal
                        data={CATEGORIES}
                        keyExtractor={item => item.id}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => {
                            const Icon = item.icon;
                            const isActive = activeCategory === item.id;
                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.categoryPill, 
                                        { backgroundColor: theme.white, borderColor: theme.divider },
                                        isActive && styles.categoryPillActive
                                    ]}
                                    onPress={() => setActiveCategory(isActive ? null : item.id)}
                                >
                                    <Icon size={14} color={isActive ? "#FFFFFF" : theme.textSecondary} style={{ marginRight: 6 }} />
                                    <Text style={[
                                        styles.categoryPillText, 
                                        { color: theme.textSecondary },
                                        isActive && styles.categoryPillTextActive
                                    ]}>{item.name}</Text>
                                </TouchableOpacity>
                            );
                        }}
                        contentContainerStyle={styles.categoriesScroll}
                    />
                </View>
            </View>

            {searchText.length === 0 && recentSearches.length > 0 && (
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Searches</Text>
                        <TouchableOpacity onPress={clearAllRecentSearches}>
                            <Text style={styles.clearAllText}>Clear All</Text>
                        </TouchableOpacity>
                    </View>
                    {recentSearches.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.recentItem, { borderBottomColor: theme.divider }]}
                            onPress={() => {
                                setSearchText(item.text);
                                addRecentSearch(item.text);
                            }}
                        >
                            <View style={styles.recentLeft}>
                                <Clock size={16} color={theme.textSecondary} style={{ marginRight: 10 }} />
                                <Text style={[styles.recentText, { color: theme.textPrimary }]}>{item.text}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeRecentSearch(item.id)} style={{ padding: 4 }}>
                                <X size={16} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                    {searchText.length > 0 ? 'Search Results' : 'All Stations'}
                </Text>
            </View>
        </View>
    );

    const renderItem = useCallback(({ item }) => (
        <StationItem
            station={item}
            chargers={allChargers.filter(c => {
                const sId = c.stationId || c.station_id || (c.station && (c.station.id || c.station));
                return String(sId) === String(item.id);
            })}
            onPress={handleStationPress}
        />
    ), [handleStationPress, allChargers]);

    const getItemLayout = useCallback((data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    }), []);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            <FlatList
                data={listData}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.flatList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                getItemLayout={getItemLayout}
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
            />

            {/* Filter Modal */}
            <Modal
                transparent={true}
                visible={isFilterVisible}
                animationType="slide"
                onRequestClose={() => setFilterVisible(false)}
            >
                <TouchableOpacity 
                    style={[styles.modalOverlay, { backgroundColor: theme.overlayBg }]}
                    activeOpacity={1} 
                    onPress={() => setFilterVisible(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Filters</Text>
                            <TouchableOpacity onPress={() => setFilterVisible(false)} style={[styles.closeModalBtn, { backgroundColor: theme.white }]}>
                                <X size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Amenities & Features</Text>

                        <View style={styles.modalCategories}>
                            {CATEGORIES.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeCategory === item.id;
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.categoryChip, 
                                            { backgroundColor: theme.white, borderColor: theme.divider },
                                            isActive && styles.categoryChipActive
                                        ]}
                                        onPress={() => setActiveCategory(isActive ? null : item.id)}
                                    >
                                        <Icon size={16} color={isActive ? "#FFFFFF" : theme.textSecondary} style={{ marginRight: 8 }} />
                                        <Text style={[
                                            styles.categoryText, 
                                            { color: theme.textSecondary },
                                            isActive && styles.categoryTextActive
                                        ]}>{item.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity 
                            style={styles.applyBtn}
                            onPress={() => setFilterVisible(false)}
                        >
                            <Text style={styles.applyBtnText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Station Details Sheet */}
            {selectedStation && (
                <StationBottomSheet
                    visible={isSheetVisible}
                    onClose={handleCloseBottomSheet}
                    station={selectedStation}
                    allChargers={allChargers}
                    onSelectCharger={handleSelectCharger}
                    navigation={navigation}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flatList: {
        paddingBottom: 40,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 4,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        flex: 1,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 28,
        paddingHorizontal: 16,
        height: 56,
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '800',
        padding: 0,
    },
    clearBtn: {
        padding: 4,
    },
    filterBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterBtnActive: {
        backgroundColor: '#00B074',
    },
    sectionContainer: {
        paddingHorizontal: 20,
        marginBottom: 14,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    clearAllText: {
        color: '#EF5350',
        fontSize: 13,
        fontWeight: '800',
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
    },
    recentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recentText: {
        fontSize: 16,
        fontWeight: '800',
    },
    stationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    stationImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 14,
    },
    placeholderImage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stationInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    stationName: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 4,
    },
    stationAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    stationAddress: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    connectorInfo: {
        fontSize: 12,
        fontWeight: '800',
    },
    stationRight: {
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        alignSelf: 'flex-start',
        paddingTop: 4,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 4,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        padding: 24,
        paddingVertical: 32,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    closeModalBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
    },
    modalLabel: {
        fontSize: 14,
        marginBottom: 16,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    modalCategories: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 32,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 30,
        borderWidth: 1,
    },
    categoryChipActive: {
        backgroundColor: '#00B074',
        borderColor: '#00B074',
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '700',
    },
    categoryTextActive: {
        color: '#FFFFFF',
        fontWeight: '900',
    },
    applyBtn: {
        backgroundColor: '#00B074',
        paddingVertical: 16,
        borderRadius: 28,
        alignItems: 'center',
    },
    applyBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
    },
    categoriesScroll: {
        paddingRight: 20,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
    },
    categoryPillActive: {
        backgroundColor: '#00B074',
        borderColor: '#00B074',
    },
    categoryPillText: {
        fontSize: 13,
        fontWeight: '700',
    },
    categoryPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '900',
    },
    offlineBadge: {
        backgroundColor: '#EF5350',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    offlineText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
});
