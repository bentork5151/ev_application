import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, StatusBar, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, MapPin, Wifi, Bell, CheckCircle, ChevronLeft } from 'lucide-react-native';
import { authService } from '../services/auth';
import { useTheme } from '../context/ThemeContext';

export default function TermsConsentScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [accepting, setAccepting] = useState(false);
    const buttonScale = useRef(new Animated.Value(1)).current;

    // Read-only mode when accessed from SideMenu
    const readOnly = route?.params?.readOnly || false;

    // Where to go after accepting (passed as param from login/register flows)
    const nextScreen = route?.params?.nextScreen || 'Home';
    const nextParams = route?.params?.nextParams || {};

    const handleScroll = ({ nativeEvent }) => {
        if (readOnly) return;
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const paddingThreshold = 40;
        if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingThreshold) {
            setHasScrolledToBottom(true);
        }
    };

    const handleAccept = async () => {
        if (accepting) return;
        setAccepting(true);

        Animated.sequence([
            Animated.sequence([
                Animated.timing(buttonScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
                Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
            ])
        ]).start();

        try {
            await authService.setTermsAccepted();
        } catch (e) {
            console.warn('Failed to save TC acceptance:', e);
        }

        navigation.reset({
            index: 0,
            routes: [{ name: nextScreen, params: nextParams }],
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, readOnly && { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }]}>
                {readOnly ? (
                    <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.cardBg }]} onPress={() => navigation.goBack()}>
                        <ChevronLeft size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerIconContainer}>
                        <ShieldCheck size={28} color="#00B074" />
                    </View>
                )}
                <View style={readOnly ? { flex: 1, marginLeft: 12 } : { alignItems: 'center', width: '100%' }}>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }, readOnly && { textAlign: 'left', marginBottom: 0 }]}>
                        {readOnly ? 'Privacy Policy' : 'Before You Continue'}
                    </Text>
                    {!readOnly && (
                        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                            Please review how Bentork EV uses your data and device permissions.
                        </Text>
                    )}
                </View>
                {readOnly && <View style={{ width: 40 }} />}
            </View>

            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={true}
            >
                {/* Prominent Disclosure Card (Play Store Requirement) */}
                {!readOnly && (
                    <View style={[styles.disclosureCard, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.disclosureBadge}>
                            <Text style={styles.disclosureBadgeText}>IMPORTANT DATA DISCLOSURE</Text>
                        </View>

                        <Text style={[styles.disclosureHeading, { color: theme.textPrimary }]}>Location & Background Access</Text>
                        <Text style={[styles.disclosureBody, { color: theme.textSecondary }]}>
                            Bentork collects your <Text style={[styles.boldText, { color: theme.textPrimary }]}>precise location</Text>, including{' '}
                            <Text style={[styles.boldText, { color: theme.textPrimary }]}>background location</Text>, even when the app is minimized or not actively in use.
                        </Text>
                        <Text style={[styles.disclosureBody, { color: theme.textSecondary }]}>
                            Background location is required to support the following core feature:
                        </Text>

                        <View style={styles.purposeList}>
                            <View style={styles.purposeItem}>
                                <MapPin size={16} color="#00B074" style={styles.purposeIcon} />
                                <Text style={[styles.purposeText, { color: theme.textSecondary }]}>
                                    Continuous location tracking to provide real-time service functionality, ensuring uninterrupted service operation and accurate feature performance.
                                </Text>
                            </View>
                            <View style={styles.purposeItem}>
                                <Wifi size={16} color="#00B074" style={styles.purposeIcon} />
                                <Text style={[styles.purposeText, { color: theme.textSecondary }]}>
                                    Precise GPS location (latitude and longitude) and background location updates when enabled by the user.
                                </Text>
                            </View>
                            <View style={styles.purposeItem}>
                                <Bell size={16} color="#00B074" style={styles.purposeIcon} />
                                <Text style={[styles.purposeText, { color: theme.textSecondary }]}>
                                    We do not collect location data for advertising purposes. Disabling background location may limit certain core functionalities.
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.disclosureBody, { color: theme.textSecondary }]}>
                            Your location data is <Text style={[styles.boldText, { color: theme.textPrimary }]}>not sold to third parties</Text>. You may revoke location access at any time from your device{' '}
                            <Text style={[styles.boldText, { color: theme.textPrimary }]}>Settings → Apps → Bentork → Permissions</Text>.
                        </Text>
                    </View>
                )}

                {/* Privacy Policy Card Container */}
                <View style={[styles.policyCard, { backgroundColor: theme.cardBg }]}>
                    <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Privacy Policy</Text>
                    <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>Last Updated: 03/02/2026</Text>

                    <Text style={[styles.tcBody, { color: theme.textSecondary }]}>
                        Bentork respects your privacy and is committed to protecting your personal information. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data when using the Bentork mobile application.
                    </Text>

                    <View style={[styles.tcSection, { marginTop: 16 }]}>
                        <Text style={styles.tcTitle}>1. Information We Collect</Text>

                        <Text style={[styles.tcSubTitle, { color: theme.textPrimary }]}>A. Location Information (Precise – Foreground & Background)</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary }]}>
                            Our app collects precise location data, including when the app is running in the background, to support core functionality. We collect:
                        </Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Precise GPS location (latitude and longitude)</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Background location updates when enabled by the user</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary }]}>
                            We do not collect location data for advertising purposes. Users can disable location access at any time through device settings. Disabling background location may limit certain core functionalities.
                        </Text>

                        <Text style={[styles.tcSubTitle, { color: theme.textPrimary, marginTop: 12 }]}>B. Device Information</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary }]}>
                            We may collect limited device information including:
                        </Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Device model</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Operating system and version</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• App version</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Unique device identifiers (if applicable and permitted by Android policies)</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary }]}>
                            This information is used to ensure app security, prevent fraud and misuse, maintain session integrity, and improve performance and compatibility. We do not sell device information.
                        </Text>
                    </View>

                    <View style={styles.tcSection}>
                        <Text style={styles.tcTitle}>2. How We Use Information</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary }]}>We use collected information to:</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Provide, operate, and maintain Bentork services</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Enable core app features including background functionality</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Improve app performance and user experience</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Ensure security and prevent abuse</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Comply with legal obligations</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary, marginTop: 8 }]}>
                            We do not sell data to third parties.
                        </Text>
                    </View>

                    <View style={styles.tcSection}>
                        <Text style={styles.tcTitle}>3. Data Sharing</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary }]}>
                            We do not sell your personal information. We may share information only in the following situations:
                        </Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• With service providers who support app functionality (under confidentiality obligations)</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• If required by law or regulatory authority</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• To protect legal rights, safety, and prevent fraud</Text>
                    </View>

                    <View style={styles.tcSection}>
                        <Text style={styles.tcTitle}>4. Data Retention</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary }]}>
                            We retain personal data only for as long as necessary to provide services, comply with legal requirements, resolve disputes, and enforce agreements. Users may request deletion of their personal data by contacting us.
                        </Text>
                    </View>

                    <View style={styles.tcSection}>
                        <Text style={styles.tcTitle}>5. User Rights</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary }]}>You may:</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Access your data</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Request correction</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Request deletion</Text>
                        <Text style={[styles.tcBullet, { color: theme.textSecondary }]}>• Withdraw location permission at any time via device settings</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary, marginTop: 8 }]}>
                            To exercise your rights, contact us at the email below.
                        </Text>
                    </View>

                    <View style={styles.tcSection}>
                        <Text style={styles.tcTitle}>6. Security</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary }]}>
                            We implement appropriate technical and organizational measures to protect your data from unauthorized access, alteration, disclosure, or destruction.
                        </Text>
                    </View>

                    <View style={styles.tcSection}>
                        <Text style={styles.tcTitle}>7. Children's Privacy</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary }]}>
                            Bentork does not knowingly collect personal information from children under 13 years of age. If we become aware of such collection, we will delete the information promptly.
                        </Text>
                    </View>

                    <View style={styles.tcSection}>
                        <Text style={styles.tcTitle}>8. Changes to This Privacy Policy</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary }]}>
                            We may update this Privacy Policy periodically. Any changes will be reflected by updating the "Last Updated" date above.
                        </Text>
                    </View>

                    <View style={[styles.tcSection, { marginBottom: 0 }]}>
                        <Text style={styles.tcTitle}>9. Contact Us</Text>
                        <Text style={[styles.tcBody, { color: theme.textSecondary }]}>
                            If you have questions about this Privacy Policy, contact us at:
                        </Text>
                        <Text
                            style={[styles.link, { marginTop: 6 }]}
                            onPress={() => Linking.openURL('mailto:support@bentork.com')}
                        >
                            support@bentork.com
                        </Text>
                        <Text
                            style={[styles.link, { marginTop: 4 }]}
                            onPress={() => Linking.openURL('https://bentork.com')}
                        >
                            https://bentork.com
                        </Text>
                    </View>
                </View>

                {/* Scroll Hint */}
                {!readOnly && !hasScrolledToBottom && (
                    <View style={styles.scrollHint}>
                        <Text style={[styles.scrollHintText, { color: theme.textSecondary }]}>↓ Scroll down to read all terms</Text>
                    </View>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>

            {/* Footer Consent Buttons */}
            {!readOnly && (
                <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.divider, paddingBottom: insets.bottom + 16 }]}>
                    <Text style={[styles.consentNote, { color: theme.textSecondary }]}>
                        By continuing, you confirm that you have read, understood and agree to the disclosures and Privacy Policy.
                    </Text>

                    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                        <TouchableOpacity
                            style={[
                                styles.acceptBtn,
                                { backgroundColor: theme.white },
                                !hasScrolledToBottom && [styles.acceptBtnDimmed, { backgroundColor: theme.divider }]
                            ]}
                            onPress={handleAccept}
                            disabled={accepting}
                            activeOpacity={0.85}
                        >
                            <CheckCircle size={20} color={theme.textPrimary} style={{ marginRight: 8 }} />
                            <Text style={[styles.acceptBtnText, { color: theme.textPrimary }]}>
                                {accepting ? 'Saving...' : 'I Accept & Continue'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {!hasScrolledToBottom && (
                        <Text style={[styles.scrollToAcceptHint, { color: theme.textSecondary }]}>
                            Scroll to the bottom to enable this button
                        </Text>
                    )}
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
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0, 176, 116, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    disclosureCard: {
        borderRadius: 28,
        padding: 20,
        marginBottom: 24,
    },
    disclosureBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0, 176, 116, 0.1)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginBottom: 12,
    },
    disclosureBadgeText: {
        color: '#00B074',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    disclosureHeading: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 8,
    },
    disclosureBody: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 10,
    },
    boldText: {
        fontWeight: '900',
    },
    purposeList: {
        marginVertical: 8,
        gap: 10,
    },
    purposeItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    purposeIcon: {
        marginRight: 10,
        marginTop: 2,
    },
    purposeText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 21,
    },
    policyCard: {
        borderRadius: 28,
        padding: 24,
    },
    sectionHeading: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 4,
    },
    lastUpdated: {
        fontSize: 12,
        fontStyle: 'italic',
        marginBottom: 20,
    },
    tcSection: {
        marginBottom: 20,
    },
    tcTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#00B074',
        marginBottom: 6,
    },
    tcBody: {
        fontSize: 14,
        lineHeight: 22,
    },
    tcSubTitle: {
        fontSize: 13,
        fontWeight: '850',
        marginTop: 10,
        marginBottom: 4,
    },
    tcBullet: {
        fontSize: 14,
        lineHeight: 22,
        marginLeft: 6,
        marginBottom: 2,
    },
    link: {
        color: '#00B074',
        textDecorationLine: 'underline',
        fontWeight: '700',
    },
    scrollHint: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    scrollHintText: {
        fontSize: 13,
        fontStyle: 'italic',
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    consentNote: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 14,
    },
    acceptBtn: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptBtnDimmed: {
        opacity: 0.6,
    },
    acceptBtnText: {
        fontSize: 16,
        fontWeight: '900',
    },
    scrollToAcceptHint: {
        textAlign: 'center',
        fontSize: 12,
        marginTop: 8,
        fontStyle: 'italic',
    },
});
