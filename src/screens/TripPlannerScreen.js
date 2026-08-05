import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, StatusBar, Dimensions, ActivityIndicator, Animated, Linking, Platform, Switch, PanResponder, Vibration } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { ChevronLeft, MapPin, BatteryCharging, Navigation, Zap, X, Navigation2, Check, Plus, ChevronUp, ChevronDown } from 'lucide-react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, GlobalStyles } from '../styles/GlobalStyles';
import GetLocation from 'react-native-get-location';
import routeService, { SUPPORTED_LOCATIONS, getDistanceFromLatLonInKm, getBearing } from '../services/routeService';
import { useAlert } from '../context/AlertContext';
import mapStyle from '../assets/map style/mapStyle.json';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.55;
const COLLAPSED_HEIGHT = 700;

export default function TripPlannerScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();
    const [source, setSource] = useState('Current Location');
    const [destination, setDestination] = useState('Mumbai');
    const [batteryLevel, setBatteryLevel] = useState(50);
    const [selectedAmenity, setSelectedAmenity] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [navStatus, setNavStatus] = useState('idle'); // idle | initializing | active | error

    // Trip State
    const [tripPlan, setTripPlan] = useState(null);
    const [viewMode, setViewMode] = useState('INPUT'); // INPUT | SUMMARY | DRIVE
    const [selectedStations, setSelectedStations] = useState([]);
    const [summaryTab, setSummaryTab] = useState(0); // 0 = all | 1 = selected
    const summaryTabRef = useRef(0);
    const summaryTabAnim = useRef(new Animated.Value(0)).current;
    const [avoidTolls, setAvoidTolls] = useState(false);

    // Drive Mode State (kept for progress tracking)
    const [currentLocation, setCurrentLocation] = useState(null);
    const [nextStopIndex, setNextStopIndex] = useState(0);
    const [simulatedProgress, setSimulatedProgress] = useState(0);
    const [sliderWidth, setSliderWidth] = useState(0);
    const [apiSuggestions, setApiSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null); // 'source' | 'dest'
    const scrollY = useRef(new Animated.Value(0)).current;
    const mapRef = useRef(null);
    const lastClosestIndex = useRef(0);

    // Draggable Sheet State (Height-based)
    const sheetHeight = useRef(new Animated.Value(EXPANDED_HEIGHT)).current;
    const isExpanded = useRef(true);

    const snapTo = (toValue) => {
        Animated.spring(sheetHeight, {
            toValue,
            tension: 70,
            friction: 12,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished) Vibration.vibrate(18);
        });
    };

    const toggleSheet = () => {
        if (isExpanded.current) {
            snapTo(COLLAPSED_HEIGHT);
            isExpanded.current = false;
        } else {
            snapTo(EXPANDED_HEIGHT);
            isExpanded.current = true;
        }
    };

    const switchSummaryTab = useCallback((idx) => {
        if (summaryTabRef.current === idx) return;

        Animated.timing(summaryTabAnim, {
            toValue: idx,
            duration: 250,
            easing: Animated.linear, // Or Easing.out(Easing.cubic)
            useNativeDriver: true,
        }).start();

        summaryTabRef.current = idx;
        setSummaryTab(idx);
    }, [summaryTabAnim]);
    const amenities = ['Coffee', 'Food', 'Restroom', 'Shopping', 'Hotel'];



    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!focusedInput) {
                setApiSuggestions([]);
                setShowSuggestions(false);
                return;
            }
            const query = focusedInput === 'source' ? source : destination;
            // Only search if user has typed at least 5 characters AND there's a space (likely finished a word)
            // This significantly reduces API cost and prevents junk calls
            if (query && query.length >= 5 && query.includes(' ') && query !== 'Current Location') {
                const results = await routeService.getPlaceSuggestions(query);
                setApiSuggestions(results);
                setShowSuggestions(results.length > 0);
            } else {
                setApiSuggestions([]);
                setShowSuggestions(false);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 800); // Higher debounce to wait for user to stop typing
        return () => clearTimeout(timeoutId);
    }, [source, destination, focusedInput]);

    const toggleAmenity = (item) => {
        if (selectedAmenity.includes(item)) {
            setSelectedAmenity(selectedAmenity.filter(i => i !== item));
        } else {
            setSelectedAmenity([...selectedAmenity, item]);
        }
    };

    const handlePlanRoute = async () => {
        if (!destination) {
            showAlert("Missing Input", "Please enter a destination.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Get Route
            let startLoc = source;
            if (source === 'Current Location') {
                try {
                    const location = await GetLocation.getCurrentPosition({
                        enableHighAccuracy: true,
                        timeout: 15000,
                    });
                    startLoc = { latitude: location.latitude, longitude: location.longitude };
                } catch (locError) {
                    console.warn("Location fetch failed, using fallback:", locError);
                    startLoc = "Pune, Maharashtra"; // Fallback
                }
            }
            const endLoc = destination;

            const routeData = await routeService.getRoute(startLoc, endLoc);
            // 2. Find Stations on this route
            const stationsOnRoute = await routeService.findStationsAlongRoute(routeData.points, 5);

            // Mock charging stations for Mumbai trip as requested
            let displayStations = stationsOnRoute;
            if (destination.toLowerCase().includes('mumbai')) {
                displayStations = [
                    {
                        name: "Tata Power Charging Station, Lonavala",
                        location: "Old Mumbai - Pune Hwy, Lonavala",
                        latitude: 18.7557,
                        longitude: 73.4091,
                        status: "Available"
                    },
                    {
                        name: "Jio-bp Pulse Charging Station, Navi Mumbai",
                        location: "Sector 30, Vashi",
                        latitude: 19.0652,
                        longitude: 72.9982,
                        status: "Available"
                    },
                    ...stationsOnRoute
                ];
            }

            setTripPlan({
                route: routeData,
                stations: displayStations,
                // Precise destination coords from Directions API leg.end_location
                destinationCoords: routeData.endLocation || null,
                destinationAddress: routeData.endAddress || destination,
                stats: {
                    distance: routeData.distanceKm.toFixed(1),
                    duration: Math.round(routeData.durationMins),
                    stops: displayStations.length
                }
            });
            setViewMode('SUMMARY');

        } catch (error) {
            console.error(error);
            showAlert("Planning Failed", "Could not calculate route. " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getMaxStops = useCallback(() => {
        const distance = parseFloat(tripPlan?.stats?.distance || 0);
        if (distance < 100) return 1;
        if (distance < 300) return 2;
        if (distance < 600) return 3;
        return 5;
    }, [tripPlan]);

    const toggleStation = useCallback((station) => {
        const isSelected = selectedStations.some(s => s.latitude === station.latitude && s.longitude === station.longitude);
        
        if (isSelected) {
            setSelectedStations(prev => prev.filter(s => s.latitude !== station.latitude || s.longitude !== station.longitude));
        } else {
            // Limits based on distance
            const maxStops = getMaxStops();
            const distance = parseFloat(tripPlan?.stats?.distance || 0);

            if (selectedStations.length >= maxStops) {
                showAlert("Limit Reached", `Max ${maxStops} stops allowed for this route length (${distance} km).`);
                return;
            }

            setSelectedStations(prev => [...prev, station]);
        }
    }, [selectedStations, tripPlan, showAlert]);

    const handleStartTrip = useCallback(() => {
        if (!tripPlan) return;
        
        // 1. Destination formatting
        const destCoords = tripPlan.destinationCoords;
        const destStr = destCoords 
            ? `${destCoords.lat},${destCoords.lng}` 
            : (tripPlan.destinationAddress || destination);
            
        // 2. Waypoints formatting (lat,lng only)
        const waypointsList = selectedStations
            .map(s => `${s.latitude},${s.longitude}`)
            .join('|');
            
        // 3. Assemble URL
        let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destStr)}`;
        
        // Origin
        if (source !== 'Current Location') {
            const startPoint = tripPlan.route.points[0];
            const originStr = `${startPoint.latitude},${startPoint.longitude}`;
            url += `&origin=${encodeURIComponent(originStr)}`;
        }
        
        // Waypoints
        if (waypointsList) {
            url += `&waypoints=${encodeURIComponent(waypointsList)}`;
        }
        
        // Avoid Tolls
        if (avoidTolls) {
            url += '&avoid=tolls';
        }
        
        url += '&travelmode=driving';

        console.log('[Nav] Final URL:', url);

        // Alert Confirmation
        showAlert(
            "Start Navigation",
            `Opening in Google Maps with ${selectedStations.length} stops.`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Let's Go", 
                    onPress: () => {
                        Linking.openURL(url).catch(err => {
                            console.error("Failed to open Maps URL:", err);
                            
                            // Fallback Intent for Android
                            if (Platform.OS === 'android') {
                                const destName = tripPlan.destinationAddress || destination;
                                const fallbackUrl = destCoords 
                                    ? `geo:${destCoords.lat},${destCoords.lng}?q=${destCoords.lat},${destCoords.lng}(${encodeURIComponent(destName)})`
                                    : `geo:0,0?q=${encodeURIComponent(destName)}`;
                                
                                console.log('[Nav] Fallback to Geo Intent:', fallbackUrl);
                                Linking.openURL(fallbackUrl).catch(fErr => {
                                    showAlert("Navigation Error", "Could not open any navigation app.");
                                });
                            } else {
                                showAlert("Navigation Error", "Could not open Google Maps.");
                            }
                        });
                    }
                }
            ]
        );

    }, [tripPlan, source, destination, showAlert, selectedStations, avoidTolls]);


    const handleStopTrip = useCallback(() => {
        setNavStatus('idle');
        setViewMode('SUMMARY');
        // Redirect to Home as requested
        navigation.navigate('Home');
    }, [navigation]);

    const handleReset = useCallback(() => {
        setTripPlan(null);
        setViewMode('INPUT');
        setSimulatedProgress(0);
        setCurrentLocation(null);
        setNextStopIndex(0);
        setNavStatus('idle');
        setSelectedStations([]);
        setSummaryTab(0);
        summaryTabRef.current = 0;
        summaryTabAnim.setValue(0);
        setAvoidTolls(false);
        sheetHeight.setValue(EXPANDED_HEIGHT);
        isExpanded.current = true;
        lastClosestIndex.current = 0;
    }, []);

    const handleSliderTouch = (e) => {
        if (sliderWidth === 0) return;
        const x = e.nativeEvent.locationX;
        const newPercent = Math.min(100, Math.max(0, Math.round((x / sliderWidth) * 100)));
        setBatteryLevel(newPercent);
    };

    const handleLocationSelect = (loc) => {
        if (focusedInput === 'source') setSource(loc);
        if (focusedInput === 'dest') setDestination(loc);
        setFocusedInput(null);
        setApiSuggestions([]);
        setShowSuggestions(false);
    };

    const suggestions = apiSuggestions;

    const renderInputView = () => (
        <View style={{ flex: 1 }}>
            <Animated.View style={[styles.topBar, {
                backgroundColor: scrollY.interpolate({
                    inputRange: [0, 50],
                    outputRange: ['rgba(15, 15, 15, 0)', 'rgba(15, 15, 15, 1)'],
                    extrapolate: 'clamp'
                }),
                borderBottomWidth: scrollY.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 1],
                    extrapolate: 'clamp'
                }),
                borderBottomColor: '#2C2C2E'
            }]}>
                <TouchableOpacity style={styles.backBtnWrapper} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={28} color="#fff" />
                </TouchableOpacity>
            </Animated.View>

            <Animated.ScrollView
                contentContainerStyle={styles.content}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.headerSpacer} />

                <Text style={styles.pageTitle}>Where to next?</Text>

                <Text style={styles.pageSubtitle}>Plan your journey with optimal charging stops.</Text>

                {/* Inputs Card */}
                <View style={[styles.card, { zIndex: 10 }]}>
                    <View style={styles.inputContainer}>
                        <View style={styles.iconBox}>
                            <MapPin size={20} color={Colors.primaryContainer} />
                        </View>
                        <TextInput
                            style={styles.input}
                            value={source}
                            onChangeText={setSource}
                            onFocus={() => setFocusedInput('source')}
                            onBlur={() => setTimeout(() => setFocusedInput(null), 200)} // Delay to allow click
                            placeholder="Current Location"
                            placeholderTextColor="#666"
                        />
                        {source.length > 0 && focusedInput === 'source' && (
                            <TouchableOpacity onPress={() => setSource('')}>
                                <X size={16} color="#666" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={styles.connectorLine} />
                    <View style={styles.inputContainer}>
                        <View style={[styles.iconBox, { backgroundColor: '#2A2A2A' }]}>
                            <Navigation size={20} color="#fff" />
                        </View>
                        <TextInput
                            style={styles.input}
                            value={destination}
                            onChangeText={setDestination}
                            onFocus={() => setFocusedInput('dest')}
                            onBlur={() => setTimeout(() => setFocusedInput(null), 200)}
                            placeholder="Enter Destination"
                            placeholderTextColor="#666"
                        />
                        {destination.length > 0 && focusedInput === 'dest' && (
                            <TouchableOpacity onPress={() => setDestination('')}>
                                <X size={16} color="#666" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Autocomplete Suggestions Overlay */}
                    {showSuggestions && suggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            {suggestions.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.suggestionItem}
                                    onPress={() => {
                                        handleLocationSelect(item);
                                        setShowSuggestions(false);
                                    }}
                                >
                                    <MapPin size={14} color="#666" style={{ marginRight: 10 }} />
                                    <Text style={styles.suggestionText}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Battery Slider */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Battery Level</Text>
                    <Text style={[styles.batteryValue, { color: getBatteryColor(batteryLevel) }]}>{batteryLevel}%</Text>
                </View>

                <View style={styles.card}>
                    <Slider
                        style={{ width: '100%', height: 40 }}
                        minimumValue={0}
                        maximumValue={100}
                        step={1}
                        value={batteryLevel}
                        onValueChange={setBatteryLevel}
                        minimumTrackTintColor={getBatteryColor(batteryLevel)}
                        maximumTrackTintColor="#333"
                        thumbTintColor="#fff"
                    />
                    <View style={styles.presetRow}>
                        {[20, 50, 80, 100].map(p => (
                            <TouchableOpacity key={p} onPress={() => setBatteryLevel(p)} style={styles.presetBtn}>
                                <Text style={styles.presetText}>{p}%</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Amenities */}
                <Text style={styles.sectionTitle}>Amenities</Text>
                <View style={styles.amenitiesContainer}>
                    {amenities.map(item => (
                        <TouchableOpacity
                            key={item}
                            style={[styles.chip, selectedAmenity.includes(item) && styles.chipActive]}
                            onPress={() => toggleAmenity(item)}
                        >
                            <Text style={[styles.chipText, selectedAmenity.includes(item) && styles.chipTextActive]}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Options */}
                <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <View>
                        <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>Avoid Tolls</Text>
                        <Text style={{ color: '#888', fontSize: 12 }}>Prefer routes without toll gates</Text>
                    </View>
                    <Switch
                        value={avoidTolls}
                        onValueChange={setAvoidTolls}
                        trackColor={{ false: '#333', true: Colors.primaryContainer + '80' }}
                        thumbColor={avoidTolls ? Colors.primaryContainer : '#888'}
                    />
                </View>

                {/* Action Button */}
                <TouchableOpacity style={styles.planBtn} onPress={handlePlanRoute} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#000" /> : <Zap size={24} color="#000" fill="#000" />}
                    <Text style={styles.planBtnText}>{isLoading ? "Finding Route..." : "Plan Trip"}</Text>
                </TouchableOpacity>
            </Animated.ScrollView>
        </View>
    );

    const renderSummaryView = () => {
        const statsOpacity = sheetHeight.interpolate({
            inputRange: [COLLAPSED_HEIGHT, COLLAPSED_HEIGHT + 80],
            outputRange: [0, 1],
            extrapolate: 'clamp'
        });

        const statsHeight = sheetHeight.interpolate({
            inputRange: [COLLAPSED_HEIGHT, COLLAPSED_HEIGHT + 80],
            outputRange: [0, 130],
            extrapolate: 'clamp'
        });

        const statsTranslateY = sheetHeight.interpolate({
            inputRange: [COLLAPSED_HEIGHT, COLLAPSED_HEIGHT + 80],
            outputRange: [-15, 0],
            extrapolate: 'clamp'
        });

        const miniStatsOpacity = sheetHeight.interpolate({
            inputRange: [COLLAPSED_HEIGHT, COLLAPSED_HEIGHT + 40],
            outputRange: [1, 0],
            extrapolate: 'clamp'
        });

        const mapSectionHeight = Animated.subtract(SCREEN_HEIGHT, sheetHeight);

        const TAB_BAR_WIDTH = SCREEN_WIDTH - 48;
        const TAB_WIDTH = (TAB_BAR_WIDTH - 12) / 2;

        const indicatorX = summaryTabAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, TAB_WIDTH + 12]
        });

        return (
            <View style={{ flex: 1, flexDirection: 'column', backgroundColor: '#121212' }}>
                {/* Map Section */}
                <Animated.View style={{ height: mapSectionHeight }}>
                    <MapView
                        ref={mapRef}
                        style={StyleSheet.absoluteFill}
                        provider={PROVIDER_GOOGLE}
                        customMapStyle={mapStyle}
                        initialRegion={{
                            latitude: 19.0760,
                            longitude: 72.8777,
                            latitudeDelta: 0.2,
                            longitudeDelta: 0.2,
                        }}
                    >
                        <Polyline
                            coordinates={tripPlan.route.points}
                            strokeColor={Colors.primaryContainer}
                            strokeWidth={4}
                        />

                        {/* Origin & Dest */}
                        <Marker coordinate={tripPlan.route.points[0]} title="Start" pinColor={Colors.white} />
                        <Marker coordinate={tripPlan.route.points[tripPlan.route.points.length - 1]} title="End" pinColor="red" />

                        {/* Stations */}
                        {tripPlan.stations.map((station, i) => (
                            <Marker
                                key={i}
                                coordinate={{ latitude: station.latitude, longitude: station.longitude }}
                                title={station.name}
                                onPress={() => toggleStation(station)}
                            >
                                <View style={[
                                    styles.markerContainer,
                                    selectedStations.some(s => s.latitude === station.latitude) && styles.markerActive
                                ]}>
                                    <Zap size={14} color={selectedStations.some(s => s.latitude === station.latitude) ? "#000" : Colors.primaryContainer} fill={selectedStations.some(s => s.latitude === station.latitude) ? "#000" : Colors.primaryContainer} />
                                </View>
                            </Marker>
                        ))}
                    </MapView>

                    <TouchableOpacity style={styles.closeMapBtn} onPress={handleReset}>
                        <X size={24} color="#000" />
                    </TouchableOpacity>

                    <View style={styles.mapLegend}>
                        <View style={styles.legendDot} />
                        <Text style={styles.legendText}>Tap marker to select stop  |  {selectedStations.length}/{getMaxStops()} stops selected</Text>
                    </View>
                </Animated.View>

                {/* Summary Sheet */}
                <Animated.View style={[
                    styles.summarySheet, 
                    { 
                        height: sheetHeight,
                        overflow: 'hidden' 
                    }
                ]}>
                    <View style={styles.sheetInner}>
                        {/* Mini Stats Row - visible only when collapsed */}
                        <Animated.View style={[styles.miniStatsRow, { opacity: miniStatsOpacity }]}>
                            <MapPin size={12} color="#888" style={{ marginRight: 6 }} />
                            <Text style={styles.miniStatsText}>
                                {tripPlan.stats.distance} km  ·  {Math.floor(tripPlan.stats.duration / 60)}h {tripPlan.stats.duration % 60}m  ·  {selectedStations.length} Stops
                            </Text>
                        </Animated.View>

                    <Animated.View style={[
                        styles.summaryHeader, 
                        { 
                            opacity: statsOpacity, 
                            height: statsHeight,
                            transform: [{ translateY: statsTranslateY }],
                            overflow: 'hidden'
                        }
                    ]}>
                        <Text style={styles.summaryTitle}>Trip Summary</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Distance</Text>
                                <Text style={styles.statValue}>{tripPlan.stats.distance} km</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Est. Time</Text>
                                <Text style={styles.statValue}>{Math.floor(tripPlan.stats.duration / 60)}h {tripPlan.stats.duration % 60}m</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Stops</Text>
                                <Text style={styles.statValue}>{tripPlan.stats.stops}</Text>
                            </View>
                        </View>
                    </Animated.View>

                    <View style={styles.tabContainer}>
                        <Animated.View style={[styles.tabIndicator, { 
                            width: TAB_WIDTH,
                            transform: [{ translateX: indicatorX }] 
                        }]} />
                        <TouchableOpacity 
                            style={[styles.tab]} 
                            onPress={() => switchSummaryTab(0)}
                        >
                            <Text style={[styles.tabText, summaryTab === 0 && styles.tabTextActive]}>All Stations</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tab]} 
                            onPress={() => switchSummaryTab(1)}
                        >
                            <Text style={[styles.tabText, summaryTab === 1 && styles.tabTextActive]}>My Stops ({selectedStations.length})</Text>
                        </TouchableOpacity>
                        </View>

                        <SummaryTabContent 
                            stations={summaryTab === 0 ? tripPlan.stations : selectedStations}
                            selectedStations={selectedStations}
                            toggleStation={toggleStation}
                            emptyMessage={summaryTab === 0 
                                ? "No charging stations found on this route." 
                                : "Tap markers or stations to select your stops."}
                        />

                        {/* Control Buttons + Start Trip Button Group */}
                        <View style={styles.footerRow}>
                            <View style={styles.controlsGroup}>
                                <TouchableOpacity 
                                    style={styles.controlBtn} 
                                    onPress={() => snapTo(EXPANDED_HEIGHT)}
                                >
                                    <ChevronUp size={18} color="#888" />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.controlBtn} 
                                    onPress={() => snapTo(COLLAPSED_HEIGHT)}
                                >
                                    <ChevronDown size={18} color="#888" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.startTripBtn, navStatus === 'initializing' && { opacity: 0.7 }]}
                                onPress={handleStartTrip}
                                disabled={navStatus === 'initializing'}
                            >
                                {navStatus === 'initializing' ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <ActivityIndicator size="small" color="#000" />
                                        <Text style={styles.startTripText}>Starting Navigation...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.startTripText}>
                                        Start Trip {selectedStations.length > 0 ? `· ${selectedStations.length} Stop${selectedStations.length > 1 ? 's' : ''}` : '(Direct)'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#121212" />
            {viewMode === 'INPUT' ? renderInputView() : renderSummaryView()}
        </View>
    );
}

const getBrandColor = (name) => {
    const n = name.toLowerCase();
    if (n.includes('tata')) return '#00539C';
    if (n.includes('jio')) return '#005EB8';
    if (n.includes('bp')) return '#00B140';
    if (n.includes('zeon')) return '#FFD700';
    return '#444';
};

const getBrandName = (name) => {
    const n = name.toLowerCase();
    if (n.includes('tata')) return 'Tata Power';
    if (n.includes('jio')) return 'Jio-bp Pulse';
    if (n.includes('zeon')) return 'Zeon Charging';
    return 'EV Network';
};

const getBatteryColor = (level) => {
    if (level > 50) return Colors.primaryContainer;
    if (level > 20) return 'orange';
    return 'red';
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F0F', // Darker background
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
        paddingTop: 40,
        paddingLeft: 20,
        zIndex: 100,
        justifyContent: 'center',
        alignItems: 'flex-start'
    },
    backBtnWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 24,
        paddingTop: 100,
        paddingBottom: 40
    },
    headerSpacer: {
        height: 20
    },
    pageTitle: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8
    },
    pageSubtitle: {
        color: '#888',
        fontSize: 16,
        marginBottom: 30
    },
    card: {
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 17,
        fontWeight: '500'
    },
    connectorLine: {
        height: 1,
        backgroundColor: '#2C2C2E',
        marginVertical: 15,
        marginLeft: 50
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 15
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15
    },
    batteryValue: {
        color: Colors.primaryContainer,
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 24
    },
    customSliderContainer: {
        height: 40,
        justifyContent: 'center',
        marginBottom: 20
    },
    sliderTrack: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#333'
    },
    sliderFill: {
        position: 'absolute',
        left: 0,
        height: 6,
        borderRadius: 3,
    },
    sliderThumb: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        top: 8, // CENTERED: (40 - 24) / 2 = 8
        marginLeft: -12, // Center the thumb on the percentage point
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 5
    },
    presetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5
    },
    presetBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#2C2C2E'
    },
    presetText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600'
    },
    amenitiesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 40,
    },
    chip: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        backgroundColor: '#1C1C1E',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    chipActive: {
        backgroundColor: Colors.white,
        borderColor: Colors.white,
    },
    chipText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '600'
    },
    chipTextActive: {
        color: '#000',
    },
    planBtn: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: 20,
        paddingVertical: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        shadowColor: Colors.primaryContainer,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10
    },
    planBtnText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5
    },
    // ... (Keep existing summary/drive styles below or let them be)
    mapContainer: {
        width: '100%',
        position: 'relative'
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    // Suggestions
    suggestionsContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: '#333',
        zIndex: 100,
        marginTop: 5, // space between card and list
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        maxHeight: 200,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#252525',
    },
    suggestionText: {
        color: '#ccc',
        fontSize: 14,
    },
    closeMapBtn: {
        position: 'absolute',
        top: 40,
        left: 20,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 8,
        elevation: 5
    },
    markerBadge: {
        backgroundColor: Colors.primaryContainer,
        padding: 5,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#fff',
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center'
    },
    markerBadgeSelected: {
        backgroundColor: '#fff',
        borderColor: '#000',
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    summarySheet: {
        backgroundColor: '#1212120d',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -8,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    sheetInner: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    dragHandleContainer: {
        width: '100%',
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    dragHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#444'
    },
    miniStatsRow: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        backgroundColor: '#1C1C1E',
        marginTop: 10,
    },
    miniStatsText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600'
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 16,
        paddingBottom: 8, // Approximate padding for insets
        backgroundColor: '#1C1C1E',
    },
    controlsGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    controlBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#313131ff',
        borderWidth: 1,
        borderColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryHeader: {
        paddingHorizontal: 24,
    },
    summaryTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 16
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#2C2C2E',
        padding: 16,
        borderRadius: 16,
        marginBottom: 18
    },
    statItem: {
        alignItems: 'center'
    },
    statLabel: {
        color: '#666',
        fontSize: 10,
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    statValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold'
    },
    timeline: {
        flex: 1,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 20
    },
    timelineLeft: {
        alignItems: 'center',
        marginRight: 15,
        width: 30
    },
    timelineLine: {
        position: 'absolute',
        top: 15,
        bottom: -25,
        width: 2,
        backgroundColor: '#333'
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#1C1C1E',
        borderWidth: 2,
        borderColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1
    },
    stopNum: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold'
    },
    timelineContent: {
        flex: 1,
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 16
    },
    timelineTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2
    },
    timelineSub: {
        color: '#888',
        fontSize: 12,
        marginBottom: 5
    },
    startTripBtn: {
        flex: 1,
        height: 54,
        backgroundColor: Colors.white,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    startTripText: {
        color: '#000',
        fontSize: 14,
        fontWeight: 'bold'
    },
    // Drive Mode Styles
    driverMarker: {
        backgroundColor: '#2196F3',
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 5
    },
    driveCard: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10
    },
    driveCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15
    },
    driveTitle: {
        color: '#888',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4
    },
    driveStationName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        width: '90%'
    },
    stopBtn: {
        backgroundColor: '#2C2C2E',
        padding: 8,
        borderRadius: 20
    },
    driveStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        backgroundColor: '#121212',
        borderRadius: 16,
        padding: 16
    },
    driveStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    driveStatVal: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14
    },
    amenityTip: {
        backgroundColor: 'rgba(255, 152, 0, 0.05)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 152, 0, 0.2)'
    },
    amenityText: {
        color: '#FF9800',
        fontSize: 14,
        fontStyle: 'italic'
    },
    navBtn: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center'
    },
    navBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold'
    },
    instructionBar: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 10
    },
    instructionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    instructionContent: {
        flex: 1
    },
    instructionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2
    },
    instructionSub: {
        color: '#888',
        fontSize: 12
    },
    upcomingStopsContainer: {
        position: 'absolute',
        bottom: 180, // Positioned above the driveCard
        left: 0,
        right: 0,
        height: 60,
    },
    upcomingStationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 15,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        minWidth: 150,
    },
    upcomingStationIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    upcomingStationName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        maxWidth: 100
    },
    upcomingStationDist: {
        color: Colors.primaryContainer,
        fontSize: 12,
        fontWeight: 'bold'
    },
    navOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    navOverlayText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
    },
    endNavBtn: {
        position: 'absolute',
        top: 178,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(30,30,30,0.85)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        zIndex: 100,
    },
    endNavBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 15,
        marginTop: 18,
        gap: 12,
        position: 'relative',
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        marginHorizontal: 16,
        padding: 4,
    },
    tabIndicator: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        borderRadius: 28,
        marginHorizontal: 1,
        backgroundColor: Colors.white,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    tabText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '600'
    },
    tabTextActive: {
        color: '#000',
    },
    selectedBadge: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: 10,
        padding: 4,
        marginLeft: 8
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
        gap: 15
    },
    emptyStateText: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
        maxWidth: '80%'
    },
    mapLegend: {
        position: 'absolute',
        bottom: 5,
        right: 0,
        backgroundColor: 'rgba(30, 30, 30, 0.85)',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primaryContainer
    },
    legendText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600'
    },
    brandLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    brandInitial: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18
    },
    brandName: {
        color: '#888',
        fontSize: 12,
        marginBottom: 2
    },
    selectBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    selectBtnActive: {
        backgroundColor: Colors.primaryContainer
    },
    selectedStopsBar: {
        height: 60,
        paddingHorizontal: 5,
        marginBottom: 10,
        justifyContent: 'center'
    },
    stopChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        borderWidth: 1,
        borderColor: Colors.primaryContainer,
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 8,
        maxWidth: 150
    },
    stopChipText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600'
    },
    barPlaceholder: {
        color: '#666',
        fontSize: 13,
        fontStyle: 'italic',
        paddingLeft: 10
    },
    fadeOverlay: {
        width: '100%',
        height: 40,
        backgroundColor: '#121212',
        opacity: 0.8,
    }
});

function SummaryTabContent({ stations, selectedStations, toggleStation, emptyMessage }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
        }).start();
    }, [stations, fadeAnim]);

    return (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <ScrollView style={styles.timeline}>
                {stations.map((station, i) => (
                    <TouchableOpacity 
                        key={i} 
                        style={styles.timelineItem}
                        onPress={() => toggleStation(station)}
                    >
                        <View style={styles.timelineLeft}>
                            <View style={styles.timelineLine} />
                            <View style={[
                                styles.timelineDot,
                                selectedStations.some(s => s.latitude === station.latitude && s.longitude === station.longitude) && { backgroundColor: Colors.primaryContainer }
                            ]}>
                                <Text style={styles.stopNum}>{i + 1}</Text>
                            </View>
                        </View>
                        <View style={[
                            styles.timelineContent,
                            selectedStations.some(s => s.latitude === station.latitude && s.longitude === station.longitude) && { borderLeftWidth: 3, borderLeftColor: Colors.primaryContainer }
                        ]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={[styles.brandLogo, { backgroundColor: getBrandColor(station.name) }]}>
                                    <Text style={styles.brandInitial}>{station.name.charAt(0)}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.timelineTitle}>{station.name}</Text>
                                    <Text style={styles.brandName}>{getBrandName(station.name)}</Text>
                                    <Text style={styles.timelineSub}>{station.location}</Text>
                                </View>
                                <TouchableOpacity 
                                    style={[
                                        styles.selectBtn,
                                        selectedStations.some(s => s.latitude === station.latitude && s.longitude === station.longitude) && styles.selectBtnActive
                                    ]}
                                    onPress={() => toggleStation(station)}
                                >
                                    {selectedStations.some(s => s.latitude === station.latitude && s.longitude === station.longitude) ? 
                                        <Check size={16} color="#000" strokeWidth={3} /> : 
                                        <Plus size={16} color={Colors.primaryContainer} strokeWidth={3} />
                                    }
                                </TouchableOpacity>
                            </View>
                            <View style={{ marginTop: 8 }}>
                                {(station.status || '').toLowerCase() === 'available' ?
                                    <Text style={{ color: Colors.white, fontSize: 12 }}>Available • Fast Charging</Text> :
                                    <Text style={{ color: 'orange', fontSize: 12 }}>{station.status}</Text>
                                }
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
                {stations.length === 0 && (
                    <View style={styles.emptyState}>
                        <MapPin size={40} color="#333" />
                        <Text style={styles.emptyStateText}>{emptyMessage}</Text>
                    </View>
                )}
            </ScrollView>
        </Animated.View>
    );
}
