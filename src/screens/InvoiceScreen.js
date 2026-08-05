import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Platform, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, ChevronRight } from 'lucide-react-native';
import InAppReview from 'react-native-in-app-review';
import { authService } from '../services/auth';
import { userApi, sessionApi } from '../services/api';
import { safe } from '../utils/pricingUtils';
import statsService from '../services/statsService';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function InvoiceScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const {
        sessionData,
        finalEnergy,
        finalDuration,
        sessionId,
        stationName: paramStationName,
        rate: paramRate,
        chargerType: paramChargerType,
        platformFeePerKwh,
        pstRatePerKw: paramPstRatePerKw,
    } = route.params || {};

    const [session, setSession] = useState(sessionData);
    const [isSyncing, setIsSyncing] = useState(true);
    const [walletBalance, setWalletBalance] = useState(0);

    useEffect(() => {
        console.log('Invoice original sessionData:', sessionData);
    }, [sessionData]);

    // Re-fetch wallet balance on completion
    useEffect(() => {
        const fetchFreshWallet = async () => {
            try {
                const user = await authService.getUser();
                const email = user?.email;
                if (email) {
                    const details = await userApi.getUserDetails(email);
                    if (details && details.walletBalance !== undefined) {
                        setWalletBalance(safe(details.walletBalance));
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch fresh wallet balance in InvoiceScreen:", err);
            }
        };
        fetchFreshWallet();
    }, []);

    // Sync with backend on mount
    useEffect(() => {
        const targetSessionId = sessionId || sessionData?.id || sessionData?.sessionId;
        if (!targetSessionId) {
            console.warn("No sessionId found in InvoiceScreen params, rendering cache immediately.");
            setIsSyncing(false);
            return;
        }

        setIsSyncing(true);

        const pollBackendSession = async () => {
            try {
                console.log("[InvoiceScreen] Polling session details for ID:", targetSessionId);
                const matched = await sessionApi.getSessionDetails(targetSessionId);
                if (matched) {
                    console.log("[InvoiceScreen] Match found in backend session records:", matched);
                    
                    const isPlatformFeePopulated = matched.platformFee !== undefined && matched.platformFee !== null;
                    const isFinalCostPopulated = (matched.finalCost !== undefined && matched.finalCost !== null) || (matched.cost !== undefined && matched.cost !== null);

                    if (isPlatformFeePopulated && isFinalCostPopulated) {
                        setSession(prev => ({
                            ...prev,
                            ...matched,
                        }));
                        setIsSyncing(false);
                        return true; 
                    }
                }
            } catch (err) {
                console.error("[InvoiceScreen] Failed to fetch session records during poll:", err);
            }
            return false;
        };

        let attempts = 0;
        const maxAttempts = 15;
        let intervalId;

        const runPoll = async () => {
            attempts++;
            const stop = await pollBackendSession();
            if (stop || attempts >= maxAttempts) {
                if (intervalId) clearInterval(intervalId);
                setIsSyncing(false);
            }
        };

        pollBackendSession().then(stop => {
            if (!stop) {
                intervalId = setInterval(runPoll, 1000);
            } else {
                setIsSyncing(false);
            }
        });

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [sessionId, sessionData]);

    // Save completed session details to local history
    useEffect(() => {
        if (!isSyncing && session) {
            const energy = safe(finalEnergy || session.energyUsed || session.energyKwh);
            const cost = safe(session.finalCost ?? session.cost ?? route.params?.subtotal ?? 0);
            const id = session.id || session.sessionId || sessionId || route.params?.sessionId;
            
            if (id && energy > 0) {
                statsService.saveSession({
                    id: id,
                    energyDelivered: energy,
                    cost: cost,
                    stationName: session.stationName || route.params?.stationName || "Unknown Station",
                    location: session.location || "Unknown Location",
                    duration: safe(finalDuration || session.duration),
                    rate: safe(session.rate || route.params?.rate || 0),
                    connectorType: session.connectorType || route.params?.chargerType
                }).catch(err => console.warn("Failed to save session to stats history:", err));
            }
        }
    }, [isSyncing, session]);

    const handleDone = async () => {
        const isAvailable = InAppReview.isAvailable();
        if (isAvailable) {
            try {
                await InAppReview.RequestInAppReview();
            } catch (error) {
                console.log("In-App Review Error:", error);
            }
        }
        navigation.navigate('Home');
    };

    // Calculate details dynamically based on API response
    const stationName = session?.stationName || paramStationName || "Unknown Station";

    // Date & Time
    const endTime = session?.endTime || new Date().toISOString();
    const dateObj = new Date(endTime);
    const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Duration formatting
    let durationSeconds = 0;
    if (session?.duration && Number(session.duration) > 0) {
        durationSeconds = Number(session.duration) * 60;
    } else if (session?.durationMin && Number(session.durationMin) > 0) {
        durationSeconds = Number(session.durationMin) * 60;
    } else {
        durationSeconds = safe(finalDuration) * 60;
    }
            
    const hrs = Math.floor(durationSeconds / 3600);
    const mins = Math.floor((durationSeconds % 3600) / 60);
    const durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`;

    // Metrics
    const energy = safe(session?.energyKwh ?? session?.energyUsed ?? session?.energy ?? finalEnergy);
    const rate = safe(session?.rate ?? paramRate ?? 15);
    const displayChargerType = session?.chargerType || paramChargerType || "DC Fast";

    const subtotal = Number(session?.finalCost ?? session?.cost ?? 0);
    const walletDeducted = Math.min(walletBalance, subtotal);

    const paymentMethod = session?.paymentMethod || "Wallet";
    const receiptId = session?.transactionId || session?.sessionId || sessionId || "N/A";

    if (isSyncing) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />
                <ActivityIndicator size="large" color="#00B074" />
                <Text style={[styles.loadingText, { color: theme.textPrimary }]}>Syncing invoice details...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />
            
            <ScrollView 
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]} 
                showsVerticalScrollIndicator={false}
            >
                {/* Brand Logo Header */}
                <Image 
                    source={require('../assets/images/logo.png')} 
                    style={[styles.brandLogo, { tintColor: theme.textPrimary }]} 
                    resizeMode="contain" 
                />

                {/* Stretched Invoice Card */}
                <View style={[styles.invoiceCard, { backgroundColor: theme.cardBg }]}>
                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>INVOICE</Text>

                    {/* Session Details Section */}
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>SESSION DETAILS</Text>
                        
                        <View style={[styles.itemRow, { borderBottomColor: theme.divider }]}>
                            <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Station</Text>
                            <Text style={[styles.itemValue, { color: theme.textPrimary }]}>{stationName}</Text>
                        </View>
                        
                        <View style={[styles.itemRow, { borderBottomColor: theme.divider }]}>
                            <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Date</Text>
                            <Text style={[styles.itemValue, { color: theme.textPrimary }]}>{dateStr}</Text>
                        </View>
                        
                        <View style={[styles.itemRow, { borderBottomColor: theme.divider }]}>
                            <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Time</Text>
                            <Text style={[styles.itemValue, { color: theme.textPrimary }]}>{timeStr}</Text>
                        </View>
                        
                        <View style={[styles.itemRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                            <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Duration</Text>
                            <Text style={[styles.itemValue, { color: theme.textPrimary }]}>{durationStr}</Text>
                        </View>
                    </View>

                    {/* Section Separator */}
                    <View style={[styles.sectionDivider, { backgroundColor: theme.divider }]} />

                    {/* Charging Usage Section */}
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>CHARGING USAGE</Text>
                        
                        <View style={[styles.itemRow, { borderBottomColor: theme.divider }]}>
                            <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Energy Consumed</Text>
                            <Text style={[styles.itemValue, { color: theme.textPrimary }]}>{Number(energy).toFixed(3)} kWh</Text>
                        </View>
                        
                        <View style={[styles.itemRow, { borderBottomColor: theme.divider }]}>
                            <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Charger Type</Text>
                            <Text style={[styles.itemValue, { color: theme.textPrimary }]}>{displayChargerType}</Text>
                        </View>
                        
                        <View style={[styles.itemRow, { borderBottomColor: theme.divider }]}>
                            <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Rate Info</Text>
                            <Text style={[styles.itemValue, { color: theme.textPrimary }]}>₹{Number(rate).toFixed(2)} / kWh</Text>
                        </View>
                        
                        {walletDeducted > 0 && (
                            <View style={[styles.itemRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                                <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Wallet Deduction</Text>
                                <Text style={[styles.itemValue, { color: theme.textPrimary }]}>₹{Number(walletDeducted).toFixed(2)}</Text>
                            </View>
                        )}
                    </View>

                    {/* Total Block */}
                    <View style={[styles.totalRow, { borderTopColor: theme.divider }]}>
                        <Text style={[styles.totalLabel, { color: theme.textPrimary }]}>TOTAL</Text>
                        <Text style={styles.totalValue}>₹{Number(subtotal).toFixed(2)}</Text>
                    </View>

                    {/* Payment Method Block */}
                    <View style={styles.paymentRow}>
                        <Text style={[styles.paymentLabel, { color: theme.textSecondary }]}>Payment Method</Text>
                        <View style={styles.paymentMethodValueRow}>
                            <View style={styles.greenDot} />
                            <Text style={[styles.paymentValue, { color: theme.textPrimary }]}>{paymentMethod}</Text>
                        </View>
                    </View>

                    {/* Receipt Footer info */}
                    <View style={styles.receiptRow}>
                        <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Receipt ID</Text>
                        <Text style={[styles.receiptValue, { color: theme.textSecondary }]}>{receiptId}</Text>
                    </View>
                </View>

                {/* Continue Footer Button */}
                <TouchableOpacity 
                    style={[styles.continueButton, { backgroundColor: theme.white }]} 
                    onPress={handleDone}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.continueButtonText, { color: theme.textPrimary }]}>Continue</Text>
                    <ChevronRight size={16} color={theme.textPrimary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    brandLogo: {
        width: 120,
        height: 35,
        marginTop: 10,
        marginBottom: 10,
    },
    invoiceCard: {
        width: '100%',
        borderRadius: 28,
        padding: 24,
        marginVertical: 20,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 1,
        marginBottom: 20,
    },
    sectionContainer: {
        width: '100%',
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    itemLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    itemValue: {
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'right',
        flex: 1,
        marginLeft: 20,
    },
    sectionDivider: {
        height: 1,
        marginVertical: 16,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    totalLabel: {
        fontSize: 15,
        fontWeight: '900',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '950',
        color: '#00B074',
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
    },
    paymentLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    paymentMethodValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    greenDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00B074',
        marginRight: 6,
    },
    paymentValue: {
        fontSize: 13,
        fontWeight: '800',
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 8,
    },
    receiptLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    receiptValue: {
        fontSize: 12,
        fontFamily: 'monospace',
        fontWeight: '700',
    },
    continueButton: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueButtonText: {
        fontSize: 14,
        fontWeight: '900',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '700',
    },
});
