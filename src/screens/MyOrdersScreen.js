import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ClipboardList, Clock, ChevronRight, Bolt, Package } from 'lucide-react-native';
import { ordersApi } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { authService } from '../services/auth';
import LoginRequiredDialog from '../components/LoginRequiredDialog';
import { useTheme } from '../context/ThemeContext';

const capitalize = (str) => {
    if (!str) return '';
    const trimmed = String(str).trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const formatOrderDate = (dateArrayOrStr) => {
    if (!dateArrayOrStr) return '---';
    try {
        if (Array.isArray(dateArrayOrStr)) {
            const [y, M, d] = dateArrayOrStr;
            const dateObj = new Date(y, M - 1, d);
            return dateObj.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
        }
        const dateObj = new Date(dateArrayOrStr);
        if (!isNaN(dateObj.getTime())) {
            return dateObj.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
        }
    } catch (e) {
        console.warn("Date parse error in orders:", e);
    }
    return '---';
};

export default function MyOrdersScreen({ navigation }) {
    const { theme, isDark } = useTheme();
    const { showAlert } = useAlert();
    const [orders, setOrders] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loginPromptVisible, setLoginPromptVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'completed'

    const loadOrders = useCallback(async (showLoader = true) => {
        if (showLoader) setIsFetching(true);
        try {
            const myOrders = await ordersApi.getMyOrders();
            setOrders(myOrders || []);
        } catch (error) {
            console.error("Failed to load orders:", error);
            if (error.response?.status === 403) {
                showAlert(
                    "Access Restricted",
                    "You do not have permission to access order tracking. Please ensure you are logged in with an authorized account."
                );
            } else {
                showAlert("Error", "Failed to fetch orders: " + (error.userMessage || error.message));
            }
        } finally {
            setIsFetching(false);
            setRefreshing(false);
        }
    }, [showAlert]);

    useEffect(() => {
        const checkAuth = async () => {
            const guest = await authService.isGuestMode();
            if (guest) {
                setLoginPromptVisible(true);
            } else {
                loadOrders();
            }
        };
        checkAuth();
    }, [loadOrders]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadOrders(false);
    }, [loadOrders]);

    const filteredOrders = orders.filter(order => {
        const s = (order.orderStatus || order.status || '').toLowerCase();
        if (activeTab === 'pending') {
            return s === 'sales_registered' || s === 'in_production' || s === 'pending' || s === 'in_progress' || s === 'testing';
        }
        if (activeTab === 'completed') {
            return s === 'production_complete' || s === 'scm_complete' || s === 'dispatched' || s === 'completed' || s === 'delivered';
        }
        return true; // 'all'
    });

    const renderOrderItem = ({ item }) => {
        const currentStatus = item.orderStatus || item.status;
        const formatStatus = (statusStr) => {
            const s = statusStr?.toLowerCase() || '';
            const p = item.productionStatus?.toLowerCase() || '';
            switch (s) {
                case 'sales_registered': case 'pending': 
                    return 'Order Placed';
                case 'in_production': case 'in_progress': 
                    if (p === 'testing') return 'Testing';
                    return 'In Production';
                case 'production_complete': case 'completed':
                    return 'Ready to Ship';
                case 'scm_complete':
                    return 'Ready to Ship';
                case 'dispatched': case 'delivered':
                    return 'Dispatched';
                case 'cancelled':
                    return 'Cancelled';
                default:
                    return 'Processing';
            }
        };
        const displayDate = formatOrderDate(item.createdAt);

        // Multi-product fallback strategy
        const getProductsList = () => {
            if (Array.isArray(item.orderItems) && item.orderItems.length > 0) {
                return item.orderItems.map((prod, idx) => ({
                    id: prod.id || idx,
                    name: prod.productDetails || prod.name || 'EV Product',
                    quantity: prod.quantity || 1
                }));
            }
            if (item.productDetails) {
                return [{
                    id: 'legacy',
                    name: item.productDetails,
                    quantity: item.quantity || 1
                }];
            }
            return [{
                id: 'default',
                name: item.title || 'EV Equipment',
                quantity: item.quantity || 1
            }];
        };

        const products = getProductsList();

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.cardBg }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.titleContainer}>
                        <Bolt size={14} color={theme.textPrimary} style={styles.zapIcon} />
                        <Text style={[styles.orderNumber, { color: theme.textPrimary }]} numberOfLines={1}>
                            {item.orderNumber || 'ORD-UNKNOWN'}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: theme.white }]}>
                        <Text style={[styles.statusText, { color: theme.textPrimary }]}>{formatStatus(currentStatus)}</Text>
                    </View>
                </View>

                {/* Multiple Products List */}
                <View style={{ marginVertical: 8 }}>
                    {products.map((prod, index) => (
                        <React.Fragment key={prod.id}>
                            {index > 0 && (
                                <View style={{ height: 1, backgroundColor: theme.divider, marginVertical: 8, opacity: 0.6 }} />
                            )}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                    <Package size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                                    <Text style={[styles.orderTitle, { color: theme.textPrimary, flex: 1, marginBottom: 0 }]} numberOfLines={1}>
                                        {capitalize(prod.name)}
                                    </Text>
                                </View>
                                <Text style={[styles.detailsLabel, { color: theme.textSecondary, fontWeight: '600' }]}>
                                    x{prod.quantity}
                                </Text>
                            </View>
                        </React.Fragment>
                    ))}
                </View>
                
                <View style={[styles.detailsContainer, { marginTop: 8 }]}>
                    {item.customerName && (
                        <Text style={[styles.customerText, { color: theme.textSecondary }]} numberOfLines={1}>
                            <Text style={styles.customerLabel}>Customer: </Text>{item.customerName}
                        </Text>
                    )}
                </View>

                <View style={[styles.cardFooter, { borderTopColor: theme.divider }]}>
                    <View style={styles.metaItem}>
                        <Clock size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                        <Text style={[styles.metaText, { color: theme.textSecondary }]}>{displayDate}</Text>
                    </View>
                    <View style={styles.viewDetailsContainer}>
                        <Text style={[styles.viewDetailsLink, { color: theme.textSecondary }]}>Details</Text>
                        <ChevronRight size={14} color={theme.textSecondary} style={styles.arrowIcon} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            
            {/* Custom AppBar */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={[styles.backButton, { backgroundColor: theme.cardBg }]} 
                    onPress={() => navigation.goBack()}
                >
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>My Orders</Text>
                <View style={styles.headerRightPlaceholder} />
            </View>

            {/* Filter Pills */}
            <View style={styles.pillsContainer}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: 'Active' },
                    { key: 'completed', label: 'Completed' }
                ].map((filter) => {
                    const isActive = activeTab === filter.key;
                    return (
                        <TouchableOpacity
                            key={filter.key}
                            style={[
                                styles.pillButton, 
                                { backgroundColor: theme.cardBg, borderColor: theme.divider },
                                isActive && [styles.pillButtonActive, { backgroundColor: theme.white }]
                            ]}
                            onPress={() => setActiveTab(filter.key)}
                        >
                            <Text style={[
                                styles.pillText, 
                                { color: theme.textSecondary },
                                isActive && [styles.pillTextActive, { color: theme.textPrimary }]
                            ]}>
                                {isActive ? `✓ ${filter.label}` : filter.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Order List */}
            {isFetching && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#00B074" />
                </View>
            ) : (
                <FlatList
                    data={filteredOrders}
                    renderItem={renderOrderItem}
                    keyExtractor={(item) => (item.id ? item.id.toString() : Math.random().toString())}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#00B074"
                            colors={['#00B074']}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <ClipboardList size={48} color={theme.textSecondary} style={styles.emptyIcon} />
                            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Orders Found</Text>
                            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                                {activeTab === 'pending' 
                                    ? "You don't have any ongoing or active orders."
                                    : activeTab === 'completed'
                                    ? "No completed or delivered orders found."
                                    : "You don't have any orders assigned to you yet."}
                            </Text>
                        </View>
                    }
                />
            )}

            <LoginRequiredDialog
                visible={loginPromptVisible}
                onClose={() => {
                    setLoginPromptVisible(false);
                    navigation.goBack();
                }}
                navigation={navigation}
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
        fontWeight: '900',
        fontSize: 22,
        flex: 1,
        textAlign: 'center',
    },
    headerRightPlaceholder: {
        width: 40,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 20,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    zapIcon: {
        marginRight: 6,
    },
    orderNumber: {
        fontWeight: '600',
        fontSize: 13,
        letterSpacing: 0.2,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: {
        fontWeight: '600',
        fontSize: 11,
        letterSpacing: 0.2,
    },
    orderTitle: {
        fontWeight: '600',
        fontSize: 16,
        marginBottom: 10,
    },
    detailsContainer: {
        marginBottom: 16,
        gap: 4,
    },
    detailsText: {
        fontSize: 13,
        fontWeight: '400',
    },
    detailsLabel: {
        fontWeight: '500',
    },
    customerText: {
        fontSize: 12,
        fontWeight: '400',
    },
    customerLabel: {
        fontWeight: '500',
        fontSize: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        paddingTop: 14,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 13,
        fontWeight: '500',
    },
    viewDetailsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewDetailsLink: {
        fontWeight: '600',
        fontSize: 13,
    },
    arrowIcon: {
        marginLeft: 4,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
        paddingHorizontal: 24,
    },
    emptyIcon: {
        marginBottom: 16,
    },
    emptyTitle: {
        fontWeight: '700',
        fontSize: 18,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '400',
    },
    pillsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 16,
        marginTop: 15,
    },
    pillButton: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
    },
    pillButtonActive: {
        borderColor: 'transparent',
    },
    pillText: {
        fontSize: 14,
        fontWeight: '500',
    },
    pillTextActive: {
        fontWeight: '700',
    },
});
