import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bolt, Clock, ChevronRight, AlertCircle } from 'lucide-react-native';
import { sessionApi } from '../services/api';
import { authService } from '../services/auth';
import LoginRequiredDialog from '../components/LoginRequiredDialog';
import { useTheme } from '../context/ThemeContext';

export default function ActiveSessionsScreen({ navigation }) {
    const { theme, isDark } = useTheme();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [loginPromptVisible, setLoginPromptVisible] = useState(false);

    useEffect(() => {
        const checkGuest = async () => {
            const guest = await authService.isGuestMode();
            setIsGuest(guest);
            if (guest) {
                setLoading(false);
                setLoginPromptVisible(true);
            } else {
                fetchActiveSessions();
            }
        };
        checkGuest();
    }, []);

    const fetchActiveSessions = async () => {
        try {
            const user = await authService.getUser();
            if (!user) {
                setLoading(false);
                return;
            }
            const userId = user.id || user.userId || user.email;
            const response = await sessionApi.getAllActiveSessions(userId);
            setSessions(response || []);
        } catch (error) {
            console.error("Error fetching active sessions:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchActiveSessions();
    };

    const handleSessionPress = (session) => {
        navigation.navigate('Session', {
            resumeSessionId: session.sessionId,
            chargerId: session.chargerId,
            boxId: session.boxId,
            stationName: session.stationName,
            startTime: session.startTime,
            selectedKwh: session.selectedKwh,
            amountEntered: session.amountEntered,
            chargingMode: session.chargingMode,
            planId: session.planId,
            rate: session.rate,
            connectorType: session.connectorType,
            chargerType: session.chargerType,
            stationId: session.stationId,
            latitude: session.latitude,
            longitude: session.longitude,
            durationMin: session.durationMin
        });
    };

    const formatStartTime = (timestamp) => {
        if (!timestamp) return "Unknown";
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderSessionItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.sessionCard, { backgroundColor: theme.cardBg }]}
            onPress={() => handleSessionPress(item)}
            activeOpacity={0.9}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.iconWrapper, { backgroundColor: theme.white }]}>
                    <Bolt size={18} color="#00B074" />
                </View>
                <View style={styles.headerInfo}>
                    <Text style={[styles.stationName, { color: theme.textPrimary }]} numberOfLines={1}>{item.stationName}</Text>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>ACTIVE</Text>
                    </View>
                </View>
                <ChevronRight size={20} color={theme.textSecondary} />
            </View>

            <View style={[styles.cardDivider, { backgroundColor: theme.divider }]} />

            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Clock size={16} color={theme.textSecondary} style={styles.infoIcon} />
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Started at:</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{formatStartTime(item.startTime)}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Bolt size={16} color={theme.textSecondary} style={styles.infoIcon} />
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Charger Type:</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{item.chargerType}</Text>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.resumeBtn, { backgroundColor: theme.white }]}
                onPress={() => handleSessionPress(item)}
            >
                <Text style={[styles.resumeBtnText, { color: theme.textPrimary }]}>View Progress</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />
            
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.cardBg }]} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Active Sessions</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#00B074" />
                </View>
            ) : (
                <FlatList
                    data={sessions}
                    renderItem={renderSessionItem}
                    keyExtractor={(item) => item.sessionId.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00B074" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconWrapper, { backgroundColor: theme.cardBg }]}>
                                <AlertCircle size={40} color={theme.textPrimary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Active Sessions</Text>
                            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>You don't have any charging sessions running right now.</Text>
                            <TouchableOpacity
                                style={[styles.startBtn, { backgroundColor: theme.white }]}
                                onPress={() => navigation.navigate('Home')}
                            >
                                <Text style={[styles.startBtnText, { color: theme.textPrimary }]}>Find a Station</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Login Required Dialog */}
            <LoginRequiredDialog
                visible={loginPromptVisible}
                contextMessage="Sign in to view your active charging sessions"
                onLoginPress={() => {
                    setLoginPromptVisible(false);
                    navigation.replace('Login', {
                        returnRoute: 'ActiveSessions'
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
        paddingVertical: 15,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        flex: 1,
    },
    listContent: {
        padding: 20,
        flexGrow: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sessionCard: {
        marginBottom: 20,
        borderRadius: 28,
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerInfo: {
        flex: 1,
    },
    stationName: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00B074',
        marginRight: 6,
    },
    statusText: {
        color: '#00B074',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    cardDivider: {
        height: 1,
        marginVertical: 16,
    },
    cardBody: {
        gap: 12,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoIcon: {
        marginRight: 10,
    },
    infoLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginRight: 5,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '800',
    },
    resumeBtn: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resumeBtnText: {
        fontSize: 15,
        fontWeight: '900',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 80,
    },
    emptyIconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 30,
    },
    startBtn: {
        height: 56,
        borderRadius: 28,
        paddingHorizontal: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    startBtnText: {
        fontSize: 15,
        fontWeight: '900',
    },
});
