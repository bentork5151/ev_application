import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, RefreshControl, Clipboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ClipboardList, CheckCircle2, Info, ShieldAlert, Barcode, Calendar, Copy, Plus } from 'lucide-react-native';
import { warrantyClaimApi } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { authService } from '../services/auth';
import LoginRequiredDialog from '../components/LoginRequiredDialog';
import { useTheme } from '../context/ThemeContext';

const getStatusTheme = (status) => {
    const s = status?.toLowerCase();
    if (s === 'pending' || s === 'in_progress' || s === 'request_created') {
        return {
            badgeStyle: styles.statusPending,
            textColor: '#FFB300'
        };
    } else if (s === 'rejected' || s === 'closed') {
        return {
            badgeStyle: styles.statusErrorBadge,
            textColor: '#EF5350'
        };
    } else {
        return {
            badgeStyle: styles.statusResolved,
            textColor: '#00B074'
        };
    }
};

export default function BatteryWarrantyStatusScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const { showAlert } = useAlert();
    const [claims, setClaims] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loginPromptVisible, setLoginPromptVisible] = useState(false);
    const [confirmingId, setConfirmingId] = useState(null);
    const [shippedClaims, setShippedClaims] = useState({});

    const loadShippedStatus = async (loadedClaims) => {
        try {
            const shippedMap = {};
            for (const claim of loadedClaims) {
                if (claim.status?.toLowerCase() === 'approved') {
                    const val = await AsyncStorage.getItem(`@claim_sent_${claim.id}`);
                    if (val === 'true') {
                        shippedMap[claim.id] = true;
                    }
                }
            }
            setShippedClaims(shippedMap);
        } catch (err) {
            console.error("Failed to load shipped status from storage:", err);
        }
    };

    const loadClaims = useCallback(async (showLoadingIndicator = true) => {
        if (showLoadingIndicator) {
            setIsFetching(true);
        }
        try {
            const myClaims = await warrantyClaimApi.getMyClaims();
            setClaims(myClaims || []);
            if (myClaims && myClaims.length > 0) {
                loadShippedStatus(myClaims);
            }
        } catch (error) {
            console.error("Failed to load warranty claims:", error);
            showAlert("Error", "Failed to fetch warranty claims: " + (error.userMessage || error.message));
        } finally {
            setIsFetching(false);
            setRefreshing(false);
        }
    }, [showAlert]);

    useEffect(() => {
        const checkGuest = async () => {
            const guest = await authService.isGuestMode();
            if (guest) {
                setLoginPromptVisible(true);
            } else {
                loadClaims();
            }
        };
        checkGuest();
    }, [loadClaims]);

    const handleMarkAsSent = async (claimId) => {
        try {
            await AsyncStorage.setItem(`@claim_sent_${claimId}`, 'true');
            setShippedClaims(prev => ({ ...prev, [claimId]: true }));
            showAlert("Battery Shipped", "You've successfully marked this battery as shipped! The timeline will update to 'In Service' once received at our center.");
        } catch (error) {
            console.error("Failed to save shipment status:", error);
            showAlert("Error", "Failed to register shipping confirmation.");
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadClaims(false);
    }, [loadClaims]);

    const handleConfirmReceipt = async (claimId) => {
        setConfirmingId(claimId);
        try {
            await warrantyClaimApi.confirmReceived(claimId);
            showAlert("Receipt Confirmed", "You have successfully confirmed the receipt of your battery!");
            loadClaims(false);
        } catch (error) {
            console.error("Confirmation failed:", error);
            showAlert("Error", error.userMessage || error.message || "Failed to confirm receipt.");
        } finally {
            setConfirmingId(null);
        }
    };

    const getBatteryTimelineStep = (status) => {
        const statusLower = status?.toLowerCase();
        switch (statusLower) {
            case 'request_created':
                return 0;
            case 'approved':
                return 1;
            case 'product_received':
            case 'processing':
                return 2;
            case 'completed':
            case 'dispatched':
                return 3;
            case 'delivered':
            case 'user_confirmed':
            case 'closed':
                return 4;
            default:
                return 0;
        }
    };

    const renderBatteryStepper = (status) => {
        const currentStep = getBatteryTimelineStep(status);
        const steps = [
            { label: 'Submitted' },
            { label: 'Approved' },
            { label: 'In Service' },
            { label: 'Dispatched' },
            { label: 'Delivered' }
        ];

        const progressPercent = currentStep === 0 ? 0 : (currentStep / (steps.length - 1)) * 100;

        return (
            <View style={styles.stepperContainer}>
                <View style={[styles.backgroundLineContainer, { left: '10%', right: '10%' }]}>
                    <View style={[styles.backgroundLine, styles.backgroundLinePending, { backgroundColor: theme.divider }]} />
                    <View style={[
                        styles.backgroundLine, 
                        styles.backgroundLineCompleted, 
                        { width: `${progressPercent}%`, backgroundColor: '#00B074' }
                    ]} />
                </View>

                {steps.map((step, index) => {
                    const isCompleted = index < currentStep || (currentStep === 4 && index === 4);
                    const isCurrent = index === currentStep && currentStep !== 4;
                    const isActive = index <= currentStep;

                    return (
                        <View key={index} style={styles.stepNode}>
                            <View style={[
                                styles.stepDot,
                                { backgroundColor: theme.white },
                                isCompleted && styles.stepDotCompleted,
                                isCurrent && styles.stepDotCurrent,
                                !isActive && [styles.stepDotPending, { backgroundColor: theme.white, borderColor: theme.divider }]
                            ]}>
                                {isCompleted ? (
                                    <CheckCircle2 size={12} color="#FFFFFF" />
                                ) : (
                                    <View style={[
                                        styles.stepDotInner,
                                        { backgroundColor: theme.divider },
                                        isCurrent && styles.stepDotInnerCurrent
                                    ]} />
                                )}
                            </View>
                            <Text 
                                style={[
                                    styles.stepLabel,
                                    isActive ? [styles.stepLabelActive, { color: theme.textPrimary }] : [styles.stepLabelPending, { color: theme.textSecondary }]
                                ]}
                            >
                                {step.label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        );
    };

    const handleShowInfo = () => {
        showAlert(
            "Warranty Info",
            "This screen displays active battery warranty claims, courier tracking, and service timelines. Use the (+) button to register or file a new warranty claim."
        );
    };

    const handleCopyAddress = (address) => {
        Clipboard.setString(address);
        showAlert("Copied", "Address copied to clipboard!");
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={[styles.backBtn, { backgroundColor: theme.cardBg }]} 
                    onPress={() => navigation.goBack()} 
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Your Warranty Status</Text>
                <TouchableOpacity 
                    style={[styles.backBtn, { backgroundColor: theme.cardBg }]} 
                    onPress={handleShowInfo} 
                    activeOpacity={0.7}
                >
                    <Info size={20} color={theme.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#00B074']}
                        tintColor={'#00B074'}
                        progressBackgroundColor={theme.white}
                    />
                }
            >
                {isFetching && !refreshing && (
                    <ActivityIndicator size="small" color={'#00B074'} style={{ marginBottom: 16 }} />
                )}

                {claims.length === 0 ? (
                    <View style={[styles.card, styles.emptyContainer, { backgroundColor: theme.cardBg }]}>
                        {isFetching ? (
                            <ActivityIndicator size="large" color={'#00B074'} />
                        ) : (
                            <>
                                <ClipboardList size={40} color={theme.textSecondary} style={{ marginBottom: 12 }} />
                                <Text style={[styles.emptyTextTitle, { color: theme.textPrimary }]}>No Claims Found</Text>
                                <Text style={[styles.emptyTextSub, { color: theme.textSecondary }]}>Your submitted warranty claims will appear here.</Text>
                            </>
                        )}
                    </View>
                ) : (
                    claims.map((claim) => {
                        const isRejected = claim.status?.toLowerCase() === 'rejected';

                        return (
                            <View key={claim.id} style={[styles.requestCard, { backgroundColor: theme.cardBg }]}>
                                <View style={styles.reqHeader}>
                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                        <Text style={[styles.reqProduct, { color: theme.textPrimary }]}>{claim.productDetails}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                            <Text style={[styles.reqId, { color: theme.textSecondary }]}>Claim ID: #{claim.id}</Text>
                                            <Text style={{ color: theme.textSecondary, marginHorizontal: 6, fontSize: 12 }}>•</Text>
                                            <Text style={[styles.reqId, { color: theme.textSecondary }]}>
                                                {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : 'N/A'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: theme.white }, getStatusTheme(claim.status).badgeStyle]}>
                                        <Text style={[
                                            styles.statusBadgeText,
                                            { color: getStatusTheme(claim.status).textColor }
                                        ]}>
                                            {claim.status?.toUpperCase().replace('_', ' ')}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={[styles.reqDesc, { color: theme.textPrimary }]}>{claim.issueDescription}</Text>

                                {/* Battery Metadata block */}
                                <View style={[styles.claimMeta, { backgroundColor: theme.white }]}>
                                    <View style={styles.metaLabelRow}>
                                        <Barcode size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                                        <Text style={[styles.metaLabelText, { color: theme.textSecondary }]}>Invoice: {claim.invoiceNumber}</Text>
                                    </View>
                                    <View style={styles.metaLabelRow}>
                                        <Calendar size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                                        <Text style={[styles.metaLabelText, { color: theme.textSecondary }]}>Customer: {claim.customerName}</Text>
                                    </View>
                                </View>

                                {/* Stepper or Rejection details */}
                                {isRejected ? (
                                    <View style={styles.rejectedBanner}>
                                        <ShieldAlert size={20} color="#EF5350" style={{ marginRight: 8 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.rejectedTitle}>Claim Rejected</Text>
                                            <Text style={[styles.rejectedReason, { color: theme.textSecondary }]}>
                                                Reason: {claim.rejectReason || "Verification failed. Please contact customer support."}
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View>
                                        <Text style={[styles.activityTitle, { color: theme.textSecondary }]}>Service Tracker</Text>
                                        {renderBatteryStepper(claim.status)}

                                        {/* Approved Shipping instruction */}
                                        {claim.status?.toLowerCase() === 'approved' && !shippedClaims[claim.id] && (
                                            <View style={[styles.addressCard, { backgroundColor: theme.white }]}>
                                                <View style={styles.addressHeader}>
                                                    <Text style={[styles.addressTitle, { color: theme.textPrimary }]}>Bentork Service Center Address</Text>
                                                    <TouchableOpacity 
                                                        style={styles.copyIconBtn}
                                                        onPress={() => handleCopyAddress("Bentork Industries LLP, Sector 4, Block B, Plot 12, Industrial Area, Pune, Maharashtra - 411018")}
                                                    >
                                                        <Copy size={14} color={theme.textSecondary} />
                                                    </TouchableOpacity>
                                                </View>
                                                <Text style={[styles.addressText, { color: theme.textSecondary }]}>
                                                    Bentork Industries LLP, Sector 4, Block B, Plot 12, Industrial Area, Pune, Maharashtra - 411018
                                                </Text>
                                                <TouchableOpacity 
                                                    style={[styles.markShippedBtn, { backgroundColor: theme.white, borderColor: theme.divider }]}
                                                    onPress={() => handleMarkAsSent(claim.id)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={[styles.markShippedBtnText, { color: theme.textPrimary }]}>Mark as Sent / Shipped</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        {/* Courier Dispatched Info */}
                                        {claim.status?.toLowerCase() === 'approved' && shippedClaims[claim.id] && (
                                            <View style={styles.shippedBanner}>
                                                <CheckCircle2 size={16} color="#00B074" style={{ marginRight: 8 }} />
                                                <Text style={styles.shippedBannerText}>
                                                    You've marked this battery as shipped.
                                                </Text>
                                            </View>
                                        )}

                                        {/* Courier Dispatched Info */}
                                        {claim.status?.toLowerCase() === 'dispatched' && (
                                            <View style={[styles.dispatchCard, { backgroundColor: theme.white }]}>
                                                <Text style={[styles.dispatchTitle, { color: theme.textPrimary }]}>Dispatch Information</Text>
                                                <Text style={[styles.dispatchText, { color: theme.textSecondary }]}>
                                                    Carrier: <Text style={{ fontWeight: '800', color: theme.textPrimary }}>{claim.courierName || 'DTDC Courier'}</Text>
                                                </Text>
                                                <Text style={[styles.dispatchText, { color: theme.textSecondary }]}>
                                                    Tracking ID: <Text style={{ fontWeight: '800', color: theme.textPrimary }}>{claim.courierTrackingId || 'TRK-109283726'}</Text>
                                                </Text>
                                                <TouchableOpacity 
                                                    style={[styles.confirmReceiptBtn, { backgroundColor: theme.white }]}
                                                    onPress={() => handleConfirmReceipt(claim.id)}
                                                    disabled={confirmingId === claim.id}
                                                    activeOpacity={0.8}
                                                >
                                                    {confirmingId === claim.id ? (
                                                        <ActivityIndicator size="small" color="#00B074" />
                                                    ) : (
                                                        <Text style={[styles.confirmReceiptBtnText, { color: theme.textPrimary }]}>Confirm Receipt</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity 
                style={[styles.fab, { backgroundColor: theme.white, bottom: Math.max(insets.bottom + 28, 80) }]} 
                onPress={() => navigation.navigate('BatteryWarranty')}
                activeOpacity={0.8}
            >
                <Plus size={24} color={theme.textPrimary} />
            </TouchableOpacity>

            {/* Login Required Dialog */}
            <LoginRequiredDialog
                visible={loginPromptVisible}
                contextMessage="Sign in to view your warranty claim"
                onLoginPress={() => {
                    setLoginPromptVisible(false);
                    navigation.replace('Login', {
                        returnRoute: 'BatteryWarrantyStatus'
                    });
                }}
                onClose={() => {
                    setLoginPromptVisible(false);
                    navigation.goBack();
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        marginTop: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        flex: 1,
        textAlign: 'center',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 100,
    },
    card: {
        borderRadius: 28,
        padding: 20,
        marginBottom: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyTextTitle: {
        fontSize: 15,
        fontWeight: '900',
        marginBottom: 4,
    },
    emptyTextSub: {
        fontSize: 12,
        textAlign: 'center',
        fontWeight: '600',
    },
    requestCard: {
        borderRadius: 28,
        paddingVertical: 24,
        paddingHorizontal: 18,
        marginBottom: 16,
    },
    reqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    reqProduct: {
        fontSize: 15,
        fontWeight: '900',
    },
    reqId: {
        fontSize: 12,
        fontWeight: '650',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusErrorBadge: {
    },
    statusPending: {
    },
    statusResolved: {
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '900',
    },
    reqDesc: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 16,
        fontWeight: '650',
    },
    claimMeta: {
        borderRadius: 24,
        padding: 12,
        marginBottom: 16,
        gap: 6,
    },
    metaLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaLabelText: {
        fontSize: 12,
        fontWeight: '600',
    },
    activityTitle: {
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 12,
        marginTop: 4,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        marginBottom: 20,
    },
    stepNode: {
        alignItems: 'center',
        flex: 1,
    },
    stepDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 6,
    },
    stepDotCompleted: {
        backgroundColor: '#00B074',
        borderColor: '#00B074',
    },
    stepDotPending: {
    },
    stepDotCurrent: {
        borderColor: '#FFD740',
    },
    stepDotInner: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    stepDotInnerCurrent: {
        backgroundColor: '#FFD740',
    },
    backgroundLineContainer: {
        position: 'absolute',
        top: 10,
        left: '12.5%',
        right: '12.5%',
        height: 2,
    },
    backgroundLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        height: 2,
    },
    backgroundLinePending: {
    },
    backgroundLineCompleted: {
    },
    stepLabel: {
        fontSize: 8,
        fontWeight: '900',
        textAlign: 'center',
    },
    stepLabelActive: {
    },
    stepLabelPending: {
    },
    rejectedBanner: {
        flexDirection: 'row',
        backgroundColor: 'rgba(239, 83, 80, 0.1)',
        borderRadius: 20,
        padding: 12,
        alignItems: 'center',
    },
    rejectedTitle: {
        color: '#EF5350',
        fontSize: 13,
        fontWeight: '900',
        marginBottom: 2,
    },
    rejectedReason: {
        fontSize: 12,
        fontWeight: '600',
    },
    shippedBanner: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 176, 116, 0.1)',
        borderRadius: 20,
        padding: 12,
        alignItems: 'center',
    },
    shippedBannerText: {
        color: '#00B074',
        fontSize: 12,
        fontWeight: '800',
        flex: 1,
    },
    addressCard: {
        borderRadius: 24,
        padding: 14,
    },
    addressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    addressTitle: {
        fontSize: 13,
        fontWeight: '900',
    },
    copyIconBtn: {
        padding: 4,
    },
    addressText: {
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 12,
        fontWeight: '600',
    },
    markShippedBtn: {
        borderRadius: 20,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    markShippedBtnText: {
        fontSize: 13,
        fontWeight: '900',
    },
    dispatchCard: {
        borderRadius: 24,
        padding: 12,
        marginTop: 12,
    },
    dispatchTitle: {
        fontSize: 13,
        fontWeight: '900',
        marginBottom: 6,
    },
    dispatchText: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    confirmReceiptBtn: {
        borderRadius: 24,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    confirmReceiptBtnText: {
        fontSize: 13,
        fontWeight: '900',
    },
    fab: {
        position: 'absolute',
        bottom: 80,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        zIndex: 999,
    }
});
