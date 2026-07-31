import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, StatusBar, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, CreditCard, Send, CheckCircle2, ShieldAlert, Truck, Sparkles, MapPin, Phone, User, Mail, AlertTriangle, Wifi } from 'lucide-react-native';
import { rfidApi } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { authService } from '../services/auth';
import LoginRequiredDialog from '../components/LoginRequiredDialog';
import { useTheme } from '../context/ThemeContext';

export default function RfidScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();
    const { theme, isDark } = useTheme();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [applications, setApplications] = useState([]);
    const [showFormModal, setShowFormModal] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [loginPromptVisible, setLoginPromptVisible] = useState(false);

    // Form inputs
    const [fullName, setFullName] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [errors, setErrors] = useState({});

    // Fetch user applications
    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true);
            const data = await rfidApi.getMyRfidApplications();
            setApplications(data || []);
        } catch (error) {
            console.error("Error fetching RFID status:", error);
            showAlert("Error", error.userMessage || "Failed to load RFID applications status.");
        } finally {
            setLoading(false);
        }
    }, [showAlert]);

    useEffect(() => {
        const checkGuest = async () => {
            const guest = await authService.isGuestMode();
            setIsGuest(guest);
            if (guest) {
                setLoginPromptVisible(true);
            } else {
                fetchStatus();
            }
        };
        checkGuest();
    }, [fetchStatus]);

    const animOpacity1 = React.useRef(new Animated.Value(0)).current;
    const animOpacity2 = React.useRef(new Animated.Value(0)).current;
    const animY1 = React.useRef(new Animated.Value(20)).current;
    const animY2 = React.useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (!loading) {
            animOpacity1.setValue(0);
            animOpacity2.setValue(0);
            animY1.setValue(20);
            animY2.setValue(20);

            Animated.stagger(150, [
                Animated.parallel([
                    Animated.timing(animOpacity1, { toValue: 1, duration: 250, useNativeDriver: true }),
                    Animated.timing(animY1, { toValue: 0, duration: 250, useNativeDriver: true })
                ]),
                Animated.parallel([
                    Animated.timing(animOpacity2, { toValue: 1, duration: 250, useNativeDriver: true }),
                    Animated.timing(animY2, { toValue: 0, duration: 250, useNativeDriver: true })
                ])
            ]).start();
        }
    }, [loading]);

    const validateForm = () => {
        let tempErrors = {};
        if (!fullName.trim()) tempErrors.fullName = "Full name is required";
        
        if (!mobile.trim()) {
            tempErrors.mobile = "Mobile number is required";
        } else if (!/^\d{10}$/.test(mobile.trim())) {
            tempErrors.mobile = "Please enter a valid 10-digit mobile number";
        }

        if (!email.trim()) {
            tempErrors.email = "Email address is required";
        } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
            tempErrors.email = "Please enter a valid email address";
        }

        if (!address.trim()) tempErrors.address = "Shipping address is required";

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            const payload = {
                fullName: fullName.trim(),
                mobile: mobile.trim(),
                email: email.trim(),
                address: address.trim()
            };
            await rfidApi.applyForRfid(payload);
            showAlert("Success", "Your RFID card application has been submitted successfully!");
            setShowFormModal(false);
            setFullName('');
            setMobile('');
            setEmail('');
            setAddress('');
            fetchStatus();
        } catch (error) {
            console.error("Submit application failed:", error);
            showAlert("Submission Failed", error.userMessage || "Failed to submit RFID application. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkAsReceived = async () => {
        if (!latestApp) return;
        try {
            setLoading(true);
            await rfidApi.markAsReceived(latestApp.id);
            showAlert("Success", "RFID Card marked as delivered successfully! The card will be activated soon.");
            fetchStatus();
        } catch (error) {
            console.error("Mark as received failed:", error);
            showAlert("Failed", error.userMessage || "Failed to mark RFID card as delivered. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleReportLost = () => {
        showAlert(
            "Report RFID Card",
            "Are you sure you want to report this card as lost? This will block the card and allow you to request a replacement.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Confirm", 
                    style: "destructive",
                    onPress: () => showAlert("Card Blocked", "Your RFID card has been blocked. You can now re-apply.")
                }
            ]
        );
    };

    const sortedApps = [...applications].sort((a, b) => b.id - a.id);
    const latestApp = sortedApps[0];

    let appState = 1; 
    if (latestApp) {
        const statusUpper = latestApp.status?.toUpperCase();
        if (statusUpper === 'DELIVERED') {
            appState = 3;
        } else {
            appState = 2;
        }
    }

    const getTimelineStep = (status) => {
        const statusUpper = status?.toUpperCase();
        switch (statusUpper) {
            case 'PENDING': return 0;
            case 'APPROVED': return 1;
            default: return 0;
        }
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Animated.View style={{ opacity: animOpacity1, transform: [{ translateY: animY1 }], alignItems: 'center', width: '100%' }}>
                <View style={[styles.emptyIconContainer, { backgroundColor: theme.cardBg }]}>
                    <CreditCard size={48} color="#00B074" />
                    <Sparkles size={20} color="#FFA726" style={styles.sparkleIcon} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Get Your Bentork RFID Card</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                    Apply for a physical RFID card to start charging sessions instantly at any Bentork EV station without opening the app.
                </Text>
            </Animated.View>
            <Animated.View style={{ opacity: animOpacity2, transform: [{ translateY: animY2 }], width: '100%', alignItems: 'center' }}>
                <TouchableOpacity 
                    style={[styles.applyBtn, { backgroundColor: theme.white }]}
                    onPress={() => setShowFormModal(true)}
                >
                    <Text style={[styles.applyBtnText, { color: theme.textPrimary }]}>Apply for RFID</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );

    const renderTimeline = () => {
        if (!latestApp) return null;
        
        const statusUpper = latestApp.status?.toUpperCase();
        const currentStep = getTimelineStep(latestApp.status);
        const steps = [
            { label: 'Submitted', desc: 'Application received', statusVal: 'PENDING' },
            { label: 'Approved', desc: 'Card verification complete', statusVal: 'APPROVED' }
        ];

        const isRejected = statusUpper === 'REJECTED';

        return (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ opacity: animOpacity1, transform: [{ translateY: animY1 }] }}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Application Tracking</Text>
                    
                    <View style={[styles.trackingCard, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardHeaderTitle, { color: theme.textPrimary }]}>RFID Card Application</Text>
                            <Text style={[
                                styles.statusTag, 
                                isRejected ? styles.statusRejected : styles.statusActive
                            ]}>
                                {latestApp.status}
                            </Text>
                        </View>

                        <Text style={[styles.appIdText, { color: theme.textSecondary }]}>Application ID: BTK-RFID-{latestApp.id}</Text>

                        {isRejected ? (
                            <View style={styles.rejectedBanner}>
                                <AlertTriangle size={20} color="#EF5350" />
                                <View style={styles.rejectedTextContainer}>
                                    <Text style={styles.rejectedTitle}>Application Rejected</Text>
                                    <Text style={styles.rejectedDesc}>
                                        Your application could not be approved. Please review your details and try applying again.
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.stepperContainer}>
                                {steps.map((step, index) => {
                                    const isCompleted = index <= currentStep;
                                    const isCurrent = index === currentStep;
                                    return (
                                        <View key={index} style={styles.stepItem}>
                                            <View style={styles.stepIndicatorCol}>
                                                <View style={[
                                                    styles.stepDot,
                                                    isCompleted ? styles.stepDotCompleted : [styles.stepDotPending, { backgroundColor: theme.cardBg, borderColor: theme.divider }],
                                                    isCurrent && styles.stepDotCurrent
                                                ]}>
                                                    {isCompleted ? (
                                                        <CheckCircle2 size={16} color="#FFFFFF" fill="#00B074" />
                                                    ) : (
                                                        <View style={[styles.stepDotInner, { backgroundColor: theme.divider }]} />
                                                    )}
                                                </View>
                                                {index < steps.length - 1 && (
                                                    <View style={[
                                                        styles.stepLine,
                                                        index < currentStep ? styles.stepLineCompleted : [styles.stepLinePending, { backgroundColor: theme.divider }]
                                                    ]} />
                                                )}
                                            </View>
                                            <View style={styles.stepTextCol}>
                                                <Text style={[
                                                    styles.stepLabel,
                                                    isCompleted ? [styles.stepLabelCompleted, { color: theme.textPrimary }] : [styles.stepLabelPending, { color: theme.textSecondary }]
                                                ]}>
                                                    {step.label}
                                                </Text>
                                                <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>{step.desc}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        <View style={[styles.detailsDivider, { backgroundColor: theme.divider }]} />

                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <User size={16} color={theme.textSecondary} />
                                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{latestApp.fullName}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Phone size={16} color={theme.textSecondary} />
                                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{latestApp.mobile}</Text>
                            </View>
                        </View>

                        <View style={[styles.detailItem, { marginTop: 12 }]}>
                            <MapPin size={16} color={theme.textSecondary} />
                            <Text style={[styles.detailValue, { color: theme.textPrimary, flex: 1 }]}>{latestApp.address}</Text>
                        </View>

                        {statusUpper === 'APPROVED' && (
                            <TouchableOpacity 
                                style={[styles.activateBtn, { backgroundColor: theme.white }]}
                                onPress={handleMarkAsReceived}
                            >
                                <Text style={[styles.activateBtnText, { color: theme.textPrimary }]}>Mark as Delivered</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>

                {isRejected && (
                    <Animated.View style={{ opacity: animOpacity2, transform: [{ translateY: animY2 }], marginTop: 16 }}>
                        <TouchableOpacity 
                            style={[styles.reapplyBtn, { backgroundColor: theme.white }]}
                            onPress={() => setShowFormModal(true)}
                        >
                            <Text style={[styles.reapplyBtnText, { color: theme.textPrimary }]}>Apply Again</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </ScrollView>
        );
    };

    const renderWallet = () => {
        if (!latestApp) return null;
        
        const cardNo = latestApp.assignedCard?.cardNumber || 'BEV-0123';
        const last4 = cardNo.length > 4 ? cardNo.slice(-4) : cardNo;
        const isActive = latestApp.assignedCard?.active ?? false;

        return (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ opacity: animOpacity1, transform: [{ translateY: animY1 }] }}>
                    <Text style={[styles.sectionHeaderTitle, { color: theme.textPrimary }]}>My RFID Card</Text>

                    {/* Charcoal/Dark Card Mockup */}
                    <View style={styles.rfidCardContainer}>
                        <View style={styles.rfidCardInner}>
                            <View style={styles.cardHeaderRow}>
                                <Text style={styles.cardBrandText}>BENTORK EV</Text>
                                <Text style={styles.rfidIdLabel}>
                                    RFID ID: <Text style={styles.rfidIdValue}>{cardNo}</Text>
                                </Text>
                            </View>

                            <View style={styles.cardMiddleRow}>
                                <Text style={styles.cardMaskedNumber}>•••• {last4}</Text>
                                <View style={styles.contactlessContainer}>
                                    <Wifi size={24} color="#fff" style={{ transform: [{ rotate: '90deg' }] }} />
                                </View>
                            </View>

                            <View style={styles.cardFooterRow}>
                                <View>
                                    <Text style={styles.holderLabel}>Card Holder</Text>
                                    <Text style={styles.holderName}>{latestApp.fullName}</Text>
                                </View>
                                <View style={styles.statusBadgePill}>
                                    <View style={[styles.statusBadgeDot, { backgroundColor: isActive ? '#00B074' : '#FFA726' }]} />
                                    <Text style={styles.statusBadgeText}>{isActive ? 'Active' : 'Inactive'}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View style={{ opacity: animOpacity2, transform: [{ translateY: animY2 }] }}>
                    <Text style={[styles.sectionHeaderTitle, { color: theme.textPrimary, marginTop: 12 }]}>Card Information</Text>

                    <View style={[styles.infoCardContainer, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.infoFieldRow}>
                            <Text style={[styles.infoFieldLabel, { color: theme.textSecondary }]}>Associated User</Text>
                            <Text style={[styles.infoFieldValue, { color: theme.textPrimary }]}>{latestApp.email}</Text>
                        </View>
                        <View style={[styles.infoFieldDivider, { backgroundColor: theme.divider }]} />
                        <View style={styles.infoFieldRow}>
                            <Text style={[styles.infoFieldLabel, { color: theme.textSecondary }]}>Phone Number</Text>
                            <Text style={[styles.infoFieldValue, { color: theme.textPrimary }]}>{latestApp.mobile}</Text>
                        </View>
                        <View style={[styles.infoFieldDivider, { backgroundColor: theme.divider }]} />
                        <View style={styles.infoFieldRow}>
                            <Text style={[styles.infoFieldLabel, { color: theme.textSecondary }]}>Delivery Address</Text>
                            <Text style={[styles.infoFieldValue, { color: theme.textPrimary }]}>{latestApp.address}</Text>
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* App Bar */}
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.cardBg }]} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>RFID Card</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00B074" />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {appState === 1 && renderEmptyState()}
                    {appState === 2 && renderTimeline()}
                    {appState === 3 && renderWallet()}
                </View>
            )}

            {/* Apply Form Modal */}
            <Modal
                visible={showFormModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFormModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={[styles.modalOverlay, { backgroundColor: theme.overlayBg }]}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.divider }]}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>RFID Application Form</Text>
                            <TouchableOpacity onPress={() => setShowFormModal(false)} style={styles.modalCloseBtn}>
                                <Text style={styles.modalCloseBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
                            <Text style={[styles.formInstructions, { color: theme.textSecondary }]}>
                                Please enter your delivery details carefully. The RFID card will be shipped to this address.
                            </Text>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Full Name</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: theme.white }, errors.fullName && styles.inputWrapperError]}>
                                    <User size={18} color={theme.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.textInput, { color: theme.textPrimary }]}
                                        placeholder="Enter full name"
                                        placeholderTextColor={theme.placeholder}
                                        value={fullName}
                                        onChangeText={(text) => {
                                            setFullName(text);
                                            if (errors.fullName) setErrors(prev => ({ ...prev, fullName: null }));
                                        }}
                                    />
                                </View>
                                {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Mobile Number</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: theme.white }, errors.mobile && styles.inputWrapperError]}>
                                    <Phone size={18} color={theme.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.textInput, { color: theme.textPrimary }]}
                                        placeholder="10-digit mobile number"
                                        placeholderTextColor={theme.placeholder}
                                        keyboardType="numeric"
                                        maxLength={10}
                                        value={mobile}
                                        onChangeText={(text) => {
                                            setMobile(text);
                                            if (errors.mobile) setErrors(prev => ({ ...prev, mobile: null }));
                                        }}
                                    />
                                </View>
                                {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: theme.white }, errors.email && styles.inputWrapperError]}>
                                    <Mail size={18} color={theme.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.textInput, { color: theme.textPrimary }]}
                                        placeholder="Enter email address"
                                        placeholderTextColor={theme.placeholder}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            if (errors.email) setErrors(prev => ({ ...prev, email: null }));
                                        }}
                                    />
                                </View>
                                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Shipping Address</Text>
                                <View style={[
                                    styles.inputWrapper, 
                                    styles.textAreaWrapper, 
                                    { backgroundColor: theme.white },
                                    errors.address && styles.inputWrapperError
                                ]}>
                                    <MapPin size={18} color={theme.textSecondary} style={[styles.inputIcon, { marginTop: 12 }]} />
                                    <TextInput
                                        style={[styles.textInput, styles.textAreaInput, { color: theme.textPrimary }]}
                                        placeholder="Enter complete shipping address"
                                        placeholderTextColor={theme.placeholder}
                                        multiline={true}
                                        numberOfLines={4}
                                        value={address}
                                        onChangeText={(text) => {
                                            setAddress(text);
                                            if (errors.address) setErrors(prev => ({ ...prev, address: null }));
                                        }}
                                    />
                                </View>
                                {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                            </View>

                            <TouchableOpacity 
                                style={[styles.submitBtn, { backgroundColor: theme.white }]}
                                onPress={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color={theme.textPrimary} />
                                ) : (
                                    <>
                                        <Text style={[styles.submitBtnText, { color: theme.textPrimary }]}>Submit Application</Text>
                                        <Send size={18} color={theme.textPrimary} style={{ marginLeft: 8 }} />
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <LoginRequiredDialog
                visible={loginPromptVisible}
                contextMessage="Sign in to apply for or view your RFID card"
                onLoginPress={() => {
                    setLoginPromptVisible(false);
                    navigation.replace('Login', { returnRoute: 'RfidApplication' });
                }}
                onClose={() => {
                    setLoginPromptVisible(false);
                    navigation.goBack();
                }}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 16,
    },
    sectionHeaderTitle: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 80,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    sparkleIcon: {
        position: 'absolute',
        top: 15,
        right: 15,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 10,
    },
    emptySubtitle: {
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 32,
    },
    applyBtn: {
        height: 56,
        borderRadius: 28,
        paddingHorizontal: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyBtnText: {
        fontSize: 15,
        fontWeight: '900',
    },
    trackingCard: {
        borderRadius: 28,
        padding: 20,
        marginBottom: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardHeaderTitle: {
        fontSize: 16,
        fontWeight: '900',
    },
    statusTag: {
        fontSize: 11,
        fontWeight: '800',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 20,
        textTransform: 'uppercase',
    },
    statusActive: {
        backgroundColor: 'rgba(0, 176, 116, 0.1)',
        color: '#00B074',
    },
    statusRejected: {
        backgroundColor: 'rgba(239, 83, 80, 0.1)',
        color: '#EF5350',
    },
    appIdText: {
        fontSize: 12,
        fontFamily: 'monospace',
        marginBottom: 20,
    },
    stepperContainer: {
        paddingLeft: 4,
        marginBottom: 16,
    },
    stepItem: {
        flexDirection: 'row',
        minHeight: 56,
    },
    stepIndicatorCol: {
        alignItems: 'center',
        marginRight: 14,
    },
    stepDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    stepDotCompleted: {
        backgroundColor: '#00B074',
        borderColor: '#00B074',
    },
    stepDotCurrent: {
        borderColor: '#FFA726',
    },
    stepDotInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    stepLine: {
        width: 2,
        flex: 1,
        marginVertical: 4,
    },
    stepLineCompleted: {
        backgroundColor: '#00B074',
    },
    stepTextCol: {
        flex: 1,
        paddingTop: 1,
    },
    stepLabel: {
        fontSize: 14,
        fontWeight: '800',
    },
    stepDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    detailsDivider: {
        height: 1,
        marginVertical: 16,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '850',
    },
    activateBtn: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    activateBtnText: {
        fontSize: 15,
        fontWeight: '900',
    },
    reapplyBtn: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reapplyBtnText: {
        fontSize: 15,
        fontWeight: '900',
    },
    rfidCardContainer: {
        width: '100%',
        height: 200,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 20,
    },
    rfidCardInner: {
        flex: 1,
        backgroundColor: '#1E1E1E',
        padding: 24,
        justifyContent: 'space-between',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardBrandText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    rfidIdLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
    },
    rfidIdValue: {
        color: '#00B074',
        fontWeight: '800',
    },
    cardMiddleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardMaskedNumber: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: 2,
    },
    contactlessContainer: {
        opacity: 0.8,
    },
    cardFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    holderLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 9,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    holderName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    statusBadgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 20,
    },
    statusBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
    infoCardContainer: {
        borderRadius: 28,
        padding: 20,
    },
    infoFieldRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    infoFieldLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    infoFieldValue: {
        fontSize: 13,
        fontWeight: '850',
    },
    infoFieldDivider: {
        height: 1,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '85%',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalCloseBtnText: {
        color: '#EF5350',
        fontSize: 14,
        fontWeight: '800',
    },
    formContainer: {
        padding: 20,
    },
    formInstructions: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 28,
        paddingHorizontal: 16,
        height: 56,
    },
    inputWrapperError: {
        borderWidth: 1.5,
        borderColor: '#EF5350',
    },
    inputIcon: {
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '800',
    },
    textAreaWrapper: {
        height: 120,
        alignItems: 'flex-start',
        borderRadius: 20,
        paddingVertical: 4,
    },
    textAreaInput: {
        height: '100%',
        textAlignVertical: 'top',
        paddingTop: 10,
    },
    errorText: {
        color: '#EF5350',
        fontSize: 11,
        fontWeight: '800',
        marginTop: 4,
        marginLeft: 12,
    },
    submitBtn: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    submitBtnText: {
        fontSize: 15,
        fontWeight: '900',
    },
});
