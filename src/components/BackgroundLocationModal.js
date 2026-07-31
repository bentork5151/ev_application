import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, PermissionsAndroid, Linking, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Navigation, Bolt } from 'lucide-react-native';
import { authService } from '../services/auth';
import { useTheme } from '../context/ThemeContext';

export default function BackgroundLocationModal({ visible, onDone }) {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(progress, {
            toValue: visible ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    const overlayStyle = {
        opacity: progress,
    };

    const cardStyle = {
        opacity: progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
        }),
        transform: [
            {
                translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                }),
            },
            {
                scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                }),
            },
        ],
    };

    const handleAllow = async () => {
        await authService.setBgLocationConsentShown();

        if (Platform.OS === 'android') {
            try {
                const fgGranted = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );

                if (!fgGranted) {
                    await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                    );
                }

                if (Platform.Version >= 29) {
                    await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
                    );
                }
            } catch (err) {
                console.warn('Background location permission error:', err);
            }
        }

        onDone?.();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={() => {}}
        >
            <Animated.View style={[styles.overlay, { backgroundColor: theme.overlayBg }, overlayStyle]}>
                <Animated.View style={[styles.card, { backgroundColor: theme.background }, cardStyle]}>
                    {/* Icon Badge */}
                    <View style={[styles.iconBadge, { backgroundColor: theme.white }]}>
                        <Navigation size={26} color={theme.textPrimary} />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: theme.textPrimary }]}>Background Location Access</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        Allow Bentork EV to access your location{' '}
                        <Text style={[styles.highlight, { color: theme.textPrimary }]}>even when the app is closed</Text>
                    </Text>

                    {/* Feature list */}
                    <View style={styles.featureList}>
                        <FeatureRow
                            Icon={MapPin}
                            text="Find the nearest available charger in real time"
                        />
                        <FeatureRow
                            Icon={Bolt}
                            text="Monitor your charging session and notify you when it's complete"
                        />
                        <FeatureRow
                            Icon={Navigation}
                            text="Auto-detect your arrival and departure at stations"
                        />
                    </View>

                    {/* Privacy note */}
                    <Text style={[styles.privacyNote, { color: theme.textSecondary }]}>
                        Your location is{' '}
                        <Text style={[styles.privacyHighlight, { color: theme.textPrimary }]}>never sold to third parties</Text>
                        {' '}and is processed per our{' '}
                        <Text
                            style={styles.link}
                            onPress={() => Linking.openURL('https://bentork.in/privacy-policy')}
                        >
                            Privacy Policy
                        </Text>
                        .{'\n'}You can revoke access anytime in{' '}
                        <Text style={[styles.privacyHighlight, { color: theme.textPrimary }]}>Settings → Apps → Bentork EV → Permissions</Text>.
                    </Text>

                    {/* CTA buttons */}
                    <TouchableOpacity
                        style={[styles.allowBtn, { backgroundColor: theme.white }]}
                        onPress={handleAllow}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.allowBtnText, { color: theme.textPrimary }]}>Allow Access</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

function FeatureRow({ Icon, text }) {
    const { theme } = useTheme();
    return (
        <View style={styles.featureRow}>
            <View style={[styles.featureIconWrap, { backgroundColor: theme.white }]}>
                <Icon size={15} color={theme.textPrimary} />
            </View>
            <Text style={[styles.featureText, { color: theme.textPrimary }]}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 28,
        padding: 28,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    iconBadge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        alignSelf: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 22,
        fontWeight: '600',
    },
    highlight: {
        fontWeight: '800',
    },
    featureList: {
        gap: 12,
        marginBottom: 20,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    featureIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    featureText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 21,
        fontWeight: '800',
    },
    privacyNote: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 22,
        fontWeight: '600',
    },
    privacyHighlight: {
        fontWeight: '700',
    },
    link: {
        color: '#00B074',
        textDecorationLine: 'underline',
        fontWeight: '800',
    },
    allowBtn: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    allowBtnText: {
        fontSize: 16,
        fontWeight: '900',
    },
});
