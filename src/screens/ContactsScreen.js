import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, Mail, MessageSquare, HelpCircle, ChevronRight } from 'lucide-react-native';
import { authService } from '../services/auth';
import { useAlert } from '../context/AlertContext';
import { useTheme } from '../context/ThemeContext';

export default function ContactsScreen({ navigation }) {
    const { theme, isDark } = useTheme();
    const { showAlert } = useAlert();
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await authService.getUser();
            setUser(userData);
        } catch (error) {
            console.log("Failed to load user info:", error);
        }
    };

    const handleCallSupport = () => {
        Linking.openURL('tel:+918237943808').catch(() => {
            showAlert("Error", "Unable to launch dialer. Please call +91 82379 43808 directly.");
        });
    };

    const handleEmailSupport = () => {
        const subject = encodeURIComponent(`[Bentork Support] Support Query`);
        const body = encodeURIComponent(
            `Hi Bentork Support Team,\n\nI have a support query.\n\n` +
            (user ? `User Details:\nName: ${user.name || 'N/A'}\nEmail: ${user.email || 'N/A'}\n\n` : '') +
            `Sent from Bentork EV App`
        );
        Linking.openURL(`mailto:support@bentork.com?subject=${subject}&body=${body}`).catch(() => {
            showAlert("Error", "Unable to open email client. Please email support@bentork.com directly.");
        });
    };

    const handleWhatsAppSupport = () => {
        const whatsappMsg = encodeURIComponent(
            `Hi Bentork Support team, I have a support query.`
        );
        Linking.openURL(`https://wa.me/918237943808?text=${whatsappMsg}`).catch(() => {
            showAlert("Error", "Unable to launch WhatsApp. Please contact +91 82379 43808.");
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.cardBg }]} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Help & Support Center</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Welcome Banner */}
                    <View style={styles.welcomeSection}>
                        <Text style={[styles.welcomeTitle, { color: theme.textPrimary }]}>{user?.name ? `How can we help, ${user.name.split(' ')[0]}?` : 'How can we help you?'}</Text>
                        <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>Select a category below or contact our official team channels. Available 24/7.</Text>
                    </View>

                    {/* Support Channels Grid */}
                    <View style={styles.gridContainer}>
                        {/* Phone Card */}
                        <TouchableOpacity style={[styles.channelCard, { backgroundColor: theme.cardBg }]} onPress={handleCallSupport} activeOpacity={0.8}>
                            <View style={[styles.iconBox, { backgroundColor: theme.white }]}>
                                <Phone size={20} color="#00B074" />
                            </View>
                            <Text style={[styles.cardMainLabel, { color: theme.textSecondary }]}>Call Helpline</Text>
                            <Text style={[styles.cardValue, { color: theme.textPrimary }]} numberOfLines={1}>+91 82379 43808</Text>
                        </TouchableOpacity>

                        {/* Email Card */}
                        <TouchableOpacity style={[styles.channelCard, { backgroundColor: theme.cardBg }]} onPress={handleEmailSupport} activeOpacity={0.8}>
                            <View style={[styles.iconBox, { backgroundColor: theme.white }]}>
                                <Mail size={20} color="#00B074" />
                            </View>
                            <Text style={[styles.cardMainLabel, { color: theme.textSecondary }]}>Email Support</Text>
                            <Text style={[styles.cardValue, { color: theme.textPrimary }]} numberOfLines={1}>support@bentork.com</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Support Interactive Options List */}
                    <View style={[styles.listCard, { backgroundColor: theme.cardBg }]}>
                        <TouchableOpacity style={styles.listItem} onPress={handleWhatsAppSupport} activeOpacity={0.7}>
                            <View style={[styles.listIconBox, { backgroundColor: 'rgba(0, 176, 116, 0.1)' }]}>
                                <MessageSquare size={18} color="#00B074" />
                            </View>
                            <View style={styles.listContent}>
                                <Text style={[styles.listTitle, { color: theme.textPrimary }]}>Chat on WhatsApp</Text>
                                <Text style={[styles.listSubText, { color: theme.textSecondary }]}>Instant chat support and queries</Text>
                            </View>
                            <ChevronRight size={18} color={theme.textSecondary} />
                        </TouchableOpacity>

                        <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

                        <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('FAQ')} activeOpacity={0.7}>
                            <View style={[styles.listIconBox, { backgroundColor: 'rgba(255, 167, 38, 0.1)' }]}>
                                <HelpCircle size={18} color="#FFA726" />
                            </View>
                            <View style={styles.listContent}>
                                <Text style={[styles.listTitle, { color: theme.textPrimary }]}>Browse FAQs</Text>
                                <Text style={[styles.listSubText, { color: theme.textSecondary }]}>Search solved problems immediately</Text>
                            </View>
                            <ChevronRight size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 15,
    },
    welcomeSection: {
        marginBottom: 20,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: '900',
        marginTop: 6,
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
    gridContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    channelCard: {
        flex: 1,
        borderRadius: 28,
        padding: 16,
        alignItems: 'flex-start',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardMainLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 13,
        fontWeight: '900',
        marginBottom: 4,
    },
    listCard: {
        borderRadius: 28,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    listIconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    listContent: {
        flex: 1,
    },
    listTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    listSubText: {
        fontSize: 11,
        marginTop: 2,
    },
    listDivider: {
        height: 1,
    },
});
