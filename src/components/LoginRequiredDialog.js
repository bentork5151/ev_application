import React, { useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function LoginRequiredDialog({ visible, contextMessage, onLoginPress, onClose }) {
    const { theme } = useTheme();
    const progress = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(progress, {
            toValue: visible ? 1 : 0,
            duration: 250,
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
                    outputRange: [150, 0],
                }),
            },
            {
                scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                }),
            },
        ],
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.overlay, { backgroundColor: theme.overlayBg }, overlayStyle]}>
                <Animated.View style={[styles.dialogContainer, { backgroundColor: theme.background }, cardStyle]}>
                    <View style={[styles.iconWrapper, { backgroundColor: theme.white }]}>
                        <Lock size={24} color={theme.textPrimary} />
                    </View>

                    <Text style={[styles.title, { color: theme.textPrimary }]}>Login Required</Text>
                    <Text style={[styles.message, { color: theme.textSecondary }]}>
                        {contextMessage || "Please sign in to access all features."}
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.white }]} onPress={onLoginPress}>
                            <Text style={[styles.primaryButtonText, { color: theme.textPrimary }]}>Login / Sign Up</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
                            <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>Maybe Later</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dialogContainer: {
        width: width * 0.85,
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    iconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
        fontWeight: '600',
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '900',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '800',
    },
});
