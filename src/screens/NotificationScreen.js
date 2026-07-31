import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { notificationApi } from '../services/api';
import { authService } from '../services/auth';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const getAvatarColor = (title) => {
    const initial = (title || 'N').charAt(0).toUpperCase();
    const charCode = initial.charCodeAt(0);
    const colors = ['#00B074', '#FFA726', '#EF5350', '#2B6CB0', '#5A6B7C', '#6B46C1'];
    return colors[charCode % colors.length];
};

const formatTime = (time) => {
    if (!time) return '';
    try {
        const date = new Date(time);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.round(diffMs / 60000);
        const diffHrs = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHrs < 24) return `${diffHrs} hr ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    } catch (e) {
        return time; 
    }
};

const AnimatedNotificationRow = ({ item, index, onPress, isExpanded }) => {
    const { theme, isDark } = useTheme();
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(15)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 250,
                delay: Math.min(index * 50, 400),
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 250,
                delay: Math.min(index * 50, 400),
                useNativeDriver: true,
            }),
        ]).start();
    }, [index]);

    const isRead = item.read || item.isRead || false;
    const initial = (item.title || 'N').charAt(0).toUpperCase();
    const initialColor = getAvatarColor(item.title);

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            <TouchableOpacity
                style={[
                    styles.notificationRow, 
                    { borderBottomColor: theme.divider }
                ]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <View style={styles.cardContent}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.white }]}>
                        <Text style={[styles.avatarText, { color: initialColor }]}>{initial}</Text>
                    </View>
                    
                    <View style={styles.textContainer}>
                        <View style={styles.headerRow}>
                            <Text style={[styles.title, { color: theme.textPrimary }, !isRead && styles.unreadTitle]}>{item.title}</Text>
                            <View style={styles.timeContainer}>
                                {!isRead && <View style={styles.unreadDot} />}
                                <Text style={[styles.timestamp, { color: !isRead ? theme.textPrimary : theme.textSecondary }, !isRead && styles.unreadTimestamp]}>
                                    {formatTime(item.createdAt || item.timestamp)}
                                </Text>
                            </View>
                        </View>
                        <Text 
                            style={[styles.message, { color: !isRead ? theme.textPrimary : theme.textSecondary }, !isRead && styles.unreadMessage]} 
                            numberOfLines={isExpanded ? undefined : 3}
                        >
                            {item.message || item.body}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function NotificationScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const [allNotifications, setAllNotifications] = useState([]);
    const [displayLimit, setDisplayLimit] = useState(10);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedNotifications, setExpandedNotifications] = useState({});

    const visibleNotifications = allNotifications.slice(0, displayLimit);

    const fetchNotifications = async () => {
        try {
            const user = await authService.getUser();
            if (user) {
                const userId = user.id || user.userId;
                const data = await notificationApi.getAllNotifications(userId);
                const list = Array.isArray(data) ? data : (data?.notifications || []);

                const sorted = list.sort((a, b) => {
                    const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
                    const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
                    return timeB - timeA;
                });

                setAllNotifications(sorted);
                setDisplayLimit(10); 
            }
        } catch (error) {
            console.log("Error fetching notifications:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAsRead = async (id, currentReadStatus) => {
        if (currentReadStatus) return; 

        setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, isRead: true } : n));

        try {
            await notificationApi.markAsRead(id);
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const handleNotificationPress = async (item) => {
        const isRead = item.read || item.isRead || false;
        if (!isRead) {
            markAsRead(item.id, isRead);
        }

        setExpandedNotifications(prev => ({
            ...prev,
            [item.id]: !prev[item.id]
        }));

        if (String(item.type).toUpperCase() === 'SESSION_REMINDER') {
            let parsedSessionId = null;
            if (item.sessionId) {
                parsedSessionId = parseInt(item.sessionId, 10);
            } else if (item.data) {
                try {
                    const parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
                    if (parsedData?.sessionId) {
                        parsedSessionId = parseInt(parsedData.sessionId, 10);
                    }
                } catch (e) {
                    // Ignore
                }
            }

            if (parsedSessionId && !isNaN(parsedSessionId)) {
                navigation.navigate('ActiveSessionScreen', { sessionId: parsedSessionId });
            }
        } else if (String(item.type).toUpperCase() === 'ORDER' || String(item.type).toUpperCase().includes('ORDER')) {
            let parsedOrderId = item.orderId;
            if (!parsedOrderId && item.data) {
                try {
                    const parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
                    if (parsedData?.orderId) {
                        parsedOrderId = parsedData.orderId;
                    }
                } catch (e) {
                    // Ignore
                }
            }

            if (parsedOrderId) {
                navigation.navigate('OrderDetail', { orderId: parsedOrderId });
            } else {
                navigation.navigate('MyOrders');
            }
        }
    };

    const markAllAsRead = async () => {
        const unread = allNotifications.filter(n => !n.read && !n.isRead);
        if (unread.length === 0) return;

        setAllNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));

        try {
            await Promise.all(unread.map(n => notificationApi.markAsRead(n.id)));
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const renderItem = ({ item, index }) => (
        <AnimatedNotificationRow
            item={item}
            index={index}
            isExpanded={expandedNotifications[item.id]}
            onPress={() => handleNotificationPress(item)}
        />
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.cardBg }]}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Notifications</Text>
                
                {allNotifications.filter(n => !n.read && !n.isRead).length > 0 && (
                    <TouchableOpacity onPress={markAllAsRead} style={[styles.markReadBtn, { backgroundColor: theme.cardBg }]}>
                        <Text style={styles.markAllText}>Read all</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#00B074" />
                </View>
            ) : allNotifications.length > 0 ? (
                <FlatList
                    data={visibleNotifications}
                    renderItem={renderItem}
                    keyExtractor={item => (item.id || Math.random()).toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00B074" />
                    }
                    ListFooterComponent={
                        allNotifications.length > displayLimit ? (
                            <TouchableOpacity
                                style={[styles.loadMoreButton, { backgroundColor: theme.cardBg }]}
                                onPress={() => setDisplayLimit(prev => prev + 10)}
                            >
                                <Text style={styles.loadMoreText}>Load More</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.footerNote}>
                                <Text style={[styles.footerNoteText, { color: theme.textSecondary }]}>You're all caught up</Text>
                            </View>
                        )
                    }
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconBg, { backgroundColor: theme.cardBg }]}>
                        <ChevronLeft size={40} color={theme.textPrimary} style={{ transform: [{ rotate: '90deg' }] }} />
                    </View>
                    <Text style={[styles.emptyText, { color: theme.textPrimary }]}>No notifications yet</Text>
                    <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>We'll notify you when something happens.</Text>
                </View>
            )}
        </View>
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
        paddingBottom: 16,
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
        fontSize: 22,
        fontWeight: '900',
        flex: 1,
        marginLeft: 12,
    },
    markReadBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    markAllText: {
        color: '#00B074',
        fontSize: 12,
        fontWeight: '800',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    notificationRow: {
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        position: 'relative',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    unreadDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00B074',
        marginRight: 6,
    },
    cardContent: {
        flexDirection: 'row',
        paddingVertical: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '900',
    },
    textContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
        paddingRight: 8,
    },
    unreadTitle: {
        fontWeight: '900',
    },
    timestamp: {
        fontSize: 11,
    },
    unreadTimestamp: {
        fontWeight: '700',
    },
    message: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 2,
    },
    unreadMessage: {
        fontWeight: '700',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 80,
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 6,
    },
    emptySubText: {
        fontSize: 13,
        textAlign: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadMoreButton: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        marginBottom: 20,
        borderRadius: 16,
    },
    loadMoreText: {
        color: '#00B074',
        fontSize: 13,
        fontWeight: '800',
    },
    footerNote: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    footerNoteText: {
        fontSize: 13,
        fontStyle: 'italic',
    },
});
