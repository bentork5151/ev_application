import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView, StatusBar, useColorScheme } from 'react-native';
import { Mail, Lock, Eye, EyeOff, User, Phone, MapPin, Activity, Battery, LifeBuoy, Info, ArrowRight } from 'lucide-react-native';
import { authApi } from '../services/api';
import { authService } from '../services/auth';
import { useAlert } from '../context/AlertContext';

import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import PermissionConsentModal from '../components/PermissionConsentModal';
import { permissionService } from '../services/permissionService';

// Centralized Theme Palette for Easy Dark Mode Transition
const colors = {
    light: {
        background: '#D0D6DB',
        cardBackground: '#E2E7EC',
        iconCircleBg: '#D0D6DB',
        primaryButtonBg: '#ECEFF1',
        textPrimary: '#1A1A1A',
        textSecondary: '#5A6B7C',
        textPlaceholder: '#7E8E9F',
        dividerColor: '#BFC7CE',
        greenAccent: '#00B074',
        logoTint: '#1A1A1A',
        statusBarContent: 'dark-content',
    },
    dark: {
        background: '#161616',
        cardBackground: '#242424',
        iconCircleBg: '#2D2D2D',
        primaryButtonBg: '#2D2D2D',
        textPrimary: '#FFFFFF',
        textSecondary: '#A0A0A0',
        textPlaceholder: '#707070',
        dividerColor: '#333333',
        greenAccent: '#00B074',
        logoTint: '#FFFFFF',
        statusBarContent: 'light-content',
    }
};

export default function RegisterScreen({ navigation, route }) {
    const { theme: appTheme, isDark } = useTheme();
    const theme = isDark ? colors.dark : colors.light;
    const styles = getStyles(theme);

    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0); // 0 = Intro, 1 = Name, 2 = Contact, 3 = Password

    // Form States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const pendingNavRef = React.useRef(null);

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

    const handleGoToLogin = () => {
        navigation.navigate('Login');
    };

    const validateStep = () => {
        setErrorMessage('');

        if (step === 1) {
            const trimmedName = name.trim();
            const alphabetCount = (trimmedName.match(/[A-Za-z]/g) || []).length;
            const isOnlyAlphabetsAndSpaces = /^[A-Za-z\s]+$/.test(trimmedName);

            if (!trimmedName || alphabetCount < 2 || trimmedName.length > 50 || !isOnlyAlphabetsAndSpaces) {
                setErrorMessage("Full name must contain at least 2 alphabetic characters.");
                return false;
            }
            return true;
        }

        if (step === 2) {
            const trimmedEmail = email.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
                setErrorMessage("Enter a valid email address.");
                return false;
            }

            const trimmedMobile = mobile.trim();
            const mobileRegex = /^[6-9]\d{9}$/;
            if (!trimmedMobile || !mobileRegex.test(trimmedMobile)) {
                setErrorMessage("Enter a valid 10-digit Indian mobile number.");
                return false;
            }
            return true;
        }

        return true;
    };

    const handleNext = () => {
        if (validateStep()) {
            setStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        setErrorMessage('');
        setStep((prev) => Math.max(0, prev - 1));
    };

    const handleRegister = async () => {
        setErrorMessage('');
        
        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedMobile = mobile.trim();
        const trimmedPassword = password;

        // Password Validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;
        if (!trimmedPassword || !passwordRegex.test(trimmedPassword)) {
            setErrorMessage("Password must be at least 8 characters and include uppercase, lowercase, and a number.");
            return;
        }

        if (trimmedPassword === trimmedEmail) {
            setErrorMessage("Password must not be equal to email.");
            return;
        }

        if (trimmedPassword !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            console.log("Registering User:", { name: trimmedName, mobile: trimmedMobile, email: trimmedEmail });
            const response = await authApi.register({
                name: trimmedName,
                mobile: trimmedMobile,
                email: trimmedEmail,
                password: trimmedPassword,
                confirmPassword: confirmPassword
            });

            setLoading(false);

            if (response && response.token) {
                await authService.setToken(response.token);
                const userData = {
                    id: response.id || response.userId,
                    name: response.name || trimmedName,
                    email: response.email || trimmedEmail,
                    mobile: response.mobile || trimmedMobile
                };
                await authService.setUser(userData);

                // FCM Token Sync
                try {
                    const { registerFCM } = require('../services/fcmService');
                    registerFCM();
                } catch (fcmErr) {
                    console.warn("FCM sync error after registration:", fcmErr);
                }

                // Check T&C and Navigate
                const executeNav = async () => {
                    const tcAccepted = await authService.hasAcceptedTerms();
                    if (!tcAccepted) {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'TermsConsent', params: { nextScreen: 'Home' } }]
                        });
                    } else {
                        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
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
                    "Your account has been created successfully. Please login to continue.",
                    [{
                        text: "Login Now",
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
            console.error("Registration failed", error);
            setLoading(false);

            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.userMessage;
            if (errorMsg && (errorMsg.toLowerCase().includes('email') && errorMsg.toLowerCase().includes('already'))) {
                setErrorMessage("This email is already registered.");
            } else if (errorMsg && (errorMsg.toLowerCase().includes('mobile') || errorMsg.toLowerCase().includes('phone')) && errorMsg.toLowerCase().includes('already')) {
                setErrorMessage("This mobile number is already registered.");
            } else {
                const msg = error.userMessage || error.response?.data || "Registration failed. Please try again.";
                setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }
        }
    };

    const bgThemeColor = theme.background;
    const heroOverlayGradient = isDark
        ? ['transparent', 'rgba(19, 17, 20, 0.4)', 'rgba(19, 17, 20, 0.95)', bgThemeColor]
        : ['transparent', 'rgba(208, 214, 219, 0.4)', 'rgba(208, 214, 219, 0.95)', bgThemeColor];

    // Sub-components for Steps
    const renderIntroStep = () => (
        <View style={styles.introContainer}>
            <View style={styles.heroWrapper}>
                <Image
                    source={isDark ? require('../assets/images/dark/register_illustration.webp') : require('../assets/images/register_illustration.png')}
                    style={styles.heroImage}
                    resizeMode="cover"
                />
                <LinearGradient
                    colors={heroOverlayGradient}
                    style={styles.heroGradient}
                    pointerEvents="none"
                />
                {/* Centered BENTORK brand logo image overlay */}
                <View style={styles.heroLogoContainer}>
                    <Image
                        source={require('../assets/images/logo_inverted.png')}
                        style={styles.introLogo}
                        resizeMode="contain"
                    />
                </View>
            </View>

            <View style={styles.introContent}>
                <Text style={styles.introTitle}>
                    Create <Text style={styles.introTitleGreen}>Account.</Text>
                </Text>
                <Text style={styles.introSubtitle}>Sign up to Start Charging</Text>

                {/* 2x2 Grid Section */}
                <View style={styles.gridContainer}>
                    <View style={styles.gridRow}>
                        <View style={styles.gridCard}>
                            <View style={styles.iconCircle}>
                                <MapPin size={18} color={theme.greenAccent} />
                            </View>
                            <Text style={styles.cardTitle}>Find Chargers</Text>
                            <Text style={styles.cardDesc}>Nearest station in seconds</Text>
                        </View>
                        <View style={styles.gridCard}>
                            <View style={styles.iconCircle}>
                                <Activity size={18} color={theme.greenAccent} />
                            </View>
                            <Text style={styles.cardTitle}>Live Monitoring</Text>
                            <Text style={styles.cardDesc}>Real-time charging data</Text>
                        </View>
                    </View>
                    <View style={styles.gridRow}>
                        <View style={styles.gridCard}>
                            <View style={styles.iconCircle}>
                                <Battery size={18} color={theme.greenAccent} />
                            </View>
                            <Text style={styles.cardTitle}>Battery Track</Text>
                            <Text style={styles.cardDesc}>Track orders in real-time</Text>
                        </View>
                        <View style={styles.gridCard}>
                            <View style={styles.iconCircle}>
                                <LifeBuoy size={18} color={theme.greenAccent} />
                            </View>
                            <Text style={styles.cardTitle}>Easy Support</Text>
                            <Text style={styles.cardDesc}>Raise requests instantly</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.trustText}>Trusted by 10,000+ EV drivers across India</Text>

                {/* {renderTermsDisclaimer()} */}

                <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(1)}>
                    <Text style={styles.primaryBtnText}>Get Started</Text>
                    <ArrowRight size={18} color={theme.textPrimary} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTermsDisclaimer = () => (
        <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
                By registering, you agree to our{' '}
                <Text style={styles.termsLink} onPress={() => navigation.navigate('Terms')}>
                    Terms & Conditions
                </Text>
                {' '}and{' '}
                <Text style={styles.termsLink} onPress={() => navigation.navigate('TermsConsent', { readOnly: true })}>
                    Privacy Policy
                </Text>.
            </Text>
        </View>
    );

    const renderStepHeader = (stepNum) => (
        <View style={styles.stepHeader}>
            <Image
                source={require('../assets/images/logo_inverted.png')}
                style={styles.headerLogo}
                resizeMode="contain"
            />
            <Text style={styles.stepText}>STEP {stepNum} OF 3</Text>
        </View>
    );

    const renderFooterLinks = () => (
        <View style={styles.footerRow}>
            <TouchableOpacity onPress={handleGuestMode} disabled={loading}>
                <Text style={styles.footerLinkUnderline}>Browse as Guest</Text>
            </TouchableOpacity>

            <View style={styles.footerLinkContainer}>
                <Text style={styles.footerLinkText}>Already have an account? </Text>
                <TouchableOpacity onPress={handleGoToLogin}>
                    <Text style={styles.footerLinkHighlight}>Login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStepOne = () => (
        <View style={styles.formStepContainer}>
            {renderStepHeader(1)}
            
            <Text style={styles.title}>What's your name?</Text>
            <Text style={styles.subtitle}>Let's start with the basics.</Text>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.inputWrapper}>
                <User size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Your Full Name"
                    placeholderTextColor={theme.textPlaceholder}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>Next</Text>
                <ArrowRight size={18} color={theme.textPrimary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.footerSpacer} />
            {renderFooterLinks()}
        </View>
    );

    const renderStepTwo = () => (
        <View style={styles.formStepContainer}>
            {renderStepHeader(2)}
            
            <Text style={styles.title}>How can we reach you?</Text>
            <Text style={styles.subtitle}>We'll keep these to keep you charged in.</Text>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.inputWrapper}>
                <Mail size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor={theme.textPlaceholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.inputWrapper}>
                <Phone size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Mobile No."
                    placeholderTextColor={theme.textPlaceholder}
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>Next</Text>
                <ArrowRight size={18} color={theme.textPrimary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.footerSpacer} />
            {renderFooterLinks()}
        </View>
    );

    const renderStepThree = () => (
        <View style={styles.formStepContainer}>
            {renderStepHeader(3)}
            
            <Text style={styles.title}>Secure your account</Text>
            <Text style={styles.subtitle}>Pick a password you'll remember.</Text>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.inputWrapper}>
                <Lock size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={theme.textPlaceholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
                </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
                <Lock size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor={theme.textPlaceholder}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
                </TouchableOpacity>
            </View>

            {/* Instruction Box */}
            <View style={styles.instructionBox}>
                <View style={styles.instructionHeader}>
                    <Info size={16} color={theme.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.instructionTitle}>Password must contain:</Text>
                </View>
                <Text style={styles.instructionItem}>• Use 8 to 64 characters</Text>
                <Text style={styles.instructionItem}>• Include at least one uppercase letter (A-Z)</Text>
                <Text style={styles.instructionItem}>• Include at least one lowercase letter (a-z)</Text>
                <Text style={styles.instructionItem}>• Include at least one number (0-9)</Text>
            </View>

            {renderTermsDisclaimer()}

            <TouchableOpacity 
                style={[styles.primaryBtn, loading && styles.disabledBtn]} 
                onPress={handleRegister}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color={theme.textPrimary} /> : <Text style={styles.primaryBtnText}>Create Account</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={handleBack} disabled={loading}>
                <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.footerSpacer} />
            {renderFooterLinks()}
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.container}
        >
            <StatusBar translucent backgroundColor="transparent" barStyle={theme.statusBarContent} />
            <ScrollView 
                style={styles.scrollContainer} 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false} 
                keyboardShouldPersistTaps="handled"
            >
                {step === 0 && renderIntroStep()}
                {step === 1 && renderStepOne()}
                {step === 2 && renderStepTwo()}
                {step === 3 && renderStepThree()}
                <View style={{ height: 40 }} />
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

// Stylesheet generator based on the theme colors
const getStyles = (theme) => StyleSheet.create({
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
    introContainer: {
        width: '100%',
    },
    heroWrapper: {
        position: 'relative',
        width: '100%',
        height: 300,
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
        height: 120,
    },
    heroLogoContainer: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    introContent: {
        paddingHorizontal: 24,
        paddingTop: 0,
    },
    introTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: theme.textPrimary,
        marginBottom: 4,
    },
    introTitleGreen: {
        color: theme.greenAccent,
    },
    introSubtitle: {
        fontSize: 14,
        color: theme.textSecondary,
        marginBottom: 20,
    },
    gridContainer: {
        width: '100%',
        marginBottom: 20,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    gridCard: {
        flex: 1,
        backgroundColor: theme.cardBackground,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 6,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.iconCircleBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.textPrimary,
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 11,
        color: theme.textSecondary,
    },
    trustText: {
        fontSize: 12,
        color: theme.textSecondary,
        textAlign: 'center',
        marginBottom: 4,
    },
    formStepContainer: {
        paddingHorizontal: 24,
        paddingTop: 48,
        flex: 1,
    },
    stepHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
        marginBottom: 36,
    },
    headerLogo: {
        width: 130,
        height: 40,
        tintColor: theme.logoTint,
    },
    introLogo: {
        width: 160,
        height: 50,
        tintColor: theme.logoTint,
    },
    stepText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.textSecondary,
        marginTop: 2,
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
        backgroundColor: theme.cardBackground,
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
    errorText: {
        color: '#D32F2F',
        fontSize: 13,
        marginBottom: 16,
        fontWeight: '500',
    },
    instructionBox: {
        backgroundColor: theme.cardBackground,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: theme.dividerColor,
    },
    instructionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    instructionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.textSecondary,
    },
    instructionItem: {
        fontSize: 12,
        color: theme.textSecondary,
        marginBottom: 4,
        paddingLeft: 4,
    },
    primaryBtn: {
        backgroundColor: theme.primaryButtonBg,
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
        marginTop: 10,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    primaryBtnText: {
        color: theme.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    backBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginTop: 8,
    },
    backBtnText: {
        color: theme.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    footerSpacer: {
        flex: 1,
        minHeight: 40,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginTop: 20,
        paddingHorizontal: 4,
    },
    footerLinkUnderline: {
        color: theme.textPrimary,
        fontSize: 12,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    footerLinkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerLinkText: {
        color: theme.textSecondary,
        fontSize: 12,
    },
    footerLinkHighlight: {
        color: theme.textPrimary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    termsContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        marginTop: 0,
        paddingHorizontal: 8,
    },
    termsText: {
        fontSize: 12,
        color: theme.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
    },
    termsLink: {
        color: theme.textPrimary,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});
