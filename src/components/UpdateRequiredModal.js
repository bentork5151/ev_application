import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Platform, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function UpdateRequiredModal({ visible, onUpdate, isForce = true, onLater }) {
    const { theme } = useTheme();
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

    const handleUpdate = async () => {
        try {
            const playStoreUrl =
                Platform.OS === 'android'
                    ? 'market://details?id=com.bentork.application'
                    : 'https://play.google.com/store/apps/details?id=com.bentork.application';

            const canOpen = await Linking.canOpenURL(playStoreUrl);
            if (canOpen) {
                await Linking.openURL(playStoreUrl);
            } else {
                await Linking.openURL(
                    'https://play.google.com/store/apps/details?id=com.bentork.application'
                );
            }
        } catch (e) {
            console.warn('Could not open Play Store:', e);
        }
        onUpdate?.();
    };

    const titleText = isForce ? "Update Required" : "New Version Available";
    const bodyText = isForce
        ? "An important update is available with security enhancements and fixes. Please download the latest version to continue."
        : "A new update is available with improvements and new features. Would you like to update now?";

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={() => {
                if (!isForce) {
                    onLater?.();
                }
            }}
        >
            <Animated.View style={[styles.overlay, { backgroundColor: theme.overlayBg }, overlayStyle]}>
                <Animated.View style={[styles.card, { backgroundColor: theme.background }, cardStyle]}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>{titleText}</Text>

                    <Text style={[styles.body, { color: theme.textSecondary }]}>{bodyText}</Text>

                    <TouchableOpacity
                        onPress={handleUpdate}
                        activeOpacity={0.8}
                        style={[styles.updateBtn, { backgroundColor: theme.white }]}
                    >
                        <Text style={[styles.updateBtnText, { color: theme.textPrimary }]}>Update Now</Text>
                    </TouchableOpacity>

                    {!isForce && (
                        <TouchableOpacity
                            onPress={onLater}
                            activeOpacity={0.8}
                            style={styles.laterBtn}
                        >
                            <Text style={[styles.laterBtnText, { color: theme.textSecondary }]}>Later</Text>
                        </TouchableOpacity>
                    )}
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
        paddingHorizontal: 32,
    },
    card: {
        width: '100%',
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 12,
    },
    body: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        fontWeight: '600',
    },
    updateBtn: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    updateBtnText: {
        fontSize: 16,
        fontWeight: '900',
    },
    laterBtn: {
        width: '100%',
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    laterBtnText: {
        fontSize: 15,
        fontWeight: '800',
    },
});
