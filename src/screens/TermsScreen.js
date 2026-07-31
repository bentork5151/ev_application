import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function TermsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.cardBg }]} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Terms & Conditions</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>Last updated: January 2026</Text>

                {/* Terms Main Container Card */}
                <View style={[styles.termsCard, { backgroundColor: theme.cardBg }]}>
                    
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>1. Introduction</Text>
                        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
                            Welcome to Bentork EV. These Terms and Conditions govern your use of our mobile application and charging services. By using our app, you agree to these terms.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>2. Account Registration</Text>
                        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
                            To use our services, you must register accurately. You are responsible for maintaining the confidentiality of your account credentials.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>3. Charging Services</Text>
                        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
                            Our app allows you to locate and use EV charging stations. Pricing and availability may vary. You agree to pay all applicable fees for charging sessions initiated through your account.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>4. Wallet & Payments</Text>
                        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
                            You may maintain a wallet balance for payments. Refunds are processed according to our Refund Policy. We use secure third-party payment gateways.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>5. User Conduct</Text>
                        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
                            You agree to use the charging stations responsibly and safely. Any damage caused by negligence may result in liability.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>6. Privacy</Text>
                        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
                            Your data is handled according to our Privacy Policy. We value your privacy and only collect necessary information for service delivery.
                        </Text>
                    </View>

                    <View style={[styles.section, { marginBottom: 0 }]}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>7. Changes to Terms</Text>
                        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
                            We reserve the right to modify these terms at any time. Continued use of the app constitutes acceptance of new terms.
                        </Text>
                    </View>
                    
                </View>
                <View style={{ height: 20 }} />
            </ScrollView>
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
        textAlign: 'center',
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    lastUpdated: {
        fontSize: 13,
        marginBottom: 20,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    termsCard: {
        borderRadius: 28,
        padding: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '500',
        textAlign: 'justify',
    },
});
