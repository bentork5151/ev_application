import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-gifted-charts';
import { ChevronLeft, Bolt, DollarSign, Leaf, MapPin } from 'lucide-react-native';
import statsService from '../services/statsService';
import { authService } from '../services/auth';
import LoginRequiredDialog from '../components/LoginRequiredDialog';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Card = ({ title, value, unit, icon: Icon, color, subtitle }) => {
    const { theme, isDark } = useTheme();
    return (
        <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: theme.white }]}>
                    <Icon size={18} color={color} />
                </View>
                <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>{title}</Text>
            </View>
            <View style={styles.cardBottom}>
                <Text style={[styles.cardValue, { color: theme.textPrimary }]}>{value} <Text style={[styles.cardUnit, { color: theme.textSecondary }]}>{unit}</Text></Text>
                {subtitle && <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
            </View>
        </View>
    );
};

export default function ChargingInsightsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState([]);
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
                loadData();
            }
        };
        checkGuest();
    }, []);

    const loadData = async () => {
        try {
            const data = await statsService.getAggregatedStats();
            setStats(data);

            const chartRaw = data.history.slice(0, 7).reverse().map(item => {
                const energyVal = parseFloat(item.energyDelivered) || 0;
                return {
                    value: energyVal,
                    label: new Date(item.timestamp).getDate().toString(), 
                    frontColor: '#00B074',
                    topLabelComponent: () => (
                        <Text style={{ color: theme.textPrimary, fontSize: 10, marginBottom: 2, fontWeight: '700' }}>{energyVal.toFixed(1)}</Text>
                    )
                };
            });

            setChartData(chartRaw);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#00B074" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.cardBg }]}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Charging Insights</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Your green impact & savings</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Green Level Badge */}
                <View style={[styles.levelBadge, { backgroundColor: theme.cardBg }]}>
                    <Leaf size={14} color="#00B074" style={{ marginRight: 6 }} />
                    <Text style={[styles.levelText, { color: theme.textSecondary }]}>Current Status: <Text style={styles.levelValue}>{stats?.greenLevel}</Text></Text>
                </View>

                {/* Main Stats Cards (No borders/elevations) */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll} contentContainerStyle={{ paddingHorizontal: 20 }}>
                    <Card
                        title="Total Energy"
                        value={stats?.totalEnergy}
                        unit="kWh"
                        icon={Bolt}
                        color="#FFA726"
                        subtitle={`${stats?.totalSessions} Sessions`}
                    />
                    <View style={{ width: 12 }} />
                    <Card
                        title="CO₂ Saved"
                        value={stats?.totalCo2Saved}
                        unit="kg"
                        icon={Leaf}
                        color="#00B074"
                        subtitle="vs ICE Vehicle"
                    />
                    <View style={{ width: 12 }} />
                    <Card
                        title="Money Saved"
                        value={`₹${stats?.totalMoneySaved}`}
                        unit=""
                        icon={DollarSign}
                        color="#0086FF"
                        subtitle="Estimated"
                    />
                </ScrollView>

                {/* Chart Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Energy Trends (Last 7 Sessions)</Text>
                    <View style={[styles.chartCard, { backgroundColor: theme.cardBg }]}>
                        {chartData.length > 0 ? (
                            <BarChart
                                data={chartData}
                                barWidth={18}
                                spacing={12}
                                initialSpacing={15}
                                yAxisLabelWidth={30}
                                noOfSections={4}
                                barBorderRadius={4}
                                frontColor="#00B074"
                                yAxisThickness={0}
                                xAxisThickness={0}
                                yAxisTextStyle={{ color: theme.textSecondary }}
                                xAxisLabelTextStyle={{ color: theme.textSecondary }}
                                hideRules
                                isAnimated
                                height={180}
                                width={width - 120} 
                            />
                        ) : (
                            <View style={styles.emptyChart}>
                                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No charging data yet</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Recent History Grouped Container Card */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Sessions</Text>
                    
                    {stats?.history?.length === 0 ? (
                        <View style={[styles.emptyHistoryCard, { backgroundColor: theme.cardBg }]}>
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Your charging history will appear here.</Text>
                        </View>
                    ) : (
                        <View style={[styles.historyContainerCard, { backgroundColor: theme.cardBg }]}>
                            {stats?.history?.map((item, index) => {
                                const itemDate = new Date(item.timestamp);
                                const dayStr = itemDate.getDate();
                                const monthStr = MONTHS[itemDate.getMonth()] || 'Jan';
                                const energyDelivered = (parseFloat(item.energyDelivered) || 0).toFixed(1);
                                const costVal = (parseFloat(item.cost) || 0).toFixed(2);
                                const isLast = index === stats.history.length - 1;
                                
                                return (
                                    <View key={item.id || index} style={[styles.historyRow, { borderBottomColor: theme.divider }, isLast && { borderBottomWidth: 0 }]}>
                                        <View style={styles.historyLeft}>
                                            <View style={[styles.dateBox, { backgroundColor: theme.white }]}>
                                                <Text style={[styles.dateDay, { color: theme.textPrimary }]}>{dayStr}</Text>
                                                <Text style={[styles.dateMonth, { color: theme.textSecondary }]}>{monthStr}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.stationName, { color: theme.textPrimary }]} numberOfLines={1}>{item.stationName}</Text>
                                                <View style={styles.metaRow}>
                                                    <MapPin size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
                                                    <Text style={[styles.locationText, { color: theme.textSecondary }]}>{item.location || 'Unknown'}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.historyRight}>
                                            <Text style={styles.energyText}>{energyDelivered} kWh</Text>
                                            <Text style={[styles.costText, { color: theme.textSecondary }]}>-₹{costVal}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

            </ScrollView>

            {/* Login Required Dialog */}
            <LoginRequiredDialog
                visible={loginPromptVisible}
                contextMessage="Sign in to view your charging insights"
                onLoginPress={() => {
                    setLoginPromptVisible(false);
                    navigation.replace('Login', {
                        returnRoute: 'ChargingInsights'
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
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
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
    },
    headerSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    scrollContent: {
        paddingTop: 10,
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginHorizontal: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginBottom: 20,
    },
    levelText: {
        fontSize: 12,
        fontWeight: '600',
    },
    levelValue: {
        color: '#00B074',
        fontWeight: '900',
    },
    cardsScroll: {
        marginBottom: 24,
    },
    statCard: {
        width: 140,
        height: 140,
        padding: 16,
        borderRadius: 24,
        justifyContent: 'space-between',
    },
    cardHeader: {
        marginBottom: 4,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '700',
    },
    cardBottom: {
        justifyContent: 'flex-end',
    },
    cardValue: {
        fontSize: 20,
        fontWeight: '900',
    },
    cardUnit: {
        fontSize: 12,
        fontWeight: '700',
    },
    cardSubtitle: {
        fontSize: 10,
        marginTop: 2,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 12,
    },
    chartCard: {
        borderRadius: 28,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyChart: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyContainerCard: {
        borderRadius: 28,
        paddingHorizontal: 16,
    },
    emptyHistoryCard: {
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    historyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dateBox: {
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignItems: 'center',
        marginRight: 12,
    },
    dateDay: {
        fontWeight: '900',
        fontSize: 15,
    },
    dateMonth: {
        fontSize: 10,
        textTransform: 'uppercase',
        fontWeight: '700',
    },
    stationName: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        fontSize: 12,
    },
    historyRight: {
        alignItems: 'flex-end',
        marginLeft: 10,
    },
    energyText: {
        color: '#00B074',
        fontSize: 15,
        fontWeight: '900',
        marginBottom: 2,
    },
    costText: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        fontStyle: 'italic',
    }
});
