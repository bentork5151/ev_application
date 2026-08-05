import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Vibration, Animated } from 'react-native';
import { X, Delete } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function PinPromptModal({ visible, onClose, onSuccess, mode = 'verify', title }) {
    const { theme } = useTheme();
    const [pin, setPin] = useState('');
    const [step, setStep] = useState(1); // 1: Enter, 2: Confirm (only for 'set' mode)
    const [firstPin, setFirstPin] = useState('');
    const [error, setError] = useState('');
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
        if (visible) {
            resetState();
        }
    }, [visible]);

    const resetState = () => {
        setPin('');
        setStep(1);
        setFirstPin('');
        setError('');
    };

    const handlePress = async (num) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);

            if (newPin.length === 4) {
                if (mode === 'verify') {
                    verifyPin(newPin);
                } else if (mode === 'set') {
                    handleSetPinStep(newPin);
                }
            }
        }
    };

    const handleDelete = () => {
        if (pin.length > 0) {
            setPin(pin.slice(0, -1));
            setError('');
        }
    };

    const verifyPin = async (inputPin) => {
        try {
            const storedPin = await AsyncStorage.getItem('userPin');
            if (storedPin === inputPin) {
                setTimeout(() => {
                    onSuccess();
                    resetState();
                }, 200);
            } else {
                Vibration.vibrate();
                setError('Incorrect PIN. Try again.');
                setPin('');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSetPinStep = (inputPin) => {
        if (step === 1) {
            setFirstPin(inputPin);
            setPin('');
            setStep(2);
            setError('');
        } else {
            if (inputPin === firstPin) {
                savePin(inputPin);
            } else {
                Vibration.vibrate();
                setError('PINs do not match. Try again.');
                setPin('');
                setFirstPin('');
                setStep(1);
            }
        }
    };

    const savePin = async (newPin) => {
        try {
            await AsyncStorage.setItem('userPin', newPin);
            await AsyncStorage.setItem('secureWallet', 'true');
            setTimeout(() => {
                onSuccess();
                resetState();
            }, 200);
        } catch (e) {
            console.error(e);
        }
    };

    const renderDot = (index) => (
        <View style={[styles.dot, { borderColor: theme.divider }, pin.length > index && styles.dotActive]} />
    );

    const renderKey = (num) => (
        <TouchableOpacity key={num} style={[styles.key, { backgroundColor: theme.white }]} onPress={() => handlePress(num)} activeOpacity={0.7}>
            <Text style={[styles.keyText, { color: theme.textPrimary }]}>{num}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[styles.container, { backgroundColor: theme.overlayBg }, overlayStyle]}>
                <Animated.View style={[styles.content, { backgroundColor: theme.background }, cardStyle]}>
                    {/* Header */}
                    <View style={styles.header}>
                        {onClose && (
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={[styles.title, { color: theme.textPrimary }]}>
                        {mode === 'set'
                            ? (step === 1 ? 'Set a 4-digit PIN' : 'Confirm your PIN')
                            : (title || 'Enter PIN')}
                    </Text>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.dotsContainer}>
                        {[0, 1, 2, 3].map((i) => <View key={i}>{renderDot(i)}</View>)}
                    </View>

                    {/* Keypad */}
                    <View style={styles.keypad}>
                        <View style={styles.row}>
                            {[1, 2, 3].map(renderKey)}
                        </View>
                        <View style={styles.row}>
                            {[4, 5, 6].map(renderKey)}
                        </View>
                        <View style={styles.row}>
                            {[7, 8, 9].map(renderKey)}
                        </View>
                        <View style={styles.row}>
                            <View style={styles.keyEmpty} />
                            {renderKey(0)}
                            <TouchableOpacity style={[styles.key, { backgroundColor: theme.white }]} onPress={handleDelete}>
                                <Delete size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        borderRadius: 28,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    header: {
        width: '100%',
        alignItems: 'flex-end',
        marginBottom: 10,
    },
    closeBtn: {
        padding: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 20,
        textAlign: 'center',
    },
    errorText: {
        color: '#EF5350',
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 10,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 40,
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        backgroundColor: 'transparent',
    },
    dotActive: {
        backgroundColor: '#00B074',
        borderColor: '#00B074',
    },
    keypad: {
        width: '100%',
        gap: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
    },
    key: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyEmpty: {
        width: 70,
        height: 70,
    },
    keyText: {
        fontSize: 28,
        fontWeight: '900',
    }
});
