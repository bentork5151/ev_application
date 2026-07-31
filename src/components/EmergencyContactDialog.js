import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Linking, Platform, Dimensions, ActivityIndicator, Animated } from 'react-native';
import { Phone, X, User, ShieldAlert, Building2 } from 'lucide-react-native';
import { emergencyApi } from '../services/api';

const { width } = Dimensions.get('window');

const EmergencyContactDialog = ({ visible, onClose, stationId }) => {
    const [contact, setContact] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(progress, {
            toValue: visible ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    const overlayStyle = {
        opacity: progress,
    };

    const cardStyle = {
        opacity: progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
        }),
        transform: [
            {
                translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                }),
            },
            {
                scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                }),
            },
        ],
    };

    useEffect(() => {
        if (visible && stationId) {
            fetchContact();
        }
    }, [visible, stationId]);

    const fetchContact = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await emergencyApi.getContact(stationId);
            const contactData = Array.isArray(data) ? data[0] : data;

            if (contactData) {
                setContact(contactData);
            } else {
                setError("No contact details found.");
            }
        } catch (err) {
            console.error("Failed to fetch emergency contact", err);
            if (err.response) {
                const status = err.response.status;
                if (status === 404) {
                    setError("No emergency contact found.");
                } else {
                    setError("Unable to load contact details.");
                }
            } else {
                setError("Unable to load contact details.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    const cpuNumber = contact?.cpoPhoneNumber || contact?.contactNumber || contact?.phoneNumber || contact?.phone || contact?.emergencyContact;
    const companyNumber = contact?.companySupportNumber || contact?.companyPhone || contact?.supportNumber;
    const stationName = 'Station Support';

    const handleCall = (number) => {
        if (!number) return;
        const scheme = Platform.OS === 'android' ? 'tel:' : 'telprompt:';
        Linking.openURL(`${scheme}${number}`);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.overlay, overlayStyle]}>
                <Animated.View style={[styles.dialogContainer, cardStyle]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.titleRow}>
                            <View style={styles.iconContainer}>
                                <ShieldAlert size={20} color="#EF5350" />
                            </View>
                            <Text style={styles.title}>Emergency Support</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={20} color="#5A6B7C" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        Contact support for immediate assistance with safety or operational issues.
                    </Text>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#00B074" />
                            <Text style={styles.loadingText}>Loading contact info...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={fetchContact}>
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        contact && (
                            <View style={styles.card}>
                                <View style={styles.managerHeader}>
                                    <View style={styles.avatar}>
                                        <User size={20} color="#1A1A1A" />
                                    </View>
                                    <View>
                                        <Text style={styles.managerName}>{stationName}</Text>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                {/* Actions */}
                                <View style={styles.actionContainer}>
                                    <TouchableOpacity
                                        style={[styles.actionRow, !cpuNumber && styles.disabledAction]}
                                        onPress={() => handleCall(cpuNumber)}
                                        disabled={!cpuNumber}
                                    >
                                        <View style={[styles.actionIcon, { backgroundColor: '#E2E7EC' }]}>
                                            <Phone size={18} color="#00B074" />
                                        </View>
                                        <View style={styles.actionTextContainer}>
                                            <Text style={styles.actionLabel}>CPO Support</Text>
                                            <Text style={[styles.actionValue, { color: '#00B074' }]}>
                                                {cpuNumber || 'Not Available'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionRow, !companyNumber && styles.disabledAction]}
                                        onPress={() => handleCall(companyNumber)}
                                        disabled={!companyNumber}
                                    >
                                        <View style={[styles.actionIcon, { backgroundColor: '#E2E7EC' }]}>
                                            <Building2 size={18} color="#0086FF" />
                                        </View>
                                        <View style={styles.actionTextContainer}>
                                            <Text style={styles.actionLabel}>Company Support</Text>
                                            <Text style={[styles.actionValue, { color: '#0086FF' }]}>
                                                {companyNumber || 'Not Available'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )
                    )}

                    {/* Dismiss Button */}
                    <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
                        <Text style={styles.dismissText}>Dismiss</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    dialogContainer: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#E2E7EC',
        borderRadius: 28,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1A1A1A',
    },
    closeButton: {
        padding: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#5A6B7C',
        marginBottom: 24,
        lineHeight: 20,
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 16,
        marginBottom: 24,
    },
    managerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E2E7EC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    managerName: {
        fontSize: 16,
        fontWeight: '900',
        color: '#1A1A1A',
    },
    divider: {
        height: 1,
        backgroundColor: '#BFC7CE',
        marginBottom: 16,
    },
    actionContainer: {
        gap: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionTextContainer: {
        flex: 1,
    },
    actionLabel: {
        fontSize: 12,
        color: '#5A6B7C',
        fontWeight: '600',
        marginBottom: 2,
    },
    actionValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    disabledAction: {
        opacity: 0.5,
    },
    dismissButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dismissText: {
        color: '#1A1A1A',
        fontWeight: '900',
        fontSize: 14,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    loadingText: {
        color: '#5A6B7C',
        fontWeight: '600',
        marginTop: 10,
    },
    errorContainer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    errorText: {
        color: '#EF5350',
        fontWeight: '700',
        marginBottom: 15,
        textAlign: 'center',
    },
    retryBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
    },
    retryText: {
        color: '#1A1A1A',
        fontWeight: '800',
    }
});

export default EmergencyContactDialog;
