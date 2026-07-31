import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Share, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Share2, Ticket } from 'lucide-react-native';
import { useAlert } from '../context/AlertContext';
import { referralApi } from '../services/api';
import { authService } from '../services/auth';
import ReferralSvg from '../assets/images/referral.svg';
import LoginRequiredDialog from '../components/LoginRequiredDialog';
import { useTheme } from '../context/ThemeContext';

export default function ReferralScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();
    const { theme, isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [referralCode, setReferralCode] = useState('');
    const [referralCodeInput, setReferralCodeInput] = useState('');
    const [referralInfo, setReferralInfo] = useState(null);

    const [isGuest, setIsGuest] = useState(false);
    const [loginPromptVisible, setLoginPromptVisible] = useState(false);

    useEffect(() => {
        const checkGuest = async () => {
            const guest = await authService.isGuestMode();
            setIsGuest(guest);
            if (guest) {
                setLoginPromptVisible(true);
            } else {
                loadReferralInfo();
            }
        };
        checkGuest();
    }, []);

    const loadReferralInfo = async () => {
        try {
            setLoading(true);
            const refInfo = await referralApi.getInfo();
            if (refInfo) {
                setReferralInfo(refInfo);
                setReferralCode(refInfo.referralCode || '');
            }
        } catch (error) {
            console.warn("Failed to fetch referral details:", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleShareReferral = async () => {
        const shareCode = referralCode || 'Join Bentork EV';
        try {
            await Share.share({
                message: `Join Bentork EV and energize your journey! Use my referral code: ${shareCode}`,
            });
        } catch (error) {
            console.error("Error sharing referral code:", error.message);
        }
    };

    const handleApplyCode = async () => {
        if (!referralCodeInput.trim()) return;
        try {
            setLoading(true);
            const res = await referralApi.applyCode(referralCodeInput.trim());
            showAlert("Success", res.message || "Referral code applied successfully!");
            setReferralCodeInput('');
            loadReferralInfo();
        } catch (error) {
            showAlert("Invalid Code", error.userMessage || "Please enter a valid referral code.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header & Banner unified top header area */}
                    <View style={styles.topHeaderArea}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.cardBg }]} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                                <ChevronLeft size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Referral Program</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        {/* Banner Section */}
                        <View style={styles.bannerRow}>
                            <View style={styles.bannerTextContainer}>
                                <Text style={[styles.bannerTitleText, { color: theme.textPrimary }]}>Refer Friends.</Text>
                                <Text style={[styles.bannerTitleText, styles.greenText]}>Earn Rewards.</Text>
                                <Text style={[styles.bannerSubText, { color: theme.textSecondary }]}>
                                    Invite your friend to join and earn exciting rewards when they do.
                                </Text>
                            </View>
                            <View style={styles.bannerImageContainer}>
                                <ReferralSvg width="140%" height={150} style={styles.bannerSvg} />
                            </View>
                        </View>
                    </View>

                    {/* Cards Container with spacing */}
                    <View style={styles.cardsContainer}>
                        {/* Share Code Card */}
                        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Share Your Code</Text>
                            <Text style={[styles.cardSubTitle, { color: theme.textSecondary }]}>Share Your Code with friends</Text>

                            <View style={[styles.codeContainer, { backgroundColor: isDark ? theme.background : '#FFFFFF', borderColor: theme.divider }]}>
                                {loading && !referralCode ? (
                                    <ActivityIndicator size="small" color="#00B074" />
                                ) : (
                                    <Text style={styles.codeText}>{referralCode || 'N/A'}</Text>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: theme.white }]}
                                onPress={handleShareReferral}
                                activeOpacity={0.8}
                            >
                                <Share2 size={18} color={theme.textPrimary} style={styles.btnIcon} />
                                <Text style={[styles.primaryBtnText, { color: theme.textPrimary }]}>Share Code</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Enter Code Card */}
                        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Enter Referral Code</Text>
                            <Text style={[styles.cardSubTitle, { color: theme.textSecondary }]}>Have a code from a friend? Enter it here.</Text>

                            <View style={[styles.inputContainer, { backgroundColor: theme.white }]}>
                                <Ticket size={20} color={theme.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.textPrimary }]}
                                    placeholder="Enter Code"
                                    placeholderTextColor={theme.placeholder}
                                    value={referralCodeInput}
                                    onChangeText={setReferralCodeInput}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                />
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.primaryBtn,
                                    { backgroundColor: theme.white },
                                    (!referralCodeInput.trim() || loading) && styles.disabledBtn
                                ]}
                                onPress={handleApplyCode}
                                disabled={!referralCodeInput.trim() || loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color={theme.textPrimary} />
                                ) : (
                                    <Text style={[styles.primaryBtnText, { color: theme.textPrimary }]}>Enter Code</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Login Required Dialog */}
            <LoginRequiredDialog
                visible={loginPromptVisible}
                contextMessage="Sign in to earn and redeem rewards"
                onLoginPress={() => {
                    setLoginPromptVisible(false);
                    navigation.replace('Login', {
                        returnRoute: 'Referral'
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
    topHeaderArea: {
        paddingHorizontal: 20,
        paddingBottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 10,
        marginTop: 10,
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
        flex: 1,
        textAlign: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    cardsContainer: {
        paddingHorizontal: 20,
        marginTop: 20,
    },
    bannerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 1,
        minHeight: 160,
    },
    bannerTextContainer: {
        flex: 1,
        paddingRight: 10,
    },
    bannerTitleText: {
        fontSize: 22,
        fontWeight: '900',
        lineHeight: 26,
    },
    greenText: {
        color: '#00B074',
    },
    bannerSubText: {
        fontSize: 12,
        marginTop: 6,
        lineHeight: 18,
        fontWeight: '600',
    },
    bannerImageContainer: {
        width: 140,
        height: 150,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    bannerSvg: {
        marginRight: -10,
        marginBottom: -33,
    },
    card: {
        borderRadius: 28,
        paddingVertical: 28,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    cardSubTitle: {
        fontSize: 12,
        marginTop: 4,
        marginBottom: 15,
        fontWeight: '600',
    },
    codeContainer: {
        height: 60,
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    codeText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#00B074',
        letterSpacing: 2,
    },
    primaryBtn: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledBtn: {
        opacity: 0.5,
    },
    btnIcon: {
        marginRight: 8,
    },
    primaryBtnText: {
        fontSize: 16,
        fontWeight: '900',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 28,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 15,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 15,
        fontWeight: '800',
        padding: 0,
    },
});
