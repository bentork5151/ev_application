import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, RefreshControl, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, ShieldAlert, Check, Copy, ChevronRight } from 'lucide-react-native';
import { ordersApi } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { useTheme } from '../context/ThemeContext';

const getTimelineStepIndex = (status, productionStatus) => {
    const s = status?.toLowerCase() || '';
    const p = productionStatus?.toLowerCase() || '';
    if (s === 'cancelled') return -1;
    if (s === 'dispatched' || s === 'delivered') {
        return 4;
    }
    if (s === 'scm_complete' || s === 'production_complete' || s === 'completed') {
        return 3;
    }
    if (s === 'in_production' || s === 'in_progress') {
        if (p === 'testing') return 2;
        return 1;
    }
    return 0;
};

const capitalize = (str) => {
    if (!str) return '';
    const trimmed = String(str).trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const formatFullDate = (dateArrayOrStr) => {
    if (!dateArrayOrStr) return null;
    try {
        let dateObj;
        if (Array.isArray(dateArrayOrStr)) {
            const [y, M, d, h, m, s] = dateArrayOrStr;
            dateObj = new Date(y, M - 1, d, h || 0, m || 0, s || 0);
        } else {
            dateObj = new Date(dateArrayOrStr);
        }
        if (!isNaN(dateObj.getTime())) {
            return dateObj.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
                   dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    } catch (e) {
        console.warn("Date parse error:", e);
    }
    return null;
};

export default function OrderDetailScreen({ route, navigation }) {
    const { orderId } = route.params || {};
    const { theme, isDark } = useTheme();
    const { showAlert } = useAlert();
    const [order, setOrder] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const loadOrderDetail = useCallback(async (showLoader = true) => {
        if (!orderId) return;
        if (showLoader) setIsFetching(true);
        try {
            const data = await ordersApi.getOrderDetail(orderId);
            setOrder(data);
        } catch (error) {
            console.error("Failed to load order details:", error);
            showAlert("Error", "Failed to fetch order details: " + (error.userMessage || error.message));
        } finally {
            setIsFetching(false);
            setRefreshing(false);
        }
    }, [orderId, showAlert]);

    useEffect(() => {
        loadOrderDetail();
    }, [loadOrderDetail]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadOrderDetail(false);
    }, [loadOrderDetail]);

    if (isFetching && !refreshing) {
        return (
            <SafeAreaView style={[styles.centered, { backgroundColor: theme.background }]} edges={['top']}>
                <ActivityIndicator size="large" color="#00B074" />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading details...</Text>
            </SafeAreaView>
        );
    }

    if (!order) {
        return (
            <SafeAreaView style={[styles.centered, { backgroundColor: theme.background }]} edges={['top']}>
                <ShieldAlert size={48} color="#EF5350" style={{ marginBottom: 12 }} />
                <Text style={[styles.errorText, { color: theme.textPrimary }]}>Order details not found.</Text>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.white }]} onPress={() => navigation.goBack()}>
                    <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const currentStatus = order.orderStatus || order.status;
    const currentStep = getTimelineStepIndex(currentStatus, order.productionStatus);
    const isCancelled = currentStatus?.toLowerCase() === 'cancelled';
    const statusColor = isCancelled ? '#EF5350' : '#00B074';

    const isStep2Completed = currentStatus?.toLowerCase() === 'in_production' || 
                             currentStatus?.toLowerCase() === 'production_complete' || 
                             currentStatus?.toLowerCase() === 'scm_complete' || 
                             currentStatus?.toLowerCase() === 'dispatched' || 
                             currentStatus?.toLowerCase() === 'delivered';
                             
    const isStep3Completed = (currentStatus?.toLowerCase() === 'in_production' && order.productionStatus?.toLowerCase() === 'testing') ||
                             currentStatus?.toLowerCase() === 'production_complete' || 
                             currentStatus?.toLowerCase() === 'scm_complete' || 
                             currentStatus?.toLowerCase() === 'dispatched' || 
                             currentStatus?.toLowerCase() === 'delivered';

    const isStep4Completed = currentStatus?.toLowerCase() === 'production_complete' || 
                             currentStatus?.toLowerCase() === 'scm_complete' || 
                             currentStatus?.toLowerCase() === 'dispatched' || 
                             currentStatus?.toLowerCase() === 'delivered';

    const isStep5Completed = currentStatus?.toLowerCase() === 'dispatched' || 
                             currentStatus?.toLowerCase() === 'delivered';

    const steps = [
        { label: 'Pending', time: order.createdAt },
        { 
            label: 'In Progress', 
            time: isStep2Completed ? (order.updatedAt || order.createdAt) : null 
        },
        { 
            label: 'Testing', 
            time: isStep3Completed ? (isStep4Completed ? (order.productionCompletedAt || order.updatedAt) : order.updatedAt) : null 
        },
        { 
            label: 'Completed', 
            time: isStep4Completed ? (order.productionCompletedAt || order.completedAt) : null 
        },
        {
            label: 'Dispatched',
            time: isStep5Completed ? order.dispatchedAt : null
        },
        {
            label: 'Delivered',
            time: currentStatus?.toLowerCase() === 'delivered' ? order.updatedAt : null
        }
    ];

    const getDurationText = (createdAt, completedAt, durationHours) => {
        if (!createdAt || !completedAt) return null;
        try {
            let start;
            if (Array.isArray(createdAt)) {
                const [y, M, d, h, m, s] = createdAt;
                start = new Date(y, M - 1, d, h || 0, m || 0, s || 0);
            } else {
                start = new Date(createdAt);
            }

            let end;
            if (Array.isArray(completedAt)) {
                const [y, M, d, h, m, s] = completedAt;
                end = new Date(y, M - 1, d, h || 0, m || 0, s || 0);
            } else {
                end = new Date(completedAt);
            }

            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const diffMs = end - start;
                const diffMins = Math.round(diffMs / 60000);
                if (diffMins < 60) {
                    return `${diffMins} minutes`;
                }
                const hrs = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                return `${hrs} hours${mins > 0 ? ` ${mins} minutes` : ''}`;
            }
        } catch (e) {
            console.warn("Error calculating duration:", e);
        }
        if (durationHours !== null && durationHours !== undefined) {
            return `${durationHours} hours`;
        }
        return null;
    };

    const durationText = getDurationText(order.createdAt, order.dispatchedAt || order.productionCompletedAt || order.completedAt, order.processingDurationHours);
    const titleText = order.productDetails || order.title || 'Untitled Order';

    const handleCopyOrderNumber = () => {
        if (order.orderNumber) {
            Clipboard.setString(order.orderNumber);
        }
    };

    const handleCopyTrackingId = () => {
        if (order.trackingId) {
            Clipboard.setString(order.trackingId);
        }
    };

    const renderOrderDetailsCard = () => {
        const getProductsList = () => {
            if (Array.isArray(order.orderItems) && order.orderItems.length > 0) {
                return order.orderItems.map((prod, idx) => ({
                    id: prod.id || idx,
                    name: prod.productDetails || prod.name || 'EV Product',
                    quantity: prod.quantity || 1
                }));
            }
            if (order.productDetails) {
                return [{
                    id: 'legacy',
                    name: order.productDetails,
                    quantity: order.quantity || 1
                }];
            }
            return [{
                id: 'default',
                name: order.title || 'EV Equipment',
                quantity: order.quantity || 1
            }];
        };

        const products = getProductsList();
        const items = [
            { label: 'Customer', value: order.customerName },
            { label: 'Mobile No.', value: order.mobileNumber ? order.mobileNumber.replace(/.(?=.{4})/g, "X") : 'XXXXXXXXXX' },
            { label: 'Payment Status', value: order.paymentStatus ? capitalize(order.paymentStatus) : 'Paid' },
        ].filter(item => item.value !== undefined && item.value !== null && item.value !== '');

        const displayDate = formatFullDate(order.createdAt) || '---';

        return (
            <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.orderLabel, { color: theme.textSecondary }]}>ORDER DETAILS</Text>
                    {order.orderNumber && (
                        <TouchableOpacity 
                            onPress={handleCopyOrderNumber}
                            style={[styles.orderIdBadge, { backgroundColor: theme.white }]}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.orderIdText, { color: theme.textPrimary }]}>{order.orderNumber}</Text>
                            <Copy size={10} color={theme.textPrimary} style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Multiple Assigned Products List Section */}
                <View style={{ marginVertical: 8, paddingBottom: 8 }}>
                    <Text style={[styles.detailsLabel, { color: theme.textSecondary, marginBottom: 8, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }]}>
                        ASSIGNED PRODUCTS ({products.length})
                    </Text>
                    {products.map((prod) => (
                        <View key={prod.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4, backgroundColor: theme.white, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 }}>
                            <Text style={[styles.titleText, { color: theme.textPrimary, flex: 1, fontSize: 14, fontWeight: '500' }]} numberOfLines={2}>
                                {capitalize(prod.name)}
                            </Text>
                            <View style={{ backgroundColor: theme.cardBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 10 }}>
                                <Text style={{ color: theme.textPrimary, fontWeight: '600', fontSize: 12 }}>
                                    Qty: {prod.quantity}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
                
                <View style={[styles.detailsList, { borderTopColor: theme.divider }]}>
                    {items.map((item, index) => (
                        <View key={index} style={[styles.detailsRow, { borderBottomColor: theme.divider }]}>
                            <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>{item.label}</Text>
                            <Text style={[styles.detailsValue, { color: theme.textPrimary }]}>{String(item.value)}</Text>
                        </View>
                    ))}
                </View>

                {displayDate && (
                    <View style={styles.cardFooter}>
                        <View style={styles.metaItem}>
                            <Clock size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{displayDate}</Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const renderDispatchDetails = () => {
        const trackingId = order.trackingId || '123456789';
        const dispatchDate = formatFullDate(order.dispatchedAt) || '23 Jul 2026';

        return (
            <View style={[styles.dispatchNoteContainer, { backgroundColor: theme.white }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.dispatchNoteText, { color: theme.textSecondary }]}>
                        Tracking ID: <Text style={{ fontWeight: '800', color: theme.textPrimary }}>{trackingId}</Text>
                    </Text>
                    <Text style={[styles.dispatchNoteText, { color: theme.textSecondary }]}>
                        Dispatch date: <Text style={{ fontWeight: '800', color: theme.textPrimary }}>{dispatchDate.split(' ')[0]}</Text>
                    </Text>
                </View>
                <TouchableOpacity onPress={handleCopyTrackingId} style={[styles.copyButton, { backgroundColor: theme.cardBg }]}>
                    <Copy size={12} color={theme.textPrimary} style={{ marginRight: 4 }} />
                    <Text style={[styles.copyButtonText, { color: theme.textPrimary }]}>Copy</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderWarrantyDetailsCard = () => {
        const hasScm = order.invoiceNumber || order.trackingId || order.totalWarrantyMonths || (order.barcodes && order.barcodes.length > 0);
        if (!hasScm) return null;

        return (
            <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                <Text style={[styles.orderLabel, { color: theme.textSecondary }]}>WARRANTY DETAILS</Text>
                <View style={[styles.detailsList, { borderTopColor: theme.divider, marginTop: 12 }]}>
                    {order.invoiceNumber && (
                        <View style={[styles.detailsRow, { borderBottomColor: theme.divider }]}>
                            <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Invoice Number</Text>
                            <Text style={[styles.detailsValue, { color: theme.textPrimary }]}>{order.invoiceNumber}</Text>
                        </View>
                    )}
                    {order.trackingId && (
                        <View style={[styles.detailsRow, { borderBottomColor: theme.divider }]}>
                            <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Tracking ID</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[styles.detailsValue, { color: theme.textPrimary, marginRight: 6 }]}>{order.trackingId}</Text>
                                <TouchableOpacity onPress={handleCopyTrackingId}>
                                    <Copy size={12} color={theme.textPrimary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    {order.serviceWarrantyMonths !== undefined && order.serviceWarrantyMonths !== null && (
                        <View style={[styles.detailsRow, { borderBottomColor: theme.divider }]}>
                            <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Service Warranty</Text>
                            <Text style={[styles.detailsValue, { color: theme.textPrimary }]}>{order.serviceWarrantyMonths} Months</Text>
                        </View>
                    )}
                    {order.fullWarrantyMonths !== undefined && order.fullWarrantyMonths !== null && (
                        <View style={[styles.detailsRow, { borderBottomColor: theme.divider }]}>
                            <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Full Warranty</Text>
                            <Text style={[styles.detailsValue, { color: theme.textPrimary }]}>{order.fullWarrantyMonths} Months</Text>
                        </View>
                    )}
                    {order.totalWarrantyMonths !== undefined && order.totalWarrantyMonths !== null && (
                        <View style={[styles.detailsRow, { borderBottomColor: theme.divider }]}>
                            <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Total Warranty</Text>
                            <Text style={[styles.detailsValue, { color: theme.textPrimary }]}>{order.totalWarrantyMonths} Months</Text>
                        </View>
                    )}
                    {order.barcodes && order.barcodes.length > 0 && (
                        <View style={{ marginTop: 12, borderBottomWidth: 0 }}>
                            <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Barcodes/ Serial Nos:</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                                {order.barcodes.map((bc, idx) => (
                                    <View key={idx} style={[styles.barcodeTag, { backgroundColor: theme.white }]}>
                                        <Text style={[styles.barcodeTagText, { color: theme.textPrimary }]}>{bc}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.cardBg }]} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                    {order.orderNumber || 'Order Detail'}
                </Text>
                <View style={styles.headerRightPlaceholder} />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#00B074"
                        colors={['#00B074']}
                    />
                }
            >
                {/* Title Card */}
                {renderOrderDetailsCard()}

                {/* Cancelled Alert Box */}
                {isCancelled && (
                    <View style={[styles.cancelledCard, { backgroundColor: 'rgba(239, 83, 80, 0.1)' }]}>
                        <View style={styles.cancelledHeader}>
                            <ShieldAlert size={18} color="#EF5350" />
                            <Text style={styles.cancelledTitle}>Order Cancelled</Text>
                        </View>
                        {order.cancelledAt && (
                            <Text style={[styles.cancelledTime, { color: theme.textSecondary }]}>
                                Cancelled at: {formatFullDate(order.cancelledAt)}
                            </Text>
                        )}
                        <Text style={styles.cancelledReasonLabel}>Reason:</Text>
                        <Text style={[styles.cancelledReasonText, { color: theme.textPrimary }]}>
                            {order.cancelReason || 'No reason provided.'}
                        </Text>
                    </View>
                )}

                {/* Timeline Stepper */}
                <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Timeline</Text>
                    
                    <View style={styles.timelineContainer}>
                        {steps.map((step, index) => {
                            const isStepCompleted = step.time !== null;
                            const isCurrent = currentStep !== -1 && steps[currentStep]?.label === step.label;
                            const activeColor = theme.textPrimary;
                            
                            const formattedTime = formatFullDate(step.time);

                            return (
                                <View key={index} style={styles.timelineRow}>
                                    {/* Circle and Line Column */}
                                    <View style={styles.indicatorCol}>
                                        <View style={[
                                            styles.stepCircle,
                                            { borderColor: theme.textPrimary },
                                            isStepCompleted && [styles.circleCompleted, { backgroundColor: theme.textPrimary, borderColor: theme.textPrimary }],
                                            isCurrent && { borderColor: activeColor, borderWidth: 2 },
                                            !isStepCompleted && !isCurrent && [styles.circlePending, { borderColor: theme.divider }]
                                        ]}>
                                            {isStepCompleted ? (
                                                <Check size={12} color={theme.background} strokeWidth={4} />
                                            ) : isCurrent ? (
                                                <View style={[styles.innerDot, { backgroundColor: activeColor }]} />
                                            ) : (
                                                <View style={[styles.innerDotPending, { backgroundColor: theme.divider }]} />
                                            )}
                                        </View>
                                        {index < steps.length - 1 && (
                                            <View style={[
                                                styles.verticalLine,
                                                isStepCompleted ? [styles.lineCompleted, { backgroundColor: theme.textPrimary }] : [styles.linePending, { backgroundColor: theme.divider }]
                                            ]} />
                                        )}
                                    </View>

                                    {/* Text Info Column */}
                                    <View style={styles.infoCol}>
                                        <Text style={[
                                            styles.stepLabelText,
                                            { color: theme.textPrimary },
                                            isCurrent && { color: activeColor },
                                            !isStepCompleted && !isCurrent && [styles.labelPendingText, { color: theme.textSecondary }]
                                        ]}>
                                            {step.label}
                                        </Text>
                                        {formattedTime ? (
                                            <View>
                                                <View style={styles.timeContainer}>
                                                    <Clock size={12} color={theme.textSecondary} style={{ marginRight: 6 }} />
                                                    <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formattedTime}</Text>
                                                </View>
                                                {step.label === 'Dispatched' && currentStatus?.toLowerCase() === 'dispatched' && (
                                                    renderDispatchDetails()
                                                )}
                                            </View>
                                        ) : (
                                            isStepCompleted && (
                                                <Text style={[styles.noTimeText, { color: theme.textSecondary }]}>Completed</Text>
                                            )
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* SCM & Warranty Details Card */}
                {renderWarrantyDetailsCard()}

                {/* Processing Duration */}
                {durationText && (
                    <View style={[styles.card, { backgroundColor: theme.cardBg, paddingVertical: 20 }]}>
                        <Text style={[styles.orderLabel, { color: theme.textSecondary }]}>Execution Metrics</Text>
                        <Text style={[styles.durationText, { color: theme.textSecondary }]}>
                            Total processing time from creation to complete was <Text style={{ color: theme.textPrimary, fontWeight: '900' }}>{durationText}</Text>.
                        </Text>
                    </View>
                )}
            </ScrollView>
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
        paddingBottom: 10,
        marginTop: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontWeight: '700',
        fontSize: 16,
        flex: 1,
        textAlign: 'center',
    },
    headerRightPlaceholder: {
        width: 40,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 28,
        padding: 20,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    orderLabel: {
        fontWeight: '600',
        fontSize: 11,
        letterSpacing: 1,
    },
    orderIdBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    orderIdText: {
        fontSize: 11,
        fontWeight: '900',
    },
    titleText: {
        fontWeight: '900',
        fontSize: 18,
        marginBottom: 16,
    },
    detailsList: {
        borderTopWidth: 1,
        paddingTop: 8,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    detailsLabel: {
        fontWeight: '600',
        fontSize: 13,
    },
    detailsValue: {
        fontWeight: '800',
        fontSize: 13,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 13,
        fontWeight: '700',
    },
    viewDetailsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewDetailsLink: {
        fontWeight: '800',
        fontSize: 13,
        marginRight: 4,
    },
    cancelledCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
    },
    cancelledHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cancelledTitle: {
        fontWeight: '900',
        fontSize: 16,
        marginLeft: 8,
    },
    cancelledTime: {
        fontSize: 12,
        marginBottom: 12,
        fontWeight: '600',
    },
    cancelledReasonLabel: {
        fontWeight: '800',
        fontSize: 12,
        color: '#EF5350',
        marginBottom: 4,
    },
    cancelledReasonText: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
    },
    sectionTitle: {
        fontWeight: '900',
        fontSize: 16,
        marginBottom: 20,
    },
    timelineContainer: {
        paddingLeft: 4,
    },
    timelineRow: {
        flexDirection: 'row',
        minHeight: 64,
    },
    indicatorCol: {
        alignItems: 'center',
        width: 24,
        marginRight: 16,
    },
    stepCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'transparent',
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleCompleted: {
    },
    circlePending: {
    },
    innerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    innerDotPending: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    verticalLine: {
        width: 2,
        flex: 1,
        marginVertical: 4,
    },
    lineCompleted: {
    },
    linePending: {
    },
    infoCol: {
        flex: 1,
        paddingBottom: 20,
    },
    stepLabelText: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 4,
    },
    labelPendingText: {
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    noTimeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    durationText: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '600',
        marginTop: 10,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600',
    },
    errorText: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 16,
    },
    backBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
    },
    backBtnText: {
        fontWeight: '900',
        fontSize: 14,
    },
    dispatchNoteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 20,
        marginTop: 8,
    },
    dispatchNoteText: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '600',
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    copyButtonText: {
        fontSize: 11,
        fontWeight: '800',
    },
    barcodeTag: {
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 6,
        marginBottom: 6,
    },
    barcodeTagText: {
        fontSize: 12,
        fontWeight: '800',
    },
});
