import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, StatusBar, AppState, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, ShieldCheck, ChevronRight, Lock, Sun, Moon, Smartphone, Check, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlert } from '../context/AlertContext';
import PinPromptModal from '../components/PinPromptModal';
import ReactNativeBiometrics from 'react-native-biometrics';
import notifee from '@notifee/react-native';
import { useTheme } from '../context/ThemeContext';
import { authApi } from '../services/api';
import { authService } from '../services/auth';

export default function SettingsScreen({ navigation }) {
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();
    const { theme, themePreference, setTheme, isDark } = useTheme();

    // Settings States
    const [notifications, setNotifications] = useState(false);
    const [secureWallet, setSecureWallet] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [showPinVerifyModal, setShowPinVerifyModal] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);

    useEffect(() => {
        loadSettings();
        checkNotificationPermission();

        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                checkNotificationPermission();
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const checkNotificationPermission = async () => {
        try {
            const settings = await notifee.getNotificationSettings();
            setNotifications(settings.authorizationStatus === 1);
        } catch (e) {
            console.error("Failed to check notification permission:", e);
        }
    };

    const handleNotificationToggle = async () => {
        try {
            await notifee.openNotificationSettings();
        } catch (e) {
            console.error("Failed to open notification settings:", e);
        }
    };

    const loadSettings = async () => {
        try {
            const savedSecure = await AsyncStorage.getItem('secureWallet');
            if (savedSecure === 'true') {
                setSecureWallet(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleSecureWallet = async (value) => {
        if (value) {
            setShowPinModal(true);
        } else {
            try {
                const rnBiometrics = new ReactNativeBiometrics();
                const { available } = await rnBiometrics.isSensorAvailable();

                if (available) {
                    const { success } = await rnBiometrics.simplePrompt({ promptMessage: 'Confirm to disable Wallet Security' });
                    if (success) {
                        disableSecurity();
                    } else {
                        showAlert("Authentication Failed", "Would you like to use PIN instead?", [
                            { text: "No", style: "cancel" },
                            { text: "Use PIN", onPress: () => setShowPinVerifyModal(true) }
                        ]);
                    }
                } else {
                    setShowPinVerifyModal(true);
                }
            } catch (error) {
                console.log("Biometric Error:", error);
                setShowPinVerifyModal(true); 
            }
        }
    };

    const disableSecurity = async () => {
        setSecureWallet(false);
        await AsyncStorage.setItem('secureWallet', 'false');
        showAlert("Security Disabled", "Wallet security has been turned off.");
    };

    const handlePinVerifySuccess = () => {
        setShowPinVerifyModal(false);
        disableSecurity();
    };

    const handlePinSetSuccess = () => {
        setSecureWallet(true);
        setShowPinModal(false);
        showAlert("Success", "Wallet Security Enabled. You can use PIN or Biometrics (if available) to access your wallet.");
    };

    const handleSelectTheme = async (themePref) => {
        setTheme(themePref);
        setShowThemeModal(false);
    };

    const handleDeleteAccount = () => {
        showAlert(
            "Delete Account",
            "Are you sure you want to delete your account? This action will deactivate your profile and you will be logged out immediately.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await authApi.deleteAccount();
                            await authService.removeToken();
                            await authService.setUser(null);
                            showAlert("Account Deleted", "Your account has been deactivated successfully.", [
                                {
                                    text: "OK",
                                    onPress: () => {
                                        navigation.reset({
                                            index: 0,
                                            routes: [{ name: 'Login' }],
                                        });
                                    }
                                }
                            ]);
                        } catch (error) {
                            showAlert("Error", error?.userMessage || error?.message || "Failed to delete account. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const getThemeLabel = (pref) => {
        switch (pref) {
            case 'light': return 'Light';
            case 'dark': return 'Dark';
            default: return 'System default';
        }
    };

    const SettingItem = ({ icon: Icon, title, type = 'arrow', value, onValueChange, onPress, rightText }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={type === 'arrow' ? onPress : null}
            activeOpacity={type === 'arrow' ? 0.7 : 1}
        >
            <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.white }]}>
                    <Icon size={18} color={isDark ? '#FFFFFF' : '#1A1A1A'} />
                </View>
                <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>{title}</Text>
            </View>

            {type === 'switch' && (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: theme.divider, true: 'rgba(0, 176, 116, 0.5)' }}
                    thumbColor={value ? '#00B074' : (isDark ? '#5A6B7C' : '#FFFFFF')}
                />
            )}

            {type === 'arrow' && (
                <View style={styles.arrowRightContainer}>
                    {rightText && <Text style={[styles.rightText, { color: theme.textSecondary }]}>{rightText}</Text>}
                    <ChevronRight size={20} color={theme.textSecondary} />
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.cardBg }]} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Account Section */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account</Text>
                <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                    <SettingItem
                        icon={Lock}
                        title="Forgot Password"
                        onPress={() => navigation.navigate('ResetPassword')}
                    />
                    <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                    <TouchableOpacity
                        style={styles.item}
                        onPress={handleDeleteAccount}
                        activeOpacity={0.7}
                    >
                        <View style={styles.itemLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
                                <Trash2 size={18} color="#F44336" />
                            </View>
                            <Text style={[styles.itemTitle, { color: '#F44336', fontWeight: '600' }]}>Delete Account</Text>
                        </View>
                        <ChevronRight size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* General Options */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>General</Text>
                <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                    <SettingItem
                        icon={Bell}
                        title="Notifications"
                        type="switch"
                        value={notifications}
                        onValueChange={handleNotificationToggle}
                    />
                    <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                    <SettingItem
                        icon={Sun}
                        title="Theme"
                        type="arrow"
                        rightText={getThemeLabel(themePreference)}
                        onPress={() => setShowThemeModal(true)}
                    />
                </View>

                {/* Security Add-on */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Security</Text>
                <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                    <SettingItem
                        icon={ShieldCheck}
                        title="Secure Wallet"
                        type="switch"
                        value={secureWallet}
                        onValueChange={toggleSecureWallet}
                    />
                    {secureWallet && (
                        <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                            Wallet transactions will be protected by your device's default security (PIN, Fingerprint).
                        </Text>
                    )}
                </View>

            </ScrollView>

            {/* Theme Picker Modal */}
            <Modal
                visible={showThemeModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowThemeModal(false)}
            >
                <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: theme.overlayBg }]} activeOpacity={1} onPress={() => setShowThemeModal(false)}>
                    <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Choose Theme</Text>
                        
                        <TouchableOpacity style={styles.optionRow} onPress={() => handleSelectTheme('light')}>
                            <View style={styles.optionLeft}>
                                <View style={[styles.optionIconContainer, { backgroundColor: theme.white }]}>
                                    <Sun size={18} color={isDark ? '#FFFFFF' : '#1A1A1A'} />
                                </View>
                                <Text style={[styles.optionText, { color: theme.textPrimary }]}>Light</Text>
                            </View>
                            {themePreference === 'light' && <Check size={20} color="#00B074" />}
                        </TouchableOpacity>

                        <View style={[styles.modalDivider, { backgroundColor: theme.divider }]} />

                        <TouchableOpacity style={styles.optionRow} onPress={() => handleSelectTheme('dark')}>
                            <View style={styles.optionLeft}>
                                <View style={[styles.optionIconContainer, { backgroundColor: theme.white }]}>
                                    <Moon size={18} color={isDark ? '#FFFFFF' : '#1A1A1A'} />
                                </View>
                                <Text style={[styles.optionText, { color: theme.textPrimary }]}>Dark</Text>
                            </View>
                            {themePreference === 'dark' && <Check size={20} color="#00B074" />}
                        </TouchableOpacity>

                        <View style={[styles.modalDivider, { backgroundColor: theme.divider }]} />

                        <TouchableOpacity style={styles.optionRow} onPress={() => handleSelectTheme('system')}>
                            <View style={styles.optionLeft}>
                                <View style={[styles.optionIconContainer, { backgroundColor: theme.white }]}>
                                    <Smartphone size={18} color={isDark ? '#FFFFFF' : '#1A1A1A'} />
                                </View>
                                <Text style={[styles.optionText, { color: theme.textPrimary }]}>System default</Text>
                            </View>
                            {themePreference === 'system' && <Check size={20} color="#00B074" />}
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            <PinPromptModal
                visible={showPinModal}
                mode="set"
                onClose={() => setShowPinModal(false)}
                onSuccess={handlePinSetSuccess}
            />

            <PinPromptModal
                visible={showPinVerifyModal}
                mode="verify"
                title="Enter PIN to Disable"
                onClose={() => setShowPinVerifyModal(false)}
                onSuccess={handlePinVerifySuccess}
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
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
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        flex: 1,
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 10,
        marginTop: 10,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        borderRadius: 28,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    arrowRightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rightText: {
        marginRight: 8,
        fontSize: 14,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginLeft: 48,
    },
    helperText: {
        fontSize: 12,
        marginLeft: 48,
        marginTop: -10,
        marginBottom: 12,
        lineHeight: 18,
        fontWeight: '600',
    },
    // Theme modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        borderRadius: 28,
        padding: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 16,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    optionText: {
        fontSize: 15,
        fontWeight: '800',
    },
    modalDivider: {
        height: 1,
        marginLeft: 48,
    },
});
