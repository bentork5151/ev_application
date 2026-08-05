import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, RefreshControl, Image, Modal, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, AlertCircle, Info, Plus, Check } from 'lucide-react-native';
import { supportApi } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { authService } from '../services/auth';
import LoginRequiredDialog from '../components/LoginRequiredDialog';
import { useTheme } from '../context/ThemeContext';

const getStatusTheme = (status) => {
    const s = status?.toLowerCase();
    if (s === 'pending' || s === 'request_created') {
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

const getGeneralTimelineStep = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
        case 'pending':
            return 0;
        case 'approved':
            return 1;
        case 'in_progress':
        case 'inprogress':
        case 'assigned':
            return 2;
        case 'resolved':
        case 'completed':
        case 'closed':
            return 3;
        default:
            return 0;
    }
};

export default function RequestStatusScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const { showAlert } = useAlert();
    const [requests, setRequests] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loginPromptVisible, setLoginPromptVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [activeFilter, setActiveFilter] = useState(null); // 'PENDING' | 'APPROVED' | 'COMPLETED' | null

    const loadRequests = useCallback(async (showLoadingIndicator = true) => {
        if (showLoadingIndicator) {
            setIsFetching(true);
        }
        try {
            const myRequests = await supportApi.getMyRequests();
            setRequests(myRequests || []);
        } catch (error) {
            console.error("Failed to load requests:", error);
            showAlert("Error", "Failed to fetch status logs: " + (error.userMessage || error.message));
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
                loadRequests();
            }
        };
        checkGuest();
    }, [loadRequests]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadRequests(false);
    }, [loadRequests]);

    // Calculate dynamic counts
    const pendingCount = requests.filter(req => getGeneralTimelineStep(req.status) === 0).length;
    const approvedCount = requests.filter(req => {
        const step = getGeneralTimelineStep(req.status);
        return step === 1 || step === 2;
    }).length;
    const completedCount = requests.filter(req => getGeneralTimelineStep(req.status) === 3).length;

    // Filter requests
    const filteredRequests = requests.filter(req => {
        if (!activeFilter) return true;
        const step = getGeneralTimelineStep(req.status);
        if (activeFilter === 'PENDING') return step === 0;
        if (activeFilter === 'APPROVED') return step === 1 || step === 2;
        if (activeFilter === 'COMPLETED') return step === 3;
        return true;
    });

    const handleFilterPress = (filterType) => {
        if (activeFilter === filterType) {
            setActiveFilter(null);
        } else {
            setActiveFilter(filterType);
        }
    };

    const renderGeneralStepper = (status) => {
        const currentStep = getGeneralTimelineStep(status);
        const steps = [
            { label: 'Pending' },
            { label: 'Approved' },
            { label: 'In Progress' },
            { label: 'Completed' }
        ];

        // Is the ticket currently pending or is it approved/in progress/completed?
        const isPendingTheme = currentStep === 0;
        const activeColor = isPendingTheme ? '#FFB300' : '#00B074';

        return (
            <View style={styles.stepperContainer}>
                {/* Connecting Lines */}
                <View style={styles.backgroundLineContainer}>
                    {/* Dark background line for the whole bar */}
                    <View style={[styles.backgroundLinePending, { backgroundColor: theme.divider }]} />
                    
                    {/* Active/Completed green progress lines */}
                    {steps.slice(0, -1).map((_, index) => {
                        const isLineCompleted = index < currentStep;
                        if (!isLineCompleted) return null;
                        
                        // Line segment positions: 0 to 1, 1 to 2, 2 to 3
                        const leftPercent = index * 33.33;
                        const widthPercent = 33.33;

                        return (
                            <View 
                                key={index} 
                                style={[
                                    styles.backgroundLineCompleted, 
                                    { left: `${leftPercent}%`, width: `${widthPercent}%`, backgroundColor: '#00B074' }
                                ]} 
                            />
                        );
                    })}
                </View>

                {/* Step Nodes */}
                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    const isActive = index <= currentStep;

                    return (
                        <View key={index} style={styles.stepNode}>
                            <View style={[
                                styles.stepDot,
                                { backgroundColor: theme.white, borderColor: theme.divider },
                                isCompleted && styles.stepDotCompleted,
                                isCurrent && { borderColor: activeColor },
                                !isActive && [styles.stepDotPending, { backgroundColor: theme.white, borderColor: theme.divider }]
                            ]}>
                                {isCompleted ? (
                                    <Check size={12} color="#FFFFFF" strokeWidth={4} />
                                ) : isCurrent ? (
                                    <View style={[
                                        styles.stepDotInner,
                                        { backgroundColor: activeColor }
                                    ]} />
                                ) : (
                                    <View style={[styles.stepDotInnerPending, { backgroundColor: theme.divider }]} />
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
            "Support Info",
            "This tracker monitors your submitted general support tickets."
        );
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
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Support Status</Text>
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
                {/* Summary / Filter Card */}
                <View style={[styles.summaryCard, { backgroundColor: theme.cardBg }]}>
                    <Text style={[styles.summarySubtitle, { color: theme.textSecondary }]}>Track all your support requests here</Text>
                    <View style={styles.chipsRow}>
                        {/* PENDING Chip */}
                        <TouchableOpacity
                            style={[
                                styles.chip,
                                { borderColor: '#FFB300' },
                                activeFilter === 'PENDING' ? { backgroundColor: '#FFB300' } : [styles.chipInactive, { backgroundColor: theme.white, borderColor: theme.divider }]
                            ]}
                            onPress={() => handleFilterPress('PENDING')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.chipDot, { backgroundColor: activeFilter === 'PENDING' ? '#000000' : '#FFB300' }]} />
                            <Text style={[styles.chipText, { color: activeFilter === 'PENDING' ? '#000000' : '#FFB300' }]}>
                                PENDING {pendingCount}
                            </Text>
                        </TouchableOpacity>

                        {/* Approved Chip */}
                        <TouchableOpacity
                            style={[
                                styles.chip,
                                { borderColor: '#00B074' },
                                activeFilter === 'APPROVED' ? { backgroundColor: '#00B074' } : [styles.chipInactive, { backgroundColor: theme.white, borderColor: theme.divider }]
                            ]}
                            onPress={() => handleFilterPress('APPROVED')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.chipDot, { backgroundColor: activeFilter === 'APPROVED' ? '#FFFFFF' : '#00B074' }]} />
                            <Text style={[styles.chipText, { color: activeFilter === 'APPROVED' ? '#FFFFFF' : '#00B074' }]}>
                                Approved {approvedCount}
                            </Text>
                        </TouchableOpacity>

                        {/* Completed Chip */}
                        <TouchableOpacity
                            style={[
                                styles.chip,
                                { borderColor: '#00B074' },
                                activeFilter === 'COMPLETED' ? { backgroundColor: '#00B074' } : [styles.chipInactive, { backgroundColor: theme.white, borderColor: theme.divider }]
                            ]}
                            onPress={() => handleFilterPress('COMPLETED')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.chipDot, { backgroundColor: activeFilter === 'COMPLETED' ? '#FFFFFF' : '#00B074' }]} />
                            <Text style={[styles.chipText, { color: activeFilter === 'COMPLETED' ? '#FFFFFF' : '#00B074' }]}>
                                Completed {completedCount}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {isFetching && !refreshing && (
                    <ActivityIndicator size="small" color={'#00B074'} style={{ marginBottom: 16 }} />
                )}

                {filteredRequests.length === 0 ? (
                    <View style={[styles.card, styles.emptyContainer, { backgroundColor: theme.cardBg }]}>
                        {isFetching ? (
                            <ActivityIndicator size="large" color={'#00B074'} />
                        ) : (
                            <>
                                <AlertCircle size={40} color={theme.textSecondary} style={{ marginBottom: 12 }} />
                                <Text style={[styles.emptyTextTitle, { color: theme.textPrimary }]}>No Support Tickets</Text>
                                <Text style={[styles.emptyTextSub, { color: theme.textSecondary }]}>Your submitted tickets will appear here.</Text>
                            </>
                        )}
                    </View>
                ) : (
                    filteredRequests.map((req) => (
                        <View key={req.id} style={[styles.requestCard, { backgroundColor: theme.cardBg }]}>
                            <View style={styles.reqHeader}>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                    <Text style={[styles.reqProduct, { color: theme.textPrimary }]}>{req.product}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                        <Text style={[styles.reqId, { color: theme.textSecondary }]}>Ticket ID: #{req.id}</Text>
                                        <Text style={{ color: theme.textSecondary, marginHorizontal: 6, fontSize: 12 }}>•</Text>
                                        <Text style={[styles.reqId, { color: theme.textSecondary }]}>
                                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: theme.white }, getStatusTheme(req.status).badgeStyle]}>
                                    <Text style={[
                                        styles.statusBadgeText,
                                        { color: getStatusTheme(req.status).textColor }
                                    ]}>
                                        {req.status?.toUpperCase().replace('_', ' ')}
                                    </Text>
                                </View>
                            </View>

                            <Text style={[styles.reqDesc, { color: theme.textPrimary }]}>{req.issueDescription}</Text>

                            {req.attachmentUrl ? (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => setSelectedImage(req.attachmentUrl)}
                                >
                                    <Image
                                        source={{ uri: req.attachmentUrl }}
                                        style={[styles.attachmentPreview, { backgroundColor: theme.white }]}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            ) : null}

                            <Text style={[styles.activityTitle, { color: theme.textSecondary }]}>Activity Tracker</Text>
                            {renderGeneralStepper(req.status)}
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                style={[styles.fabCapsule, { backgroundColor: theme.white, bottom: Math.max(insets.bottom + 28, 80) }]}
                onPress={() => navigation.navigate('RaiseRequest')}
                activeOpacity={0.8}
            >
                <Plus size={20} color={theme.textPrimary} strokeWidth={3} />
                <Text style={[styles.fabText, { color: theme.textPrimary }]}>New Ticket</Text>
            </TouchableOpacity>

            {/* Login Required Dialog */}
            <LoginRequiredDialog
                visible={loginPromptVisible}
                contextMessage="Sign in to view your support requests status"
                onLoginPress={() => {
                    setLoginPromptVisible(false);
                    navigation.replace('Login', {
                        returnRoute: 'RequestStatus'
                    });
                }}
                onClose={() => {
                    setLoginPromptVisible(false);
                    navigation.goBack();
                }}
            />

            {/* Full-screen Image Viewer Modal */}
            <Modal
                visible={!!selectedImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity 
                        style={styles.modalCloseArea} 
                        activeOpacity={1} 
                        onPress={() => setSelectedImage(null)}
                    >
                        {selectedImage && (
                            <Image 
                                source={{ uri: selectedImage }} 
                                style={styles.fullScreenImage} 
                                resizeMode="contain"
                            />
                        )}
                        <TouchableOpacity 
                            style={styles.closeButton} 
                            onPress={() => setSelectedImage(null)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </View>
            </Modal>
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
        paddingTop: 8,
        paddingBottom: 100, 
    },
    summaryCard: {
        borderRadius: 28,
        paddingVertical: 20,
        paddingHorizontal: 18,
        marginBottom: 16,
    },
    summarySubtitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
    },
    chipsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginRight: 10,
    },
    chipInactive: {
    },
    chipDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '800',
    },
    card: {
        borderRadius: 28,
        padding: 16,
        marginBottom: 24,
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
        borderWidth: 0,
    },
    reqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    reqProduct: {
        fontSize: 16,
        fontWeight: '900',
    },
    reqId: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
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
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 20,
        marginBottom: 20,
    },
    activityTitle: {
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 16,
        marginTop: 4,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        marginBottom: 8,
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
    stepDotInner: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    stepDotInnerPending: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    backgroundLineContainer: {
        position: 'absolute',
        top: 10,
        left: '12.5%',
        right: '12.5%',
        height: 2,
        flexDirection: 'row',
    },
    backgroundLinePending: {
        width: '100%',
        position: 'absolute',
        height: '100%',
    },
    backgroundLineCompleted: {
        position: 'absolute',
        height: '100%',
    },
    stepLabel: {
        fontSize: 9,
        fontWeight: '900',
        textAlign: 'center',
        paddingHorizontal: 1,
    },
    stepLabelActive: {
    },
    stepLabelPending: {
    },
    fabCapsule: {
        position: 'absolute',
        bottom: 80,
        right: 24,
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 22,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        zIndex: 999,
    },
    fabText: {
        fontSize: 15,
        fontWeight: '900',
        marginLeft: 6,
    },
    attachmentPreview: {
        width: '100%',
        height: 160,
        borderRadius: 16,
        marginBottom: 16,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseArea: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: '90%',
        height: '80%',
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
