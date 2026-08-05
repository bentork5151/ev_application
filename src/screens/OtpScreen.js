import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Alert, ActivityIndicator, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, ChevronLeft, ArrowRight, Lock, Eye, EyeOff, Smartphone } from 'lucide-react-native';
import { useAlert } from '../context/AlertContext';
import { authApi, userApi } from '../services/api';
import { authService } from '../services/auth';
import PermissionConsentModal from '../components/PermissionConsentModal';
import { permissionService } from '../services/permissionService';

export default function OtpScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();
    const googleUser = route.params?.googleUser;

    const checkAndShowDeactivatedDialog = (error, defaultTitle = "Login Failed", defaultMsg = "Invalid credentials.") => {
        const rawMsg = error?.userMessage || error?.response?.data?.message || error?.message || "";
        const lowerMsg = rawMsg.toLowerCase();
        const status = error?.response?.status;
        const isDeactivated = lowerMsg.includes("deactivated") || 
                              lowerMsg.includes("disabled") || 
                              lowerMsg.includes("runtime error") || 
                              status === 500;

        if (isDeactivated) {
            showAlert(
                "Account Deactivated",
                "Your account has been deactivated. If you believe this is an error or wish to reactivate your account, please contact our support team.",
                [
                    { text: "OK", style: "cancel" },
                    {
                        text: "Contact Support",
                        onPress: () => {
                            Linking.openURL('mailto:support@bentork.com?subject=Deactivated%20Account%20Reactivation');
                        }
                    }
                ]
            );
            return true;
        }
        showAlert(defaultTitle, rawMsg || defaultMsg);
        return false;
    };

    // UI State
    const [loading, setLoading] = useState(false);

    // Form Data
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const pendingNavRef = React.useRef(null);

    const handleAction = async () => {
        // Basic validation
        if (!phoneNumber || phoneNumber.length < 10) {
            showAlert("Invalid Number", "Please enter a valid 10-digit mobile number.");
            return;
        }

        if (!googleUser && !password) {
            showAlert("Missing Password", "Please enter your password.");
            return;
        }

        setLoading(true);

        // CASE 1: Google User - Register DIRECTLY
        if (googleUser) {
            console.log("Completing Google Sign Up for:", googleUser.email, "Mobile:", phoneNumber);

            // Generate a random strong password for the user since they use Google Login
            const randomPassword = `Google_${Math.random().toString(36).slice(-8)}!A1`;

            try {
                const response = await authApi.register({
                    name: googleUser.name || 'Google User',
                    email: googleUser.email,
                    mobile: phoneNumber,
                    password: randomPassword,
                    confirmPassword: randomPassword
                });

                console.log("Registration Success:", response);
                setLoading(false);

                // If the response includes a token, we can auto-login the user
                if (response && response.token) {
                    await authService.setToken(response.token);
                    const userData = {
                        id: response.id || response.userId,
                        name: response.name || googleUser.name || 'Google User',
                        email: response.email || googleUser.email,
                        mobile: response.mobile || phoneNumber
                    };
                    await authService.setUser(userData);

                    // Navigate to target or Home
                    const executeNav = async () => {
                        const { postLoginTarget: plt, postLoginParams: plp } = route.params || {};
                        const tcAccepted = await authService.hasAcceptedTerms();
                        if (plt) {
                            if (!tcAccepted) {
                                navigation.reset({
                                    index: 0,
                                    routes: [{ name: 'TermsConsent', params: { nextScreen: plt, nextParams: plp } }]
                                });
                            } else {
                                navigation.replace(plt, plp);
                            }
                        } else if (!tcAccepted) {
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'TermsConsent', params: { nextScreen: 'Home' } }],
                            });
                        } else {
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Home' }],
                            });
                        }
                    };

                    const consentDone = await permissionService.hasCompletedConsent();
                    if (!consentDone) {
                        pendingNavRef.current = executeNav;
                        setShowPermissionModal(true);
                    } else {
                        await executeNav();
                    }
                } else {
                    showAlert(
                        "Registration Successful",
                        "Your account was created successfully, but no session token was received. Please log in using Google Sign-In.",
                        [{
                            text: "Go to Login",
                            onPress: () => {
                                navigation.reset({
                                    index: 0,
                                    routes: [{ name: 'Login' }]
                                });
                            }
                        }]
                    );
                }
            } catch (error) {
                setLoading(false);
                console.error("Registration Failed:", error);
                const msg = error.userMessage || error.response?.data || "Registration failed. Please try again.";
                showAlert("Error", typeof msg === 'string' ? msg : JSON.stringify(msg));
            }
            return;
        }

        // CASE 2: Phone Number + Password Login
        console.log("Attempting Phone Login for:", phoneNumber);

        try {
            const response = await authApi.login(phoneNumber, password);

            if (response && response.token) {
                await processLoginSuccess(response);
            } else {
                throw new Error("Invalid response from server.");
            }
        } catch (error) {
            setLoading(false);
            console.error("Phone Login Failed:", error);
            checkAndShowDeactivatedDialog(error, "Login Failed", "Invalid credentials.");
        }
    };

    const processLoginSuccess = async (response) => {
        try {
            // 1. Clear old data
            await authService.logout();

            // 2. Save new Token
            const token = response.token;
            if (!token) {
                throw new Error("No token received.");
            }
            await authService.setToken(token);

            // 3. Get User Details
            let userData = {
                id: response.id || response.userId,
                name: response.name,
                email: response.email,
                imageUrl: response.imageUrl,
                mobile: response.mobile
            };

            // If critical data is missing, try to fetch using mobile/email if available
            // IMPORTANT: Phone login might not return email in immediate response if it's minimal
            if (!userData.name) {
                try {
                    // Try fetching by Email first if we have it
                    if (userData.email) {
                        const userDetails = await userApi.getUserDetails(userData.email);
                        userData = { ...userData, ...userDetails };
                    }
                    // If no email in response, but we have phone number input
                    else if (phoneNumber) {
                        try {
                            // Try to get details by mobile - assuming API supports it or we can find another way
                            // The current userApi.getUserDetails takes 'email'. 
                            // If backend supports getByMobile, we should use that. 
                            // If not, we might only have partial data.

                            // Let's assume for now we might need to rely on what we have 
                            // OR try to fetch by mobile if we add that endpoint support.
                            // Since we can't change backend, we must rely on what login returns.

                            // However, 'authApi.login' usually returns full user object. 
                            // If it's returning partial, maybe we can use a different call.

                            // FALLBACK: If we really can't get name, use Mobile as name
                            if (!userData.name) userData.name = phoneNumber;
                        } catch (e) {
                            console.warn("Could not fetch details by mobile");
                        }
                    }
                } catch (err) {
                    console.warn("Failed to fetch user details after login:", err);
                }
            }

            // Ensure we at least have an ID and some Identifier
            if (!userData.id) {
                // Try to decode token if we had a library, but we don't.
                // We must rely on response.id
                console.warn("Login response missing User ID");
            }

            await authService.setUser(userData);

            // 4. FCM Token Sync (Send to Backend)
            try {
                const { registerFCM } = require('../services/fcmService');
                registerFCM(); // Run in background
            } catch (fcmErr) {
                console.warn("FCM sync error after OTP login:", fcmErr);
            }

            // 5. Navigation
            setLoading(false);

            // Check T&C acceptance before navigating
            const executeNav2 = async () => {
                const tcAccepted = await authService.hasAcceptedTerms();
                if (!tcAccepted) {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'TermsConsent', params: { nextScreen: 'Home' } }],
                    });
                } else {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                    });
                }
            };

            const consentDone2 = await permissionService.hasCompletedConsent();
            if (!consentDone2) {
                pendingNavRef.current = executeNav2;
                setShowPermissionModal(true);
            } else {
                await executeNav2();
            }

        } catch (error) {
            setLoading(false);
            showAlert("Login Error", "Failed to process login session.");
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                >
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>

                {/* Header Content */}
                <View style={styles.headerContainer}>
                    <View style={styles.iconCircle}>
                        <Smartphone size={32} color="#39E29B" />
                    </View>
                    <Text style={styles.title}>
                        {googleUser ? "Complete Profile" : "Login with Phone"}
                    </Text>
                    <Text style={styles.subtitle}>
                        {googleUser
                            ? "Please enter your mobile number to complete registration."
                            : "Enter your mobile number and password to login."
                        }
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.formContainer}>
                    <Text style={styles.inputLabel}>Mobile Number</Text>
                    <View style={styles.inputWrapper}>
                        <Phone size={20} color="#888" style={styles.inputIcon} />
                        <Text style={styles.countryCode}>+91</Text>
                        <View style={styles.verticalDivider} />
                        <TextInput
                            style={styles.input}
                            placeholder="00000 00000"
                            placeholderTextColor="#666"
                            value={phoneNumber}
                            onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            maxLength={10}
                        />
                    </View>

                    {/* Password Input (Only for Login) */}
                    {!googleUser && (
                        <>
                            <Text style={styles.inputLabel}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={20} color="#888" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor="#666"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <EyeOff size={20} color="#888" />
                                    ) : (
                                        <Eye size={20} color="#888" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={handleAction}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <View style={styles.btnContent}>
                                <Text style={styles.btnText}>{googleUser ? "Complete Sign Up" : "Login"}</Text>
                                <ArrowRight size={20} color="#000" style={{ marginLeft: 8 }} />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <PermissionConsentModal
                visible={showPermissionModal}
                onComplete={async () => {
                    setShowPermissionModal(false);
                    if (pendingNavRef.current) {
                        const navFn = pendingNavRef.current;
                        pendingNavRef.current = null;
                        await navFn();
                    } else {
                        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                    }
                }}
                onSkip={async () => {
                    setShowPermissionModal(false);
                    if (pendingNavRef.current) {
                        const navFn = pendingNavRef.current;
                        pendingNavRef.current = null;
                        await navFn();
                    } else {
                        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                    }
                }}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        alignSelf: 'flex-start',
    },
    headerContainer: {
        marginBottom: 32,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(57, 226, 155, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(57, 226, 155, 0.2)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        lineHeight: 24,
    },
    formContainer: {
        width: '100%',
    },
    inputLabel: {
        color: '#ccc',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#333',
    },
    inputIcon: {
        marginRight: 10,
    },
    countryCode: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 10,
    },
    verticalDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#444',
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        height: '100%',
    },
    actionBtn: {
        backgroundColor: '#39E29B',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#39E29B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    btnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

