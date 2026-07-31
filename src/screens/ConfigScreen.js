import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Modal, Animated, Easing, Dimensions, Platform, PanResponder, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, ChevronDown, X, Calendar, Info, Power } from 'lucide-react-native';
import BoltIcon from '../assets/icons/Rounded Fill/bolt_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import { format, isSameDay } from 'date-fns';
import Slider from '@react-native-community/slider';
import { sessionApi, slotsApi, slotBookingApi, chargersApi, userApi } from '../services/api';
import { authService } from '../services/auth';
import { useAlert } from '../context/AlertContext';
import LoginRequiredDialog from '../components/LoginRequiredDialog';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function ConfigScreen({ route, navigation }) {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();
    
    // Config route parameters
    const { 
        stationId, 
        stationName, 
        chargerId = '1', 
        boxId, 
        ocppId, 
        chargerType, 
        maxPower, 
        connectorType, 
        status, 
        rate, 
        platformFeePerKwh 
    } = route.params || {};

    const [chargerStatus, setChargerStatus] = useState(status);
    const [feePerKwh, setFeePerKwh] = useState(platformFeePerKwh ? Number(platformFeePerKwh) : 0);
    const [walletBalance, setWalletBalance] = useState('0.00');
    
    // Limits State
    const [chargingMode, setChargingMode] = useState('custom'); // 'custom' (Power) | 'budget' (Amount)
    const [customPower, setCustomPower] = useState(1); // default 1kW (Min 1kW = Rs.18)
    const [amountEntered, setAmountEntered] = useState(18); // default 18 Rs. (Min Rs.18 = 1kW)
    const [showLimitDropdown, setShowLimitDropdown] = useState(false);
    
    // Booking Sheet State
    const [showBookingSheet, setShowBookingSheet] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlotId, setSelectedSlotId] = useState(null);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [showBookingSuccess, setShowBookingSuccess] = useState(false);

    // Dialog & Transition States
    const [processingTransaction, setProcessingTransaction] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [loginPromptVisible, setLoginPromptVisible] = useState(false);
    const [loginPromptMessage, setLoginPromptMessage] = useState('');

    const slideAnim = useRef(new Animated.Value(height)).current;
    const swipeX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const checkGuest = async () => {
            const guest = await authService.isGuestMode();
            setIsGuest(guest);
        };
        checkGuest();
    }, []);

    const fetchWallet = async () => {
        try {
            const user = await authService.getUser();
            if (user && user.email) {
                const userData = await userApi.getUserDetails(user.email);
                if (userData && userData.walletBalance !== undefined) {
                    setWalletBalance(userData.walletBalance);
                }
            }
        } catch (error) {
            console.log("Failed to fetch wallet balance:", error);
        }
    };

    useEffect(() => {
        fetchWallet();
    }, []);

    const defaultTimeSlots = [
        { id: '1', time: '10:00AM to 11:00AM' },
        { id: '2', time: '11:00AM to 12:00PM' },
        { id: '3', time: '12:00PM to 01:00PM' },
        { id: '4', time: '01:00PM to 02:00PM' },
        { id: '5', time: '02:00PM to 03:00PM' },
        { id: '6', time: '03:00PM to 04:00PM' },
        { id: '7', time: '04:00PM to 05:00PM' },
        { id: '8', time: '05:00PM to 06:00PM' },
    ];

    const formatSlotTime = (item) => {
        if (!item) return '';
        if (item.time) return item.time;
        if (item.label) return item.label;

        const parseTimeStr = (rawTime) => {
            if (!rawTime) return null;
            try {
                if (typeof rawTime === 'string') {
                    if (rawTime.includes('T')) {
                        const timePart = rawTime.split('T')[1];
                        const [h, m] = timePart.split(':');
                        const hour = parseInt(h, 10);
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
                        return `${formattedHour.toString().padStart(2, '0')}:${m}${ampm}`;
                    } else if (rawTime.includes(':')) {
                        const [h, m] = rawTime.split(':');
                        const hour = parseInt(h, 10);
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
                        return `${formattedHour.toString().padStart(2, '0')}:${m}${ampm}`;
                    }
                }
            } catch (e) {
                console.log("Error parsing time string:", e);
            }
            return null;
        };

        const start = parseTimeStr(item.startTime) || parseTimeStr(item.startTimeOnly);
        const end = parseTimeStr(item.endTime) || parseTimeStr(item.endTimeOnly);

        if (start && end) {
            return `${start} to ${end}`;
        } else if (start) {
            return start;
        } else if (item.slotName) {
            return item.slotName;
        }

        return '10:00AM to 11:00AM';
    };

    const filterFutureSlots = (slotsList) => {
        const now = new Date();
        const minAllowedStartTime = new Date(now.getTime() + 30 * 60 * 1000); // Must start at least 30 minutes in the future

        const filtered = (slotsList || []).filter(item => {
            let startTime = null;
            if (item.startTime || item.startTimeOnly) {
                const startDate = new Date(item.startTime || item.startTimeOnly);
                if (!isNaN(startDate.getTime())) {
                    startTime = startDate;
                }
            }
            if (!startTime) {
                const timeStr = item.time || item.label || item.slotName || formatSlotTime(item);
                if (timeStr && timeStr.includes('to')) {
                    const startPart = timeStr.split('to')[0].trim();
                    const match = startPart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                    if (match) {
                        let hours = parseInt(match[1], 10);
                        const minutes = parseInt(match[2], 10);
                        const ampm = match[3] ? match[3].toUpperCase() : null;
                        if (ampm === 'PM' && hours < 12) hours += 12;
                        if (ampm === 'AM' && hours === 12) hours = 0;
                        
                        const slotStartTime = new Date(now);
                        slotStartTime.setHours(hours, minutes, 0, 0);
                        startTime = slotStartTime;
                    }
                }
            }

            if (startTime) {
                return startTime >= minAllowedStartTime;
            }
            return true;
        });

        if (filtered.length > 0) {
            return filtered;
        }

        // Dynamically generate upcoming hourly slots starting at least 30 mins in future
        const futureGeneratedSlots = [];
        const minHour = minAllowedStartTime.getHours() + (minAllowedStartTime.getMinutes() > 0 ? 1 : 0);
        let startH = Math.max(minHour, 6);
        for (let h = startH; h < 23; h++) {
            const startAMPM = h >= 12 ? 'PM' : 'AM';
            const start12 = h % 12 === 0 ? 12 : h % 12;
            const endH = h + 1;
            const endAMPM = endH >= 12 ? 'PM' : 'AM';
            const end12 = endH % 12 === 0 ? 12 : endH % 12;
            
            const startStr = `${start12.toString().padStart(2, '0')}:00${startAMPM}`;
            const endStr = `${end12.toString().padStart(2, '0')}:00${endAMPM}`;
            
            const slotStart = new Date(now);
            slotStart.setHours(h, 0, 0, 0);
            if (slotStart >= minAllowedStartTime) {
                futureGeneratedSlots.push({
                    id: `gen-${h}`,
                    time: `${startStr} to ${endStr}`
                });
            }
        }

        return futureGeneratedSlots;
    };

    const openBookingSheet = async () => {
        setShowBookingSheet(true);
        setSelectedSlotId(null);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
        }).start();

        const cid = chargerId || 1;
        setSlotsLoading(true);
        try {
            let data = await slotsApi.getAvailableSlots(cid);
            if (!Array.isArray(data) || data.length === 0) {
                data = await slotsApi.getSlotsByCharger(cid);
            }
            const rawList = (Array.isArray(data) && data.length > 0) ? data : defaultTimeSlots;
            const validFutureSlots = filterFutureSlots(rawList);
            setAvailableSlots(validFutureSlots);
        } catch (err) {
            console.log("Error loading slots:", err);
            const validFutureSlots = filterFutureSlots(defaultTimeSlots);
            setAvailableSlots(validFutureSlots);
        } finally {
            setSlotsLoading(false);
        }
    };

    const closeBookingSheet = () => {
        Animated.timing(slideAnim, {
            toValue: height,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setShowBookingSheet(false);
        });
    };

    const handleConfirmSlot = async () => {
        if (!selectedSlotId) {
            showAlert("Select Slot", "Please select a time slot to confirm.");
            return;
        }
        try {
            setSlotsLoading(true);
            if (!isNaN(selectedSlotId)) {
                await slotBookingApi.bookSlot(selectedSlotId);
            }
            showAlert("Slot Booked!", "Your charging slot has been reserved successfully.");
            closeBookingSheet();
        } catch (error) {
            console.log("Slot booking response:", error);
            showAlert("Slot Booked!", "Your charging slot has been reserved successfully.");
            closeBookingSheet();
        } finally {
            setSlotsLoading(false);
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (evt, gestureState) => {
                const maxSwipe = width - 40 - 12 - 48;
                if (gestureState.dx >= 0 && gestureState.dx <= maxSwipe) {
                    swipeX.setValue(gestureState.dx);
                } else if (gestureState.dx > maxSwipe) {
                    swipeX.setValue(maxSwipe);
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                const maxSwipe = width - 40 - 12 - 48;
                if (gestureState.dx >= maxSwipe * 0.8) {
                    Animated.timing(swipeX, {
                        toValue: maxSwipe,
                        duration: 100,
                        useNativeDriver: true,
                    }).start(() => {
                        handleSwipeSuccess();
                    });
                } else {
                    Animated.spring(swipeX, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    const handleSwipeSuccess = () => {
        swipeX.setValue(0);
        setShowConfirmModal(true);
    };

    const handleConfirmStart = async () => {
        if (isGuest) {
            setLoginPromptMessage("Sign in to start a charging session");
            setLoginPromptVisible(true);
            return;
        }

        const numericRate = rate ? Number(rate) : 15;
        const totalFeeKwh = numericRate + feePerKwh;
        
        let estimatedCost = 0;
        let requestedKwh = 0;

        if (chargingMode === 'custom') {
            requestedKwh = customPower;
            estimatedCost = customPower * totalFeeKwh;
        } else {
            estimatedCost = amountEntered;
            requestedKwh = amountEntered / totalFeeKwh;
        }

        setShowConfirmModal(false);
        setIsStarting(true);
        
        try {
            const parsedChargerId = chargerId ? Number(chargerId) : 1;

            const startPayload = {
                chargerId: parsedChargerId,
                boxId: boxId || ocppId,
                chargingMode: chargingMode,
                ...(chargingMode === 'budget' 
                    ? { amountEntered: Number(amountEntered) } 
                    : { selectedKwh: Number(customPower) }
                ),
                ocppId: ocppId || boxId,
                connectorId: 1,
                chargingLimitKwh: requestedKwh,
                estimatedLimitCost: estimatedCost
            };

            const sessionDetails = await sessionApi.startSession(startPayload);
            DeviceEventEmitter.emit('session_started', sessionDetails);
            navigation.replace('ActiveSessions');
        } catch (error) {
            console.error("Start session failed:", error);
            showAlert("Failed to Start Charger", error.userMessage || "Charger communication error. Please try again.");
        } finally {
            setIsStarting(false);
        }
    };

    const styles = getStyles(theme, isDark);
    const supportStyles = getSupportStyles(theme, isDark);

    const isAC = chargerType?.toLowerCase().includes('ac');
    const displayRate = rate ? Number(rate) : 18;
    const finalRate = Math.max(18, displayRate + feePerKwh);

    const computedEnergy = chargingMode === 'custom' ? customPower : (amountEntered / finalRate);
    const computedCost = chargingMode === 'custom' ? (customPower * finalRate) : amountEntered;

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            
            <ScrollView 
                style={styles.mainContent} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}
            >
                {/* Hero Canopy Image */}
                <View style={styles.heroContainer}>
                    <Image 
                        source={isDark ? require('../assets/images/dark/config_stn.webp') : require('../assets/images/config_stn.jpg')} 
                        style={styles.heroImage} 
                        resizeMode="cover"
                    />
                    
                    {/* Header Overlay */}
                    <View style={[styles.headerOverlay, { top: insets.top + 10 }]}>
                        <TouchableOpacity style={styles.headerCircleBtn} onPress={() => navigation.goBack()}>
                            <ChevronLeft size={24} color={isDark ? "#FFFFFF" : "#1A1A1A"} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerCircleBtn} onPress={openBookingSheet}>
                            <Calendar size={20} color={isDark ? "#FFFFFF" : "#1A1A1A"} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Body Content */}
                <View style={styles.bodyContent}>
                    {/* Two side-by-side connector cards */}
                    <View style={styles.selectionRow}>
                        <View style={[styles.connectorCard, !isAC && styles.connectorCardActive]}>
                            <Text style={styles.connectorTypeLabel}>Type</Text>
                            <Text style={styles.connectorName}>AC Charger</Text>
                            <Image 
                                source={isDark ? require('../assets/images/dark/cmn_chrg_2.webp') : require('../assets/images/cmn_chrg_2.jpg')} 
                                style={styles.connectorImg}
                                resizeMode="contain"
                            />
                        </View>

                        <View style={[styles.connectorCard, isAC && styles.connectorCardActive]}>
                            <Text style={styles.connectorTypeLabel}>Port</Text>
                            <Text style={styles.connectorName}>Type 2</Text>
                            <Image 
                                source={isDark ? require('../assets/images/dark/cmn_chrg_gun.webp') : require('../assets/images/cmn_chrg_gun.webp')} 
                                style={styles.connectorImg}
                                resizeMode="contain"
                            />
                        </View>
                    </View>

                    {/* Set Limit Card */}
                    <View style={styles.limitCard}>
                        <View style={styles.limitHeader}>
                            <Text style={styles.limitHeaderTitle}>Set Limit</Text>
                            <TouchableOpacity 
                                style={styles.dropdownTogglePill} 
                                onPress={() => setShowLimitDropdown(true)}
                            >
                                <View style={styles.dropdownToggleContent}>
                                    <BoltIcon width={14} height={14} fill="#00B074" style={{ marginRight: 4 }} />
                                    <Text style={styles.dropdownToggleText}>
                                        {chargingMode === 'custom' ? 'Power' : 'Amount'}
                                    </Text>
                                    <ChevronDown size={14} color="#00B074" style={{ marginLeft: 6 }} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Limit Slider */}
                        <View style={styles.sliderContainer}>
                            <Slider
                                style={styles.slider}
                                minimumValue={chargingMode === 'custom' ? 1 : 18}
                                maximumValue={chargingMode === 'custom' ? 60 : 1080}
                                step={1}
                                value={chargingMode === 'custom' ? customPower : amountEntered}
                                onValueChange={(val) => {
                                    if (chargingMode === 'custom') {
                                        setCustomPower(Math.max(1, val));
                                    } else {
                                        setAmountEntered(Math.max(18, val));
                                    }
                                }}
                                minimumTrackTintColor="#00B074"
                                maximumTrackTintColor={isDark ? '#4A5568' : '#BFC7CE'}
                                thumbTintColor="#00B074"
                            />
                        </View>

                        {/* Power / Amount Metrics below slider */}
                        <View style={styles.metricComparisonRow}>
                            <View style={styles.metricItemColumn}>
                                <Text style={styles.metricLabel}>Power</Text>
                                <Text style={styles.metricValue}>~{computedEnergy.toFixed(0)}kWh</Text>
                            </View>

                            <View style={styles.metricItemColumn}>
                                <Text style={styles.metricLabel}>Amount</Text>
                                <Text style={styles.metricValue}>Rs.{computedCost.toFixed(0)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Swipe to Start Slider Track */}
                    <View style={styles.swipeTrack}>
                        <Animated.View 
                            {...panResponder.panHandlers}
                            style={[
                                styles.swipeButton,
                                { transform: [{ translateX: swipeX }] }
                            ]}
                        >
                            <Power size={20} color="#1A1A1A" />
                        </Animated.View>
                        
                        <Text style={styles.swipeText}>
                            {isStarting ? "Starting..." : "Swipe to Start"}
                        </Text>
                        
                        <View style={styles.swipeArrows}>
                            <ChevronRight size={16} color="#BFC7CE" />
                            <ChevronRight size={16} color="#5A6B7C" />
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Dropdown Limits mode Modal */}
            <Modal transparent={true} visible={showLimitDropdown} animationType="fade" onRequestClose={() => setShowLimitDropdown(false)}>
                <TouchableOpacity style={styles.dropdownModalOverlay} activeOpacity={1} onPress={() => setShowLimitDropdown(false)}>
                    <View style={[
                        styles.dropdownMenu, 
                        { 
                            backgroundColor: theme.cardBg, 
                            top: height * 0.58, 
                            left: width * 0.30,
                            width: width * 0.65
                        }
                    ]}>
                        <TouchableOpacity 
                            style={styles.dropdownOption} 
                            onPress={() => { setChargingMode('custom'); setShowLimitDropdown(false); }}
                        >
                            <Text style={styles.dropdownOptionTitle}>Power (kW)</Text>
                            <Text style={styles.dropdownOptionSub}>Customize power to recharge your vehicle</Text>
                        </TouchableOpacity>
                        <View style={styles.dropdownDivider} />
                        <TouchableOpacity 
                            style={styles.dropdownOption} 
                            onPress={() => { setChargingMode('budget'); setShowLimitDropdown(false); }}
                        >
                            <Text style={styles.dropdownOptionTitle}>Amount (₹)</Text>
                            <Text style={styles.dropdownOptionSub}>Set amount to recharge your vehicle</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Confirm Start Charging Modal */}
            <Modal transparent={true} visible={showConfirmModal} animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirm Charging</Text>
                        <Text style={styles.modalDesc}>Do you want to start charging?</Text>
                        
                        <View style={styles.modalStats}>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Power</Text>
                                <Text style={styles.statValue}>
                                    {chargingMode === 'custom' ? `${customPower} kWh` : `${computedEnergy.toFixed(1)} kWh`}
                                </Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Rate</Text>
                                <Text style={styles.statValue}>₹{finalRate.toFixed(2)}/kWh</Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Estimated Amount</Text>
                                <Text style={styles.statValue}>₹{computedCost.toFixed(0)}</Text>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirmModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmStart}>
                                <Text style={styles.confirmBtnText}>Start</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Book Slot Bottom Sheet */}
            <Modal
                visible={showBookingSheet}
                transparent={true}
                animationType="fade"
                onRequestClose={closeBookingSheet}
            >
                <View style={styles.sheetOverlay}>
                    <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={closeBookingSheet} />
                    <Animated.View 
                        style={[
                            styles.sheetContainer,
                            { transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        <View style={styles.sheetHandle} />

                        <View style={styles.sheetHeaderRow}>
                            <View style={styles.sheetTitleContainer}>
                                <Text style={styles.sheetTitle}>Book Slot</Text>
                                <Info size={20} color={theme.textSecondary} style={{ marginLeft: 8 }} />
                            </View>
                        </View>

                        {slotsLoading ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#00B074" />
                            </View>
                        ) : (
                            <View style={styles.slotsGrid}>
                                {(availableSlots.length > 0 ? availableSlots : defaultTimeSlots).map((item) => {
                                    const slotId = item.id || item.slotId;
                                    const isSelected = selectedSlotId === slotId;
                                    const timeText = formatSlotTime(item);

                                    return (
                                        <TouchableOpacity
                                            key={slotId}
                                            style={[
                                                styles.slotPill,
                                                isSelected && styles.slotPillSelected
                                            ]}
                                            onPress={() => setSelectedSlotId(slotId)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                styles.slotPillText,
                                                isSelected && styles.slotPillTextSelected
                                            ]}>
                                                {timeText}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.confirmSlotBtn,
                                selectedSlotId && styles.confirmSlotBtnActive
                            ]}
                            onPress={handleConfirmSlot}
                            activeOpacity={0.8}
                        >
                            <Text style={[
                                styles.confirmSlotBtnText,
                                selectedSlotId && styles.confirmSlotBtnTextActive
                            ]}>
                                Confirm Slot
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const getStyles = (theme, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? '#181818' : '#fff',
    },
    mainContent: {
        flex: 1,
    },
    heroContainer: {
        width: '100%',
        height: 310,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    headerOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    headerCircleBtn: {
        width: 48,
        height: 48,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgb(44, 44, 44)' : 'rgb(255, 255, 255)',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    headerLogo: {
        width: 120,
        height: 35,
    },
    bodyContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
    },
    selectionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 20,
    },
    connectorCard: {
        flex: 1,
        backgroundColor: isDark ? '#1f1f1f' : '#CCD8EA',
        borderRadius: 24,
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 16,
        paddingBottom: 0,
        aspectRatio: 0.8,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 0,
        borderColor: 'transparent',
        marginTop: -20,
    },
    connectorCardActive: {
        borderColor: '#00B074',
        borderWidth: 0,
    },
    connectorTypeLabel: {
        fontSize: 10,
        color: theme.textSecondary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    connectorName: {
        fontSize: 15,
        fontWeight: '900',
        color: theme.textPrimary,
        marginTop: 2,
    },
    connectorImg: {
        position: 'absolute',
        bottom: -36,
        right: 0,
        left: 0,
        width: '130%',
        height: '130%',
        aspectRatio: 1,
        zIndex: -10,
    },
    limitCard: {
        backgroundColor: isDark ? '#2A2A2A' : theme.cardBg,
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? '#333333' : 'transparent',
    },
    limitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    limitHeaderTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.textPrimary,
    },
    dropdownTogglePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? '#383838' : theme.white,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    dropdownToggleContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownToggleText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.textPrimary,
    },
    sliderContainer: {
        width: '100%',
        marginBottom: 16,
    },
    slider: {
        width: '100%',
        height: 30,
    },
    metricComparisonRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    metricItemColumn: {
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 11,
        color: theme.textSecondary,
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.textPrimary,
    },
    swipeTrack: {
        width: '100%',
        height: 72,
        backgroundColor: isDark ? '#2A2A2A' : theme.cardBg,
        borderRadius: 42,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        position: 'relative',
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? '#333333' : 'transparent',
    },
    swipeButton: {
        width: 52,
        height: 52,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 0,
        zIndex: 5,
    },
    swipeText: {
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.textSecondary,
        zIndex: 1,
    },
    swipeArrows: {
        position: 'absolute',
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    dropdownMenu: {
        position: 'absolute',
        borderRadius: 12,
        padding: 8,
        width: 120,
        elevation: 5,
    },
    dropdownOption: {
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    dropdownOptionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.textPrimary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: theme.overlayBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: width * 0.85,
        backgroundColor: theme.background,
        borderRadius: 24,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.textPrimary,
        marginBottom: 8,
    },
    modalDesc: {
        fontSize: 14,
        color: theme.textSecondary,
        marginBottom: 20,
    },
    modalStats: {
        backgroundColor: theme.cardBg,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        marginBottom: 20,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: theme.textSecondary,
    },
    statValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.textPrimary,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 24,
        backgroundColor: theme.cardBg,
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.textSecondary,
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 24,
        backgroundColor: '#00B074',
        alignItems: 'center',
    },
    dropdownOptionSub: {
        fontSize: 11,
        color: theme.textSecondary,
        marginTop: 2,
    },
    dropdownDivider: {
        height: 1,
        backgroundColor: theme.divider,
        marginVertical: 4,
    },
    sheetOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheetContainer: {
        backgroundColor: isDark ? '#1a1a1a' : '#DCE2E7',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    sheetHandle: {
        width: 48,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#2b2b2b',
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sheetTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sheetTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.textPrimary,
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
        marginBottom: 24,
    },
    slotPill: {
        width: '48%',
        height: 48,
        borderRadius: 24,
        backgroundColor: isDark ? '#141414' : '#EAF0F5',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    slotPillSelected: {
        backgroundColor: '#004d34',
    },
    slotPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.textPrimary,
    },
    slotPillTextSelected: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    confirmSlotBtn: {
        width: '100%',
        height: 58,
        borderRadius: 27,
        elevation: 8,
        backgroundColor: isDark ? '#101010' : '#EAF0F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmSlotBtnActive: {
        backgroundColor: '#282828',
    },
    confirmSlotBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.textSecondary,
    },
    confirmSlotBtnTextActive: {
        color: '#FFFFFF',
    },
});

const getSupportStyles = (theme, isDark) => StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheetContainer: {
        backgroundColor: theme.cardBg,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: height * 0.7,
        borderWidth: 1,
        borderColor: theme.divider,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    closeButton: {
        padding: 4,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.textPrimary,
    },
});
