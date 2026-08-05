import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, ChevronLeft, KeyRound, CheckCircle, ArrowRight } from 'lucide-react-native';
import { authApi } from '../services/api';
import { useAlert } from '../context/AlertContext';

export default function ResetPasswordScreen({ navigation }) {
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();

    // UI State
    const [step, setStep] = useState(1); // 1: Email, 2: New Password
    const [loading, setLoading] = useState(false);

    // Form Data
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSendCode = async () => {
        if (!email || !email.includes('@')) {
            showAlert("Invalid Email", "Please enter a valid email address.");
            return;
        }

        setLoading(true);
        try {
            await authApi.requestOtp(email);
            setStep(2);
            showAlert("Code Sent", `We've sent a verification code to ${email}`);
        } catch (error) {
            showAlert("Request Failed", error.userMessage || "Could not send reset code. Please check your email.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!otp || otp.length < 4) {
            showAlert("Invalid Code", "Please enter the valid verification code.");
            return;
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;
        if (!newPassword || !passwordRegex.test(newPassword)) {
            showAlert("Weak Password", "Password must be at least 8 characters and include uppercase, lowercase, and a number.");
            return;
        }
        if (newPassword !== confirmPassword) {
            showAlert("Mismatch", "Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await authApi.resetPassword(email, otp, newPassword);
            showAlert("Success", "Your password has been reset successfully!", [
                { text: "Login Now", onPress: () => navigation.navigate('Login') }
            ]);
        } catch (error) {
            showAlert("Reset Failed", error.userMessage || "Could not reset password. Please check your verification code.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => step === 2 ? setStep(1) : navigation.goBack()}
                >
                    <ChevronLeft size={24} color="#1A1A1A" />
                </TouchableOpacity>

                {/* Header Content */}
                <View style={styles.headerContainer}>
                    <View style={styles.iconCircle}>
                        <KeyRound size={32} color="#00B074" />
                    </View>
                    <Text style={styles.title}>
                        {step === 1 ? "Forgot Password?" : "Reset Password"}
                    </Text>
                    <Text style={styles.subtitle}>
                        {step === 1
                            ? "Don't worry! It happens. Please enter the email associated with your account."
                            : `Enter the code sent to ${email} and your new password.`}
                    </Text>
                </View>

                {/* Form Step 1: Email */}
                {step === 1 && (
                    <View style={styles.formContainer}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <Mail size={18} color="#5A6B7C" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor="#7E8E9F"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.actionBtn, (!email || loading) && styles.disabledBtn]}
                            onPress={handleSendCode}
                            disabled={loading || !email}
                        >
                            {loading ? (
                                <ActivityIndicator color="#1A1A1A" />
                            ) : (
                                <View style={styles.btnContent}>
                                    <Text style={styles.btnText}>Send Code</Text>
                                    <ArrowRight size={18} color="#1A1A1A" style={{ marginLeft: 8 }} />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Form Step 2: OTP & New Password */}
                {step === 2 && (
                    <View style={styles.formContainer}>
                        {/* OTP Input */}
                        <Text style={styles.inputLabel}>Verification Code</Text>
                        <View style={styles.inputWrapper}>
                            <CheckCircle size={18} color="#5A6B7C" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter OTP Code"
                                placeholderTextColor="#7E8E9F"
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* New Password */}
                        <Text style={styles.inputLabel}>New Password</Text>
                        <View style={styles.inputWrapper}>
                            <Lock size={18} color="#5A6B7C" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter new password"
                                placeholderTextColor="#7E8E9F"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                            />
                        </View>

                        {/* Confirm Password */}
                        <Text style={styles.inputLabel}>Confirm Password</Text>
                        <View style={styles.inputWrapper}>
                            <Lock size={18} color="#5A6B7C" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Re-enter password"
                                placeholderTextColor="#7E8E9F"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#1A1A1A" />
                            ) : (
                                <Text style={styles.btnText}>Reset Password</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#D0D6DB',
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
        backgroundColor: '#E2E7EC',
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
        backgroundColor: '#E2E7EC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#1A1A1A',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#5A6B7C',
        lineHeight: 22,
        fontWeight: '600',
    },
    formContainer: {
        width: '100%',
    },
    inputLabel: {
        color: '#5A6B7C',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 20,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#1A1A1A',
        fontSize: 14,
        fontWeight: '800',
        height: '100%',
    },
    actionBtn: {
        backgroundColor: '#ECEFF1',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    disabledBtn: {
        opacity: 0.5,
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    btnText: {
        color: '#1A1A1A',
        fontSize: 15,
        fontWeight: '900',
    },
});
