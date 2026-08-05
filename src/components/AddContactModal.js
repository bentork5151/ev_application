import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { X, User, Phone, Mail } from 'lucide-react-native';

export default function AddContactModal({ visible, onClose, onSave }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
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

    const handleSave = () => {
        if (!name.trim() || !phone.trim()) {
            return;
        }
        onSave({
            name,
            phone,
            email,
        });
        setName('');
        setPhone('');
        setEmail('');
    };

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <Animated.View style={[styles.modalOverlay, overlayStyle]}>
                    <Animated.View style={[styles.modalContent, cardStyle]}>
                        <View style={styles.header}>
                            <Text style={styles.title}>New Contact</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Full Name</Text>
                                <View style={styles.inputContainer}>
                                    <User size={20} color="#5A6B7C" style={styles.icon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter full name"
                                        placeholderTextColor="#7E8E9F"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Phone Number</Text>
                                <View style={styles.inputContainer}>
                                    <Phone size={20} color="#5A6B7C" style={styles.icon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter phone number"
                                        placeholderTextColor="#7E8E9F"
                                        keyboardType="phone-pad"
                                        value={phone}
                                        onChangeText={setPhone}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email Address</Text>
                                <View style={styles.inputContainer}>
                                    <Mail size={20} color="#5A6B7C" style={styles.icon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter email address"
                                        placeholderTextColor="#7E8E9F"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={setEmail}
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.saveBtn, (!name.trim() || !phone.trim()) && styles.saveBtnDisabled]} 
                                onPress={handleSave}
                                disabled={!name.trim() || !phone.trim()}
                            >
                                <Text style={styles.saveBtnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        width: '100%',
    },
    modalContent: {
        backgroundColor: '#E2E7EC', 
        borderRadius: 28,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        paddingVertical: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        color: '#1A1A1A',
        fontSize: 20,
        fontWeight: '900',
    },
    closeBtn: {
        padding: 5,
    },
    form: {
        paddingHorizontal: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#5A6B7C',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        paddingHorizontal: 16,
        height: 56,
    },
    icon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#1A1A1A',
        fontSize: 14,
        fontWeight: '800',
        height: '100%',
        padding: 0,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#BFC7CE',
        gap: 15,
    },
    cancelBtn: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#5A6B7C',
        fontSize: 16,
        fontWeight: '800',
    },
    saveBtn: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveBtnText: {
        color: '#1A1A1A',
        fontSize: 16,
        fontWeight: '900',
    },
});
