import React, { useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, buttons = [], onClose }) => {
    const { theme } = useTheme();
    const progress = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
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

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.overlay, { backgroundColor: theme.overlayBg }, overlayStyle]}>
                <Animated.View style={[styles.alertContainer, { backgroundColor: theme.background }, cardStyle]}>
                    {title && <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>}
                    {message && <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>}

                    <View style={styles.buttonContainer}>
                        {buttons.length > 0 ? (
                            buttons.map((btn, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        { backgroundColor: theme.white },
                                        btn.style === 'cancel' && styles.cancelButton,
                                        btn.style === 'destructive' && styles.destructiveButton,
                                    ]}
                                    onPress={() => {
                                        if (btn.onPress) btn.onPress();
                                        onClose();
                                    }}
                                >
                                    <Text style={[
                                        styles.buttonText,
                                        { color: theme.textPrimary },
                                        btn.style === 'cancel' && [styles.cancelText, { color: theme.textSecondary }],
                                        btn.style === 'destructive' && styles.destructiveText,
                                    ]}>
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <TouchableOpacity style={[styles.button, { backgroundColor: theme.white }]} onPress={onClose}>
                                <Text style={[styles.buttonText, { color: theme.textPrimary }]}>OK</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContainer: {
        width: width * 0.85,
        borderRadius: 28,
        padding: 24,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 10,
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
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
    },
    button: {
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    buttonText: {
        fontWeight: '900',
        fontSize: 14,
    },
    cancelButton: {
        backgroundColor: 'transparent',
    },
    cancelText: {
        fontWeight: '800',
    },
    destructiveButton: {
        backgroundColor: '#EF5350',
    },
    destructiveText: {
        color: '#FFFFFF',
        fontWeight: '900',
    },
});

export default CustomAlert;
