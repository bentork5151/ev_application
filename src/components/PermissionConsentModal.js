import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    Dimensions
} from 'react-native';
import { MapPin, Camera, Bell, ShieldCheck, CheckCircle, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { permissionService } from '../services/permissionService';

const { width } = Dimensions.get('window');

export default function PermissionConsentModal({ visible, onComplete, onSkip }) {
    const { theme, isDark } = useTheme();
    const [isRequesting, setIsRequesting] = useState(false);
    const [activeStep, setActiveStep] = useState(null); // 'location' | 'camera' | 'notifications'

    const handleAgree = async () => {
        setIsRequesting(true);
        try {
            await permissionService.requestSequentialPermissions((step) => {
                setActiveStep(step);
            });
            // Mark consent completed permanently on Agree
            await permissionService.setConsentCompleted();
            if (onComplete) onComplete();
        } catch (error) {
            console.warn('[PermissionConsentModal] Error requesting permissions:', error);
            if (onComplete) onComplete();
        } finally {
            setIsRequesting(false);
            setActiveStep(null);
        }
    };

    const handleSkip = () => {
        // User clicked "Skip for now":
        // Per user request: Re-prompt on next login, so do NOT set consent as completed permanently!
        if (onSkip) {
            onSkip();
        } else if (onComplete) {
            onComplete();
        }
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            hardwareAccelerated
            onRequestClose={handleSkip}
        >
            <View style={styles.overlay}>
                <View style={[styles.card, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}>
                    
                    {/* Header Icon */}
                    <View style={styles.headerIconCircle}>
                        <ShieldCheck size={32} color="#00B074" />
                    </View>

                    {/* Title & Subtitle */}
                    <Text style={[styles.title, { color: theme.textPrimary }]}>
                        App Permissions
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        To ensure seamless charging, navigation, and updates, Bentork EV requires the following permissions:
                    </Text>

                    {/* Permission List */}
                    <View style={styles.permissionList}>
                        {/* Location */}
                        <View style={[
                            styles.permissionItem,
                            activeStep === 'location' && styles.permissionItemActive,
                            { backgroundColor: isDark ? '#252525' : '#F5F7FA' }
                        ]}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 176, 116, 0.12)' }]}>
                                <MapPin size={22} color="#00B074" />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>Location Access</Text>
                                <Text style={[styles.itemDesc, { color: theme.textSecondary }]}>
                                    Find nearby EV charging stations and calculate accurate distances.
                                </Text>
                            </View>
                        </View>

                        {/* Camera */}
                        <View style={[
                            styles.permissionItem,
                            activeStep === 'camera' && styles.permissionItemActive,
                            { backgroundColor: isDark ? '#252525' : '#F5F7FA' }
                        ]}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 176, 116, 0.12)' }]}>
                                <Camera size={22} color="#00B074" />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>Camera Access</Text>
                                <Text style={[styles.itemDesc, { color: theme.textSecondary }]}>
                                    Scan QR codes on charger boxes to initiate charging sessions instantly.
                                </Text>
                            </View>
                        </View>

                        {/* Notifications */}
                        <View style={[
                            styles.permissionItem,
                            activeStep === 'notifications' && styles.permissionItemActive,
                            { backgroundColor: isDark ? '#252525' : '#F5F7FA' }
                        ]}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 176, 116, 0.12)' }]}>
                                <Bell size={22} color="#00B074" />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>Notifications</Text>
                                <Text style={[styles.itemDesc, { color: theme.textSecondary }]}>
                                    Get live updates on charging progress, receipts, and slot reminders.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={styles.primaryBtn}
                            activeOpacity={0.8}
                            onPress={handleAgree}
                            disabled={isRequesting}
                        >
                            {isRequesting ? (
                                <View style={styles.btnRow}>
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                    <Text style={styles.primaryBtnText}>Requesting System Permissions...</Text>
                                </View>
                            ) : (
                                <View style={styles.btnRow}>
                                    <Text style={styles.primaryBtnText}>Agree & Continue</Text>
                                    <ChevronRight size={20} color="#FFFFFF" />
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            activeOpacity={0.7}
                            onPress={handleSkip}
                            disabled={isRequesting}
                        >
                            <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>
                                Skip for Now
                            </Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20
    },
    card: {
        width: width - 40,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10
    },
    headerIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(0, 176, 116, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
        fontFamily: 'Montserrat'
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
        fontFamily: 'Montserrat'
    },
    permissionList: {
        width: '100%',
        gap: 12,
        marginBottom: 24
    },
    permissionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    permissionItemActive: {
        borderColor: '#00B074'
    },
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14
    },
    itemTextContainer: {
        flex: 1
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
        fontFamily: 'Montserrat'
    },
    itemDesc: {
        fontSize: 12,
        lineHeight: 16,
        fontFamily: 'Montserrat'
    },
    actionsContainer: {
        width: '100%',
        gap: 10
    },
    primaryBtn: {
        height: 52,
        borderRadius: 26,
        backgroundColor: '#00B074',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#00B074',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Montserrat'
    },
    secondaryBtn: {
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center'
    },
    secondaryBtnText: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Montserrat'
    }
});
