import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Switch, Animated, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, ChevronLeft, TrendingUp, MapPin, Zap, FlaskConical, Shield, Bell } from 'lucide-react-native';
import { useAlert } from '../context/AlertContext';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { getSimulateRelease, setSimulateRelease } from '../utils/devSettings';
import UpdateRequiredModal from '../components/UpdateRequiredModal';
import { useTheme } from '../context/ThemeContext';

// Centralized Theme Palette for Easy Dark Mode Transition
const colors = {
    light: {
        background: '#D0D6DB',
        cardBackground: '#E2E7EC',
        headerBackground: '#D0D6DB',
        headerTitle: '#1A1A1A',
        textPrimary: '#1A1A1A',
        textSecondary: '#5A6B7C',
        dividerColor: '#BFC7CE',
        iconBoxBorder: '#BFC7CE',
        iconBoxBg: 'rgba(26, 26, 26, 0.05)',
        backBtnBg: '#E2E7EC',
        chevronColor: '#5A6B7C',
        switchTrackFalse: '#BFC7CE',
        switchTrackTrue: 'rgba(0, 176, 116, 0.4)',
        switchThumbFalse: '#5A6B7C',
        switchThumbTrue: '#00B074',
        greenAccent: '#00B074',
        redAccent: '#FF5252',
        statusBarContent: 'dark-content',
    },
    dark: {
        background: '#161616',
        cardBackground: '#242424',
        headerBackground: '#161616',
        headerTitle: '#FFFFFF',
        textPrimary: '#FFFFFF',
        textSecondary: '#A0A0A0',
        dividerColor: '#333333',
        iconBoxBorder: '#333333',
        iconBoxBg: 'rgba(255, 255, 255, 0.05)',
        backBtnBg: '#2D2D2D',
        chevronColor: '#A0A0A0',
        switchTrackFalse: '#333333',
        switchTrackTrue: 'rgba(0, 176, 116, 0.4)',
        switchThumbFalse: '#5E5A62',
        switchThumbTrue: '#00B074',
        greenAccent: '#00B074',
        redAccent: '#FF5252',
        statusBarContent: 'light-content',
    }
};

const DevMenuItem = ({ icon: Icon, title, subtitle, onPress, color, isLast, theme, styles }) => (
    <TouchableOpacity style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]} onPress={onPress}>
        <View style={styles.menuItemLeft}>
            <View style={[styles.iconBox, { borderColor: color || theme.dividerColor }]}>
                <Icon size={20} color={color || theme.textPrimary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.menuItemTitle}>{title}</Text>
                {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
            </View>
        </View>
        <ChevronRight size={20} color={theme.chevronColor} />
    </TouchableOpacity>
);

export default function DeveloperScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();
    const { isDark } = useTheme();
    const [simulateRelease, setSimRelease] = useState(false);
    const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
    const [isForceUpdateTest, setIsForceUpdateTest] = useState(true);
    const [showSnackbar, setShowSnackbar] = useState(false);
    const snackbarAnim = useRef(new Animated.Value(0)).current;

    // Use dynamic theme colors based on theme context
    const theme = isDark ? colors.dark : colors.light;
    const styles = getStyles(theme);

    const triggerSnackbar = () => {
        snackbarAnim.stopAnimation();
        setShowSnackbar(true);
        snackbarAnim.setValue(0);
        Animated.sequence([
            Animated.spring(snackbarAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 40,
                friction: 7,
            }),
            Animated.delay(2500),
            Animated.timing(snackbarAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            })
        ]).start(({ finished }) => {
            if (finished) {
                setShowSnackbar(false);
            }
        });
    };

    useEffect(() => {
        getSimulateRelease().then(val => setSimRelease(val));
    }, []);

    const handleToggleSimulateRelease = async (value) => {
        setSimRelease(value);
        await setSimulateRelease(value);
        showAlert(
            value ? "Release Mode" : "Debug Mode",
            value
                ? "App will now respect Firebase maintenance config. Restart the app for full effect."
                : "Firebase maintenance config will be ignored. Restart the app for full effect."
        );
    };

    const handleTestNotification = async () => {
        try {
            await notifee.requestPermission();
            const channelId = await notifee.createChannel({
                id: 'test-channel',
                name: 'Test Channel',
                importance: AndroidImportance.HIGH,
            });

            await notifee.displayNotification({
                title: 'Test Notification',
                body: 'This is a test notification from Developer Options 🚀',
                android: {
                    channelId,
                    smallIcon: 'ic_launcher_foreground',
                    pressAction: {
                        id: 'default',
                    },
                },
            });
        } catch (error) {
            console.error("Notification failed", error);
            showAlert("Error", "Failed to trigger notification: " + error.message);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle={theme.statusBarContent} />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Developer Options</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Build Mode Section */}
                <Text style={styles.sectionTitle}>Build Mode</Text>
                <View style={styles.card}>
                    <View style={styles.toggleItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconBox, { borderColor: simulateRelease ? theme.redAccent : theme.greenAccent }]}>
                                <Shield size={20} color={simulateRelease ? theme.redAccent : theme.greenAccent} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.menuItemTitle}>Simulate Release</Text>
                                <Text style={styles.menuItemSubtitle}>
                                    {simulateRelease
                                        ? 'Maintenance config is active'
                                        : 'Maintenance config is ignored'}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={simulateRelease}
                            onValueChange={handleToggleSimulateRelease}
                            trackColor={{ false: theme.switchTrackFalse, true: theme.switchTrackTrue }}
                            thumbColor={simulateRelease ? theme.redAccent : theme.greenAccent}
                        />
                    </View>
                    <View style={styles.buildModeIndicator}>
                        <View style={[styles.buildModeDot, { backgroundColor: simulateRelease ? theme.redAccent : theme.greenAccent }]} />
                        <Text style={[styles.buildModeText, { color: simulateRelease ? theme.redAccent : theme.greenAccent }]}>
                            {simulateRelease ? 'RELEASE BEHAVIOR' : 'DEBUG BEHAVIOR'}
                        </Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>System States</Text>
                <View style={styles.card}>
                    <DevMenuItem
                        icon={TrendingUp}
                        title="Force Update Modal"
                        subtitle="Test the mandatory update dialog"
                        color={theme.redAccent}
                        onPress={() => {
                            setIsForceUpdateTest(true);
                            setIsUpdateModalVisible(true);
                        }}
                        theme={theme}
                        styles={styles}
                    />
                    <DevMenuItem
                        icon={TrendingUp}
                        title="Soft Update Modal"
                        subtitle="Test the dismissable update dialog"
                        color={theme.greenAccent}
                        onPress={() => {
                            setIsForceUpdateTest(false);
                            setIsUpdateModalVisible(true);
                        }}
                        isLast={true}
                        theme={theme}
                        styles={styles}
                    />
                </View>

                <Text style={styles.sectionTitle}>Screen Previews</Text>
                <View style={styles.card}>
                    <DevMenuItem
                        icon={MapPin}
                        title="Trip Planner (Beta)"
                        subtitle="Route planning and charger finder"
                        onPress={() => navigation.navigate('TripPlanner')}
                        color="#E040FB"
                        isLast={true}
                        theme={theme}
                        styles={styles}
                    />
                </View>

                <Text style={styles.sectionTitle}>Testing Tools</Text>
                <View style={styles.card}>
                    <DevMenuItem
                        icon={FlaskConical}
                        title="Test Screen"
                        subtitle="Component & UI playground"
                        color={theme.greenAccent}
                        onPress={() => navigation.navigate('Test')}
                        theme={theme}
                        styles={styles}
                    />

                    <DevMenuItem
                        icon={Bell}
                        title="Test Notification"
                        subtitle="Trigger local alert"
                        color="#FF9800"
                        onPress={handleTestNotification}
                        isLast={true}
                        theme={theme}
                        styles={styles}
                    />
                </View>

                <Text style={styles.sectionTitle}>App Info</Text>
                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>Version: 1.0.0 (Dev)</Text>
                    <Text style={styles.infoText}>Build: {simulateRelease ? 'Debug (Simulating Release)' : 'Debug'}</Text>
                    <Text style={styles.infoText}>React Native: 0.83.1</Text>
                </View>

            </ScrollView>

            <UpdateRequiredModal
                visible={isUpdateModalVisible}
                isForce={isForceUpdateTest}
                onUpdate={() => setIsUpdateModalVisible(false)}
                onLater={() => setIsUpdateModalVisible(false)}
            />

            {showSnackbar && (
                <Animated.View
                    style={[
                        styles.snackbar,
                        {
                            opacity: snackbarAnim,
                            transform: [
                                {
                                    translateY: snackbarAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [100, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <Text style={styles.snackbarText}>In-Development, preview will be available soon.</Text>
                </Animated.View>
            )}

        </View>
    );
}

// Stylesheet generator based on theme colors
const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        marginBottom: 20,
        backgroundColor: theme.headerBackground,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.backBtnBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerTitle: {
        color: theme.headerTitle,
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        color: theme.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 10,
        marginTop: 24,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: theme.cardBackground,
        borderRadius: 16,
        paddingVertical: 5,
        borderWidth: 0,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.dividerColor,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme.iconBoxBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
    },
    textContainer: {
        justifyContent: 'center',
    },
    menuItemTitle: {
        color: theme.textPrimary,
        fontSize: 16,
        fontWeight: '500',
    },
    menuItemSubtitle: {
        color: theme.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    infoCard: {
        padding: 20,
        backgroundColor: theme.cardBackground,
        borderRadius: 16,
        borderWidth: 0,
        gap: 8,
    },
    infoText: {
        color: theme.textSecondary,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    toggleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 15,
    },
    buildModeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingBottom: 12,
        paddingTop: 4,
    },
    buildModeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    buildModeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    snackbar: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: theme.cardBackground,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.greenAccent,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 9999,
    },
    snackbarText: {
        color: theme.textPrimary,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
});
