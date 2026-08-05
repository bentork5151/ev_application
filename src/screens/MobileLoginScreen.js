import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Alert, ActivityIndicator, Platform, StatusBar, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, ChevronLeft, ArrowRight, Lock, Eye, EyeOff, Smartphone } from 'lucide-react-native';
import { useAlert } from '../context/AlertContext';
import { authApi, userApi } from '../services/api';
import { authService } from '../services/auth';
import { jwtDecode } from 'jwt-decode';
import PermissionConsentModal from '../components/PermissionConsentModal';
import { permissionService } from '../services/permissionService';

export default function MobileLoginScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();

    // UI State
    const [loading, setLoading] = useState(false);

    // Form Data
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const pendingNavRef = React.useRef(null);

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

    const handleLogin = async () => {
        // Basic validation
        if (!phoneNumber || phoneNumber.length < 10) {
            showAlert("Invalid Number", "Please enter a valid 10-digit mobile number.");
            return;
        }

        if (!password) {
            showAlert("Missing Password", "Please enter your password.");
            return;
        }

        setLoading(true);
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
            console.log("1. Starting Process Login Success...");

            // 1. Clear old data
            await authService.logout();

            // 2. Save new Token
            const token = response.token;
            if (!token) {
                console.error("No token in response:", response);
                throw new Error("No token received.");
            }
            console.log("2. Saving Token...");
            await authService.setToken(token);

            // 3. Construct initial User Data from Login Response
            const userObj = response.user || {};
            // Prefer top-level, then nested, then fallback
            let userData = {
                id: response.id || response.userId || userObj.id || userObj.userId,
                name: response.name || userObj.name || userObj.fullName,
                email: response.email || userObj.email,
                imageUrl: response.imageUrl || userObj.imageUrl,
                mobile: response.mobile || userObj.mobile || phoneNumber
            };

            console.log("3a. Initial User Data:", JSON.stringify(userData));

            // 3b. Decode Token to get extra details
            try {
                if (token) {
                    const decoded = jwtDecode(token);
                    console.log("3b. Decoded Token:", JSON.stringify(decoded));

                    // Merge decoded info if missing
                    userData.id = userData.id || decoded.sub || decoded.id || decoded.userId;
                    userData.name = userData.name || decoded.name || decoded.fullName;
                    userData.email = userData.email || decoded.email;
                    userData.mobile = userData.mobile || decoded.mobile || decoded.phone_number;

                    console.log("3c. Merged Token Data:", JSON.stringify(userData));
                    console.log(">>> USER EMAIL CHECK: ", userData.email ? userData.email : "NO EMAIL FOUND");
                }
            } catch (decodeErr) {
                console.warn("Token decoding failed:", decodeErr.message);
            }

            // 4. Fetch Full Profile ONLY if we have a valid, non-demo EMAIL
            try {
                if (userData.email && !userData.email.includes('demo') && !userData.email.includes('example')) {
                    console.log("4. Fetching full details using email:", userData.email);
                    const userDetails = await userApi.getUserDetails(userData.email);
                    // Merge details (API details take precedence)
                    userData = { ...userData, ...userDetails };
                    console.log("4b. Details merged:", JSON.stringify(userData));
                } else {
                    console.log("4. Skipping email fetch (No email or demo email)");
                }
            } catch (err) {
                console.warn("Failed to fetch user details by email:", err);
            }

            // Validation fallback
            if (!userData.name) {
                userData.name = `+91 ${phoneNumber}`;
            }

            // 5. Final Save
            console.log("5. Saving Final User Data to Storage:", JSON.stringify(userData));
            await authService.setUser(userData);

            // 5a. FCM Token Sync
            try {
                const { getFCMToken } = require('../services/fcmService');
                getFCMToken(); // Background sync
            } catch (fcmErr) {
                console.warn("FCM sync error after phone login:", fcmErr);
            }

            // Verify Save (Debug)
            const savedUser = await authService.getUser();
            console.log("6. Verified Saved User in Storage:", JSON.stringify(savedUser));

            if (!savedUser) {
                throw new Error("Failed to save user data to local storage.");
            }

            // 6. Navigation
            setLoading(false);

            // Check if Terms & Conditions have been accepted on this device
            const executeNav = async () => {
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

            const consentDone = await permissionService.hasCompletedConsent();
            if (!consentDone) {
                pendingNavRef.current = executeNav;
                setShowPermissionModal(true);
            } else {
                await executeNav();
            }

        } catch (error) {
            setLoading(false);
            console.error("Process Login Error:", error);
            showAlert("Login Error", "Failed to load user profile. Please try again.");
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
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
                    <Text style={styles.title}>Login with Phone</Text>
                    <Text style={styles.subtitle}>
                        Enter your mobile number and password to login.
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

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <View style={styles.btnContent}>
                                <Text style={styles.btnText}>Login</Text>
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
