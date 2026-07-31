import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Package, ShoppingBag, ChevronRight } from 'lucide-react-native';

const OrderCard = ({ order, onPress }) => {
    if (!order) return null;

    // Standardize & Fallback Product List
    const getOrderItems = () => {
        if (Array.isArray(order.orderItems) && order.orderItems.length > 0) {
            return order.orderItems.map((item, index) => ({
                id: item.id || `item-${index}`,
                name: item.productDetails || item.name || 'EV Product',
                quantity: item.quantity || 1,
            }));
        }

        // Fallback for single product / legacy order format
        if (order.productDetails) {
            return [{
                id: 'legacy-item',
                name: order.productDetails,
                quantity: order.quantity || 1,
            }];
        }

        // Emergency Fallback
        return [{
            id: 'unknown-item',
            name: 'EV Product / Equipment',
            quantity: order.quantity || 1,
        }];
    };

    const items = getOrderItems();
    const orderNumber = order.orderNumber || (order.id ? `ORD-${order.id}` : 'Order');
    const orderStatus = order.orderStatus || order.productionStatus || 'PROCESSING';
    const totalAmount = order.totalInvoiceAmount != null ? `₹${order.totalInvoiceAmount.toLocaleString()}` : null;

    return (
        <TouchableOpacity 
            style={styles.cardContainer} 
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Header: Order Number + Status Badge */}
            <View style={styles.headerRow}>
                <View style={styles.orderTitleWrapper}>
                    <Package size={20} color="#1A1A1A" style={styles.iconMargin} />
                    <Text style={styles.orderNumberText}>{orderNumber}</Text>
                </View>
                <View style={[styles.statusBadge, getStatusBadgeStyle(orderStatus)]}>
                    <Text style={styles.statusBadgeText}>{formatStatusText(orderStatus)}</Text>
                </View>
            </View>

            {/* Content: List of Products */}
            <View style={styles.productsContainer}>
                {items.map((item) => (
                    <View key={item.id} style={styles.productRow}>
                        <ShoppingBag size={16} color="#5A6B7C" style={styles.iconMarginSmall} />
                        <Text style={styles.productNameText} numberOfLines={1} ellipsisMode="tail">
                            {item.name}
                        </Text>
                        <View style={styles.quantityBadge}>
                            <Text style={styles.quantityBadgeText}>x{item.quantity}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Footer: Amount & Action Link */}
            <View style={styles.footerRow}>
                <View>
                    <Text style={styles.footerLabel}>Total Amount</Text>
                    <Text style={styles.footerValue}>{totalAmount || 'Price on request'}</Text>
                </View>
                <View style={styles.viewDetailsWrapper}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <ChevronRight size={16} color="#1A1A1A" />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const formatStatusText = (status) => {
    if (!status) return 'Processing';
    return String(status).replace(/_/g, ' ');
};

const getStatusBadgeStyle = (status) => {
    const s = String(status).toUpperCase();
    if (s.includes('COMPLETED') || s.includes('DELIVERED') || s.includes('DISPATCHED')) {
        return { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' };
    }
    if (s.includes('CANCELLED') || s.includes('FAILED')) {
        return { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' };
    }
    return { backgroundColor: '#FFF3E0', borderColor: '#FFE0B2' };
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
        marginHorizontal: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E7EC',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F4F8',
    },
    orderTitleWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconMargin: {
        marginRight: 8,
    },
    iconMarginSmall: {
        marginRight: 6,
    },
    orderNumberText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1A1A1A',
        textTransform: 'uppercase',
    },
    productsContainer: {
        paddingVertical: 12,
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    productNameText: {
        flex: 1,
        fontSize: 14,
        color: '#334155',
        fontWeight: '500',
    },
    quantityBadge: {
        backgroundColor: '#E2E7EC',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    quantityBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F4F8',
    },
    footerLabel: {
        fontSize: 11,
        color: '#5A6B7C',
        textTransform: 'uppercase',
        fontWeight: '500',
    },
    footerValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    viewDetailsWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewDetailsText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1A1A1A',
        marginRight: 4,
    },
});

export default OrderCard;
