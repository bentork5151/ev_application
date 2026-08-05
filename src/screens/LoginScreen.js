import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Linking } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { authService } from '../services/auth';
import { authApi, userApi } from '../services/api';
import { GOOGLE_WEB_CLIENT_ID, TRUECALLER_ANDROID_CLIENT_ID } from '@env';
import { Mail, Lock, Eye, EyeOff, Smartphone, Phone, ArrowRight } from 'lucide-react-native';
import { useAlert } from '../context/AlertContext';
import { useTruecaller } from '@ajitpatel28/react-native-truecaller';
import LinearGradient from 'react-native-linear-gradient';

import { useTheme } from '../context/ThemeContext';
import PermissionConsentModal from '../components/PermissionConsentModal';
import { permissionService } from '../services/permissionService';

export default function LoginScreen({ navigation, route }) {
    const { showAlert } = useAlert();
    const { theme, isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [truecallerAvailable, setTruecallerAvailable] = useState(null); // null = unknown, true/false after check
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const pendingNavRef = React.useRef(null);

    const {
        initializeTruecallerSDK,
        openTruecallerForVerification,
        isSdkUsable,
        userProfile,
        error: truecallerError,
    } = useTruecaller({
        androidClientId: TRUECALLER_ANDROID_CLIENT_ID,
        androidSuccessHandler: (data) => {
            console.log('Truecaller SDK raw response:', JSON.stringify(data, null, 2));
            handleBackendTruecallerLogin({
                authorizationCode: data.authorizationCode,
                codeVerifier: data.codeVerifier,
                firstName: data.given_name,
                lastName: data.family_name,
                phoneNumber: data.phone_number,
                countryCode: data.phone_number_country_code,
                email: data.email,
                gender: data.gender,
            });
        }
    });

    useEffect(() => {
        if (truecallerError) {
            console.warn("Truecaller SDK Error:", truecallerError);
            showAlert("Truecaller Error", truecallerError);
        }
    }, [truecallerError]);

    useEffect(() => {
        if (TRUECALLER_ANDROID_CLIENT_ID && !TRUECALLER_ANDROID_CLIENT_ID.includes('YOUR_TRUECALLER_CLIENT_ID')) {
            initializeTruecallerSDK()
                .then(() => console.log('Truecaller SDK Initialized'))
                .then(() => isSdkUsable().then(setTruecallerAvailable))
                .catch((err) => console.warn('Truecaller SDK Init failed:', err));
        }
    }, [initializeTruecallerSDK]);

    useEffect(() => {
        if (Platform.OS === 'ios' && userProfile) {
            handleBackendTruecallerLogin({
                firstName: userProfile.firstName,
                lastName: userProfile.lastName,
                phoneNumber: userProfile.phoneNumber,
                countryCode: userProfile.countryCode,
                email: userProfile.email,
                gender: userProfile.gender,
            });
        }
    }, [userProfile]);

    const checkAndShowDeactivatedDialog = (error, defaultTitle = "Login Failed", defaultMsg = "Invalid email or password.") => {
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

    const handleBackendTruecallerLogin = async (payload) => {
        setLoading(true);
        try {
            console.log("Exchanging Truecaller verification details with backend...");
            const response = await authApi.truecallerLogin(payload);
            if (response && response.token) {
                await processLoginSuccess(response);
            } else {
                showAlert("Login Failed", "No token received from server.");
            }
        } catch (error) {
            console.error("Backend Truecaller login error:", error);
            const serverMsg = error.response?.data?.message || error.userMessage || '';
            const isExistingUser =
                serverMsg.toLowerCase().includes('already exists') ||
                serverMsg.toLowerCase().includes('database access error') ||
                serverMsg.toLowerCase().includes('email already');

            if (isExistingUser) {
                showAlert(
                    "Account Already Linked",
                    "This account is already registered. To keep your data safe, please log in using Google or your Email & Password."
                );
            } else {
                checkAndShowDeactivatedDialog(error, "Login Failed", "Server Error during Truecaller Login");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleTruecallerSignIn = async () => {
        console.log("Truecaller Client ID loaded in bundle:", TRUECALLER_ANDROID_CLIENT_ID);
        if (!TRUECALLER_ANDROID_CLIENT_ID || TRUECALLER_ANDROID_CLIENT_ID.includes('YOUR_TRUECALLER_CLIENT_ID')) {
            showAlert("Configuration Missing", "Truecaller is not configured on this build.");
            return;
        }

        try {
            const usable = await isSdkUsable();
            if (usable) {
                await openTruecallerForVerification();
            } else {
                showAlert("Truecaller Unavailable", "Truecaller app is not installed or configured on this device.");
            }
        } catch (err) {
            console.error("Truecaller sign in execution failed:", err);
            showAlert("Truecaller Error", err.message || "Failed to start Truecaller verification.");
        }
    };

    useEffect(() => {
        const clientId = GOOGLE_WEB_CLIENT_ID;
        if (!clientId || clientId.length < 10) {
            console.warn("GOOGLE_WEB_CLIENT_ID is missing or invalid in .env");
        }

        GoogleSignin.configure({
            webClientId: clientId,
            offlineAccess: true,
            scopes: ['email', 'profile'],
            forceCodeForRefreshToken: true,
        });
    }, []);

    const handleManualLogin = async () => {
        if (!email || !password) {
            showAlert("Missing Fields", "Please enter both email and password.");
            return;
        }

        setLoading(true);
        try {
            console.log("Attempting manual login for:", email);
            const response = await authApi.login(email, password);

            if (response && response.token) {
                await processLoginSuccess(response);
            } else {
                showAlert("Login Failed", "Invalid response from server.");
            }
        } catch (error) {
            console.error("Manual login error:", error);
            checkAndShowDeactivatedDialog(error, "Login Failed", "Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const userEmail = userInfo?.data?.user?.email || userInfo?.user?.email;

            if (userEmail) {
                handleBackendGoogleLogin(userEmail.trim());
            } else {
                showAlert("Login Error", "Could not retrieve email from Google Account.");
            }
        } catch (error) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log("User cancelled login");
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log("Login in progress");
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                showAlert("Error", "Google Play Services not available");
            } else {
                console.error(error);
                showAlert("Error", "Google Login failed. Please try again.");
            }
        }
    };

    const handleBackendGoogleLogin = async (email) => {
        setLoading(true);
        try {
            const response = await authApi.googleLoginSuccess(email);
            if (response && response.token) {
                await processLoginSuccess(response);
            } else {
                showAlert("Login Failed", "No token received from server.");
            }
        } catch (error) {
            console.error("Backend Google login error:", error);
            checkAndShowDeactivatedDialog(error, "Login Failed", "Server Error during Google Login");
        } finally {
            setLoading(false);
        }
    };

    const processLoginSuccess = async (response) => {
        await authService.logout();

        const token = response.token;
        if (!token) {
            showAlert("Login Error", "No token received.");
            return;
        }
        await authService.setToken(token);

        let userData = {
            id: response.id || response.userId,
            name: response.name,
            email: response.email || email,
            imageUrl: response.imageUrl,
            mobile: response.mobile
        };

        try {
            const decoded = jwtDecode(token);
            if (decoded) {
                userData.id = userData.id || decoded.id || decoded.userId || decoded.sub;
                userData.name = userData.name || decoded.name || decoded.fullName;
                userData.email = userData.email || decoded.email || decoded.sub;
            }
            console.log("JWT decoded claims:", JSON.stringify(decoded));
        } catch (decodeErr) {
            console.warn("JWT decode failed (non-critical):", decodeErr?.message);
        }

        if (!userData.email) {
            userData.email = email;
        }

        await authService.setUser(userData);
        console.log("User data saved (initial):", JSON.stringify(userData));

        if (!userData.name || !userData.id || isNaN(Number(userData.id))) {
            const targetEmail = userData.email;
            if (targetEmail) {
                try {
                    const userDetails = await userApi.getUserDetails(targetEmail);
                    if (userDetails) {
                        userData = {
                            id: userDetails.id || userData.id,
                            name: userDetails.name || userData.name,
                            email: userDetails.email || userData.email,
                            imageUrl: userDetails.imageUrl || userData.imageUrl,
                            mobile: userDetails.mobile || userData.mobile
                        };
                        await authService.setUser(userData);
                        console.log("User data enhanced:", JSON.stringify(userData));
                    }
                } catch (err) {
                    console.warn("Failed to fetch user details after login:", err?.message);
                    await authService.setToken(token);
                }
            }
        }

        try {
            const { registerFCM } = require('../services/fcmService');
            registerFCM();
        } catch (fcmErr) {
            console.warn("FCM sync error after login:", fcmErr);
        }

        const executeTargetNavigation = async () => {
            const { postLoginTarget, postLoginParams, returnRoute, returnParams } = route.params || {};
            const tcAccepted = await authService.hasAcceptedTerms();

            if (returnRoute) {
                if (!tcAccepted) {
                    navigation.reset({
                        index: 0,
                        routes: [{
                            name: 'TermsConsent',
                            params: { nextScreen: returnRoute, nextParams: returnParams }
                        }],
                    });
                } else {
                    navigation.replace(returnRoute, returnParams);
                }
            } else if (postLoginTarget) {
                if (!tcAccepted) {
                    navigation.reset({
                        index: 0,
                        routes: [{
                            name: 'TermsConsent',
                            params: { nextScreen: postLoginTarget, nextParams: postLoginParams }
                        }],
                    });
                } else {
                    navigation.replace(postLoginTarget, postLoginParams);
                }
            } else if (!tcAccepted) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'TermsConsent', params: { nextScreen: 'Home' } }],
                });
            } else {
                setTimeout(() => {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                    });
                }, 100);
            }
        };

        const consentCompleted = await permissionService.hasCompletedConsent();
        if (!consentCompleted) {
            pendingNavRef.current = executeTargetNavigation;
            setShowPermissionModal(true);
        } else {
            await executeTargetNavigation();
        }
    };

    const handlePermissionConsentDone = async () => {
        setShowPermissionModal(false);
        if (pendingNavRef.current) {
            const navFn = pendingNavRef.current;
            pendingNavRef.current = null;
            await navFn();
        } else {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
            });
        }
    };

    const handleGuestMode = async () => {
        setLoading(true);
        try {
            await authService.logout();
            await authService.setGuestMode(true);
            navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
            });
        } catch (error) {
            console.error("Guest mode failed:", error);
            showAlert("Error", "Failed to start guest session.");
        } finally {
            setLoading(false);
        }
    };

    const styles = getStyles(theme, isDark);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.container}
        >
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.heroWrapper}>
                    <Image
                        source={isDark ? require('../assets/images/dark/login_hero.webp') : require('../assets/images/login_hero.webp')}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={
                            isDark
                                ? ['transparent', 'rgba(19, 17, 20, 0.4)', 'rgba(19, 17, 20, 0.95)', theme.background]
                                : ['transparent', 'rgba(208, 214, 219, 0.4)', 'rgba(208, 214, 219, 0.95)', theme.background]
                        }
                        style={styles.heroGradient}
                        pointerEvents="none"
                    />
                </View>

                <View style={styles.formContainer}>
                    <Image
                        source={require('../assets/images/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />

                    <Text style={styles.title}>Welcome Back!</Text>
                    <Text style={styles.subtitle}>Sign in to continue charging</Text>

                    {/* Email Input */}
                    <View style={styles.inputWrapper}>
                        <Mail size={20} color={theme.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            placeholderTextColor={theme.placeholder}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputWrapper}>
                        <Lock size={20} color={theme.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={theme.placeholder}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            {showPassword ? (
                                <EyeOff size={20} color={theme.textSecondary} />
                            ) : (
                                <Eye size={20} color={theme.textSecondary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.forgotPassBtn}
                        onPress={() => navigation.navigate('ResetPassword')}
                    >
                        <Text style={styles.forgotPassText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.loginBtn, loading && styles.disabledBtn]}
                        onPress={handleManualLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.textPrimary} />
                        ) : (
                            <Text style={styles.loginBtnText}>Login</Text>
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Social Buttons */}
                    <View style={styles.socialRow}>
                        <TouchableOpacity activeOpacity={0.8} style={styles.socialCircle} onPress={handleGoogleSignIn} disabled={loading}>
                            <Image
                                source={require('../assets/images/google_ic.webp')}
                                style={styles.socialIcon}
                            />
                        </TouchableOpacity>
                        {truecallerAvailable !== false && (
                            <TouchableOpacity activeOpacity={0.8} style={[styles.socialCircle, styles.phoneCircle]} onPress={handleTruecallerSignIn} disabled={loading}>
                                <Phone size={22} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Footer Row */}
                    <View style={styles.footerRow}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.guestButton}
                            onPress={handleGuestMode}
                            disabled={loading}
                        >
                            <Text style={styles.guestButtonText}>Browse as Guest</Text>
                        </TouchableOpacity>

                        <View style={styles.footerLinkContainer}>
                            <Text style={styles.footerLinkText}>Don't have account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                <Text style={styles.footerLinkHighlight}>Register</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Extra padding for scroll */}
                <View style={{ height: 40 }} />
            </ScrollView>

            <PermissionConsentModal
                visible={showPermissionModal}
                onComplete={handlePermissionConsentDone}
                onSkip={handlePermissionConsentDone}
            />
        </KeyboardAvoidingView>
    );
}

const getStyles = (theme, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: theme.background,
    },
    scrollContent: {
        flexGrow: 1,
    },
    heroWrapper: {
        width: '100%',
        height: 220,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 90,
    },
    formContainer: {
        width: '100%',
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    logo: {
        width: 100,
        height: 20,
        marginTop: 0,
        marginBottom: 12,
        tintColor: theme.textPrimary,
        alignSelf: 'flex-start',
    },
    title: {
        fontSize: 32,
        color: theme.textPrimary,
        fontWeight: '900',
        marginBottom: 6,
        alignSelf: 'flex-start',
    },
    subtitle: {
        fontSize: 14,
        color: theme.textSecondary,
        marginBottom: 28,
        alignSelf: 'flex-start',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.cardBg,
        borderRadius: 28,
        paddingHorizontal: 20,
        height: 56,
        marginBottom: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: theme.textPrimary,
        fontSize: 15,
        height: '100%',
    },
    forgotPassBtn: {
        alignSelf: 'flex-end',
        marginBottom: 24,
        marginRight: 4,
    },
    forgotPassText: {
        color: theme.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    loginBtn: {
        backgroundColor: theme.buttonBg,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    loginBtnText: {
        color: theme.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.divider,
    },
    dividerText: {
        color: theme.textSecondary,
        paddingHorizontal: 16,
        fontSize: 12,
        fontWeight: '600',
    },
    socialRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        marginBottom: 10,
    },
    socialCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: isDark ? theme.buttonBg : '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    phoneCircle: {
        backgroundColor: '#0086ff',
    },
    socialIcon: {
        width: 24,
        height: 24,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginTop: 40,
        paddingHorizontal: 4,
    },
    guestButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    guestButtonText: {
        color: theme.textPrimary,
        fontSize: 14,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    footerLinkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerLinkText: {
        color: theme.textSecondary,
        fontSize: 14,
    },
    footerLinkHighlight: {
        color: theme.textPrimary,
        fontSize: 14,
        fontWeight: 'bold',
    },
});
