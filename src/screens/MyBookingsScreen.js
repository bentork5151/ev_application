import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, Clock, Bolt, X, Play } from 'lucide-react-native';
import { slotBookingApi, slotsApi } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { authService } from '../services/auth';
import LoginRequiredDialog from '../components/LoginRequiredDialog';
import { useTheme } from '../context/ThemeContext';
import { isBookingExpired } from '../utils/bookingUtils';

const ITEM_HEIGHT = 165; 

const formatDateTime = (inputTime, inputEndTime) => {
    let dateObj = new Date();
    let endDateObj = new Date();
    let timeSet = false;
    let endTimeSet = false;

    const parseTime = (timeVal) => {
        let parsedDate = new Date();
        let isSet = false;
        try {
            if (Array.isArray(timeVal)) {
                const [y, M, d, h, m, s] = timeVal;
                parsedDate = new Date(y, M - 1, d, h, m, s || 0);
                isSet = true;
            } else if (typeof timeVal === 'string') {
                const timeOnlyRegex = /^([01]\d|2[0-3])[:.]([0-5]\d)([:.]([0-5]\d))?$/;
                if (timeOnlyRegex.test(timeVal)) {
                    const parts = timeVal.split(/[:.]/).map(Number);
                    parsedDate.setHours(parts[0], parts[1], parts[2] || 0, 0);
                    isSet = true;
                } else {
                    const safeDateStr = timeVal.replace(' ', 'T');
                    const parsed = new Date(safeDateStr);
                    if (!isNaN(parsed.getTime())) {
                        parsedDate = parsed;
                        isSet = true;
                    }
                }
            } else if (timeVal instanceof Date) {
                parsedDate = timeVal;
                isSet = true;
            } else if (typeof timeVal === 'number') {
                parsedDate = new Date(timeVal);
                isSet = true;
            }
        } catch (e) {
            console.warn("DateTime Parse Failed:", e);
        }
        return { parsedDate, isSet };
    };

    const startRes = parseTime(inputTime);
    dateObj = startRes.parsedDate;
    timeSet = startRes.isSet;

    if (inputEndTime) {
        const endRes = parseTime(inputEndTime);
        endDateObj = endRes.parsedDate;
        endTimeSet = endRes.isSet;
    }

    if (isNaN(dateObj.getTime())) {
        return { date: '---', time: '---' };
    }

    const dateStr = dateObj.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    
    if (timeSet) {
        const startStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (endTimeSet && !isNaN(endDateObj.getTime())) {
            const endStr = endDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return {
                date: dateStr,
                time: `${startStr} to ${endStr}`
            };
        }
        return {
            date: dateStr,
            time: startStr
        };
    }

    return {
        date: dateStr,
        time: '---'
    };
};

const BookingCard = React.memo(({ booking, onPress, activeTab }) => {
    const { theme, isDark } = useTheme();
    const slotTimeSource = booking.slotStartTime ||
        booking.slot_start_time ||
        booking.slot?.startTime ||
        booking.slot?.start_time ||
        booking.slot?.startTimeOnly ||
        booking.startTime ||
        booking.start_time;

    const slotEndTimeSource = booking.slotEndTime ||
        booking.slot_end_time ||
        booking.slot?.endTime ||
        booking.slot?.end_time ||
        booking.slot?.endTimeOnly ||
        booking.endTime ||
        booking.end_time;

    const bookingTimeSource = booking.bookingTime || booking.booking_time;
    const slotInfo = formatDateTime(slotTimeSource, slotEndTimeSource);
    const bookingInfo = formatDateTime(bookingTimeSource);

    const hasSlot = slotInfo.time !== '---';
    const displayDate = hasSlot ? slotInfo.date : bookingInfo.date;
    const displayTime = hasSlot ? slotInfo.time : 'Slot Pending';
    const isPending = !hasSlot;

    const chargerType = booking.chargerType || booking.charger_type || booking.charger?.chargerType || 'Fast';
    const connector = booking.connectorType || booking.connector_type || booking.charger?.connectorType || 'CCS 2';
    const power = booking.power || booking.maxPower || booking.charger?.maxPower || '120';
    const currentType = (chargerType.toString().toUpperCase().includes('AC') || connector.includes('Type 2')) ? 'AC' : 'DC';
    const status = (booking.status || '').toUpperCase();
    const expired = isBookingExpired(booking);
    const displayStatus = expired && (status === 'BOOKED' || status === 'CONFIRMED' || status === 'ACTIVE')
        ? 'EXPIRED'
        : (booking.status || 'Unknown');

    const isGreenStatus = !expired && (status === 'BOOKED' || status === 'CONFIRMED' || status === 'ACTIVE');
    const isRedStatus = status === 'CANCELLED' || status === 'REJECTED';

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.cardBg }]}
            activeOpacity={activeTab === 'Active' ? 0.7 : 1}
            onPress={() => onPress(booking)}
        >
            <View style={styles.cardHeader}>
                <Text style={[styles.stationName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {booking.stationName || booking.station_name || 'Unknown Station'}
                </Text>
                <View style={[
                    styles.statusPill,
                    {
                        backgroundColor: isGreenStatus
                            ? 'rgba(0, 176, 116, 0.1)'
                            : (isRedStatus
                                ? 'rgba(239, 83, 80, 0.1)'
                                : 'rgba(90, 107, 124, 0.1)')
                    }
                ]}>
                    <Text style={[
                        styles.statusText,
                        {
                            color: isGreenStatus
                                ? '#00B074'
                                : (isRedStatus
                                    ? '#EF5350'
                                    : theme.textSecondary)
                        }
                    ]}>{displayStatus}</Text>
                </View>
            </View>

            <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                    <Bolt size={14} color={theme.textSecondary} />
                    <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                        {connector} • {currentType} ({power}kW)
                    </Text>
                </View>
            </View>

            <View style={[styles.timeRow, { backgroundColor: theme.white }]}>
                <View style={styles.timeBlock}>
                    <Calendar size={15} color={isPending ? theme.textSecondary : '#00B074'} />
                    <Text style={[styles.timeText, { color: theme.textPrimary }, isPending && { color: theme.textSecondary }]}>{displayDate}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                <View style={styles.timeBlock}>
                    <Clock size={15} color={isPending ? '#FFA726' : '#00B074'} />
                    <Text style={[styles.timeText, { color: theme.textPrimary }, isPending && { color: '#FFA726', fontStyle: 'italic' }]}>{displayTime}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

export default function MyBookingsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const { showAlert } = useAlert();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('Active'); 
    const [cancellingId, setCancellingId] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const [isGuest, setIsGuest] = useState(false);
    const [loginPromptVisible, setLoginPromptVisible] = useState(false);

    useEffect(() => {
        const checkGuest = async () => {
            const guest = await authService.isGuestMode();
            setIsGuest(guest);
            if (guest) {
                setLoginPromptVisible(true);
            } else {
                fetchBookings();
            }
        };
        checkGuest();
    }, []);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const data = await slotBookingApi.getMyBookings();
            const bookingsList = data || [];

            const chargersToFetch = [...new Set(bookingsList
                .filter(b => !b.slotStartTime && !b.slot?.startTime && b.slotId && b.chargerId)
                .map(b => b.chargerId)
            )];

            const chargerSlotsMap = {};
            await Promise.all(chargersToFetch.map(async (cid) => {
                try {
                    const slots = await slotsApi.getSlotsByCharger(cid);
                    chargerSlotsMap[cid] = Array.isArray(slots) ? slots : [];
                } catch (e) {
                    console.warn(`Failed to fetch slots for charger ${cid}:`, e.message);
                }
            }));

            const enrichedBookings = bookingsList.map(booking => {
                let slotStartTime = booking.slotStartTime || booking.slot?.startTime || booking.slot?.startTimeOnly || booking.startTime;
                let slotEndTime = booking.slotEndTime || booking.slot?.endTime || booking.slot?.endTimeOnly || booking.endTime;

                if ((!slotStartTime || !slotEndTime) && booking.slotId && booking.chargerId && chargerSlotsMap[booking.chargerId]) {
                    const matchedSlot = chargerSlotsMap[booking.chargerId].find(s => String(s.id) === String(booking.slotId));
                    if (matchedSlot) {
                        slotStartTime = matchedSlot.startTime || matchedSlot.start_time || matchedSlot.startTimeOnly;
                        slotEndTime = matchedSlot.endTime || matchedSlot.end_time || matchedSlot.endTimeOnly;
                    }
                }
                return {
                    ...booking,
                    slotStartTime,
                    slotEndTime
                };
            });

            setBookings(enrichedBookings);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchBookings();
    }, []);

    const handleBookingPress = useCallback((booking) => {
        if (activeTab !== 'Active') return;
        setSelectedBooking(booking);
        setIsModalVisible(true);
    }, [activeTab]);

    const closeModal = useCallback(() => {
        setIsModalVisible(false);
        setSelectedBooking(null);
    }, []);

    const handleStartNow = () => {
        if (!selectedBooking) return;

        const booking = selectedBooking;
        const chargerType = booking.chargerType || booking.charger_type || booking.charger?.chargerType || 'Fast';
        const connector = booking.connectorType || booking.connector_type || booking.charger?.connectorType || 'CCS 2';
        const power = booking.power || booking.maxPower || booking.charger?.maxPower || '120';
        const typeStr = (chargerType.toString().toUpperCase().includes('AC') || connector.includes('Type 2')) ? 'AC' : 'DC';
        const fallbackConnector = typeStr === 'AC' ? 'Type 2' : 'CCS 2';

        closeModal();

        navigation.navigate('Config', {
            stationId: booking.stationId,
            stationName: booking.stationName,
            chargerId: booking.chargerId,
            boxId: booking.boxId || booking.ocppId || booking.ocpp_id || booking.charger?.ocppId, 
            chargerType: chargerType,
            maxPower: power,
            connectorType: connector || fallbackConnector,
            status: 'Available',
            bookingId: booking.id,
            platformFeePerKwh: booking.platformFeePerKwh || booking.charger?.platformFeePerKwh
        });
    };

    const handleCancel = async (bookingId) => {
        closeModal();
        showAlert(
            "Cancel Booking",
            "Are you sure you want to cancel this slot booking?",
            [
                { text: "No", style: "cancel" },
                { 
                    text: "Yes, Cancel", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setCancellingId(bookingId);
                            setLoading(true);
                            await slotBookingApi.cancelBooking(bookingId);
                            showAlert("Success", "Booking cancelled successfully!");
                            fetchBookings();
                        } catch (err) {
                            showAlert("Cancellation Failed", err.userMessage || "Failed to cancel booking. Please try again.");
                        } finally {
                            setCancellingId(null);
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            const expired = isBookingExpired(b);
            return activeTab === 'Active' ? !expired : expired;
        }).sort((a, b) => b.id - a.id);
    }, [bookings, activeTab]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.cardBg }]} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>My Bookings</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={[styles.tabContainer, { borderBottomColor: theme.divider }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Active' && [styles.activeTab, { borderBottomColor: theme.textPrimary }]]}
                    onPress={() => setActiveTab('Active')}
                >
                    <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'Active' && [styles.activeTabText, { color: theme.textPrimary }]]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'History' && [styles.activeTab, { borderBottomColor: theme.textPrimary }]]}
                    onPress={() => setActiveTab('History')}
                >
                    <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'History' && [styles.activeTabText, { color: theme.textPrimary }]]}>History</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#00B074" />
                </View>
            ) : (
                <FlatList
                    data={filteredBookings}
                    renderItem={({ item }) => <BookingCard booking={item} onPress={handleBookingPress} activeTab={activeTab} />}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00B074" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No bookings found</Text>
                        </View>
                    }
                />
            )}

            {/* Details Modal */}
            <Modal
                transparent={true}
                visible={isModalVisible}
                animationType="fade"
                onRequestClose={closeModal}
            >
                <View style={[styles.modalOverlay, { backgroundColor: theme.overlayBg }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        {selectedBooking && (() => {
                            const slotTimeSource = selectedBooking.slotStartTime || selectedBooking.slot?.startTime || selectedBooking.startTime;
                            const slotEndTimeSource = selectedBooking.slotEndTime || selectedBooking.slot?.endTime || selectedBooking.endTime;
                            const slotInfo = formatDateTime(slotTimeSource, slotEndTimeSource);
                            const chargerType = selectedBooking.chargerType || 'Fast';
                            const connector = selectedBooking.connectorType || 'CCS 2';
                            const power = selectedBooking.power || '120';
                            const status = (selectedBooking.status || 'unknown').toUpperCase();

                            return (
                                <>
                                    <View style={styles.modalHeader}>
                                        <TouchableOpacity onPress={closeModal} style={[styles.closeBtn, { backgroundColor: theme.white }]}>
                                            <X size={20} color={theme.textPrimary} />
                                        </TouchableOpacity>
                                        <Text style={[styles.modalTitleText, { color: theme.textPrimary }]}>Booking Details</Text>
                                        <View style={{ width: 24 }} />
                                    </View>

                                    <View style={styles.modalBody}>
                                        <Text style={[styles.modalStationName, { color: theme.textPrimary }]}>{selectedBooking.stationName || 'Unknown Station'}</Text>
                                        <View style={[styles.modalTimeContainer, { backgroundColor: theme.white }]}>
                                            <View style={styles.modalTimeBlock}>
                                                <Calendar size={16} color="#00B074" />
                                                <Text style={[styles.modalTimeText, { color: theme.textPrimary }]}>{slotInfo.date}</Text>
                                            </View>
                                            <View style={styles.modalTimeBlock}>
                                                <Clock size={16} color="#00B074" />
                                                <Text style={[styles.modalTimeText, { color: theme.textPrimary }]}>{slotInfo.time}</Text>
                                            </View>
                                        </View>

                                        <View style={[styles.modalInfoRow, { borderBottomColor: theme.divider }]}><Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Booking ID</Text><Text style={[styles.modalValue, { color: theme.textPrimary }]}>#{selectedBooking.id}</Text></View>
                                        <View style={[styles.modalInfoRow, { borderBottomColor: theme.divider }]}><Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Charger</Text><Text style={[styles.modalValue, { color: theme.textPrimary }]}>{connector} ({power}kW)</Text></View>
                                        <View style={[styles.modalInfoRow, { borderBottomColor: theme.divider }]}>
                                            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Status</Text>
                                            <Text style={[styles.modalValue, { color: status === 'BOOKED' || status === 'CONFIRMED' ? '#00B074' : '#EF5350', fontWeight: '900' }]}>{status}</Text>
                                        </View>

                                        <TouchableOpacity style={[styles.startBtn, { backgroundColor: theme.white }]} onPress={handleStartNow}>
                                            <Play size={16} color={theme.textPrimary} fill={theme.textPrimary} style={{ marginRight: 6 }} />
                                            <Text style={[styles.startBtnText, { color: theme.textPrimary }]}>Start Now</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.modalCancelBtn} onPress={() => handleCancel(selectedBooking.id)}>
                                            <Text style={styles.modalCancelText}>Cancel Booking</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                </View>
            </Modal>

            {/* Login Required Dialog */}
            <LoginRequiredDialog
                visible={loginPromptVisible}
                contextMessage="Sign in to view your bookings"
                onLoginPress={() => {
                    setLoginPromptVisible(false);
                    navigation.replace('Login', {
                        returnRoute: 'MyBookings'
                    });
                }}
                onClose={() => {
                    setLoginPromptVisible(false);
                    navigation.goBack();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, marginTop: 10 },
    backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', flex: 1 },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, marginBottom: 10 },
    tab: { marginRight: 25, paddingVertical: 12 },
    activeTab: { borderBottomWidth: 2 },
    tabText: { fontSize: 16, fontWeight: '600' },
    activeTabText: { fontWeight: '900' },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20, paddingBottom: 50 },
    card: { borderRadius: 24, padding: 16, marginBottom: 15 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    stationName: { fontSize: 16, fontWeight: '900', flex: 1, marginRight: 10 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
    detailsRow: { flexDirection: 'row', marginBottom: 12 },
    detailItem: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
    detailText: { fontSize: 13, marginLeft: 6, fontWeight: '600' },
    timeRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16 },
    timeBlock: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
    divider: { width: 1, height: 16, marginHorizontal: 10 },
    timeText: { fontSize: 13, fontWeight: '800', marginLeft: 8 },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 14, fontStyle: 'italic' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', borderRadius: 28, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    modalTitleText: { fontSize: 18, fontWeight: '900' },
    modalBody: { alignItems: 'center' },
    modalStationName: { fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
    modalTimeContainer: { flexDirection: 'row', borderRadius: 16, paddingVertical: 14, width: '100%', justifyContent: 'space-around', marginBottom: 20 },
    modalTimeBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    modalTimeText: { fontSize: 14, fontWeight: '800' },
    modalInfoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12, borderBottomWidth: 1, paddingBottom: 10 },
    modalLabel: { fontSize: 13, fontWeight: '600' },
    modalValue: { fontSize: 13, fontWeight: '800' },
    startBtn: { flexDirection: 'row', width: '100%', paddingVertical: 16, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 12 },
    startBtnText: { fontSize: 15, fontWeight: '900' },
    modalCancelBtn: { paddingVertical: 12, width: '100%', alignItems: 'center' },
    modalCancelText: { color: '#EF5350', fontSize: 14, fontWeight: '800' }
});
