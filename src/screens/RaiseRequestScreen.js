import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, CheckCircle2, Image as ImageIcon, Info, Bolt, User } from 'lucide-react-native';
import { authService } from '../services/auth';
import { supportApi } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../context/ThemeContext';

export default function RaiseRequestScreen({ navigation }) {
    const { theme, isDark } = useTheme();
    const { showAlert } = useAlert();

    const [customerFullName, setCustomerFullName] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('AC Fast Charger');
    const [customProductName, setCustomProductName] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [issueDescription, setIssueDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [photoBase64, setPhotoBase64] = useState('');

    const handleLaunchCamera = () => {
        const options = {
            mediaType: 'photo',
            includeBase64: true,
            quality: 0.7,
            maxWidth: 1200,
            maxHeight: 1200,
        };

        launchCamera(options, (response) => {
            if (response.didCancel) {
                console.log('User cancelled camera capture');
            } else if (response.errorMessage) {
                console.log('Camera Error: ', response.errorMessage);
                showAlert("Camera Error", response.errorMessage);
            } else if (response.assets && response.assets.length > 0) {
                const asset = response.assets[0];
                if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
                    showAlert("Image Too Large", "The captured photo is larger than 2MB after compression. Please try capturing with lower resolution.");
                    return;
                }
                setPhotoBase64(`data:image/jpeg;base64,${asset.base64}`);
            }
        });
    };

    const handleLaunchGallery = () => {
        const options = {
            mediaType: 'photo',
            includeBase64: true,
            quality: 0.7,
            maxWidth: 1200,
            maxHeight: 1200,
        };

        launchImageLibrary(options, (response) => {
            if (response.didCancel) {
                console.log('User cancelled gallery picker');
            } else if (response.errorMessage) {
                console.log('Gallery Error: ', response.errorMessage);
                showAlert("Gallery Error", response.errorMessage);
            } else if (response.assets && response.assets.length > 0) {
                const asset = response.assets[0];
                if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
                    showAlert("Image Too Large", "The selected photo is larger than 2MB after compression. Please choose a smaller photo.");
                    return;
                }
                setPhotoBase64(`data:image/jpeg;base64,${asset.base64}`);
            }
        });
    };

    const handleAttachPhoto = () => {
        Alert.alert(
            "Select Photo Source",
            "Choose how you would like to select the attachment photo",
            [
                { text: "Take Photo", onPress: handleLaunchCamera },
                { text: "Choose from Gallery", onPress: handleLaunchGallery },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const productOptions = [
        'AC Fast Charger',
        'DC Dual Charger',
        'RFID Card',
        'Mobile App',
        'Wallet Payment',
        'Bentork Battery',
        'Other Battery',
        'Other (Custom Product)'
    ];

    const loadUser = useCallback(async () => {
        try {
            const userData = await authService.getUser();
            if (userData?.name) {
                setCustomerFullName(userData.name);
            }
        } catch (error) {
            console.error("Failed to load screen data:", error);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const handleCreateRequest = async () => {
        if (!customerFullName.trim()) {
            showAlert("Required", "Please provide a customer name.");
            return;
        }
        
        const finalProduct = selectedProduct === 'Other (Custom Product)' 
            ? customProductName.trim() 
            : selectedProduct;

        if (!finalProduct) {
            showAlert("Required", "Please specify the product or enter a custom name.");
            return;
        }

        const isBattery = selectedProduct === 'Bentork Battery' || selectedProduct === 'Other Battery';
        if (isBattery && !invoiceNumber.trim()) {
            showAlert("Required", "Please enter the invoice number.");
            return;
        }

        if (!issueDescription.trim()) {
            showAlert("Required", "Please describe the issue.");
            return;
        }

        setIsSubmitting(true);
        try {
            let finalDescription = issueDescription.trim();
            if (isBattery && invoiceNumber.trim()) {
                finalDescription = `Invoice Number: ${invoiceNumber.trim()}\n\n${finalDescription}`;
            }

            const requestPayload = {
                customerFullName: customerFullName.trim(),
                product: finalProduct,
                issueDescription: finalDescription,
                attachmentUrl: photoBase64 || null
            };

            if (isBattery) {
                requestPayload.invoiceNumber = invoiceNumber.trim();
            }

            const newRequest = await supportApi.createRequest(requestPayload);

            showAlert(
                "Success", 
                "Support request raised successfully! (Request ID: " + newRequest.id + ")",
                [
                    {
                        text: "Track your request",
                        onPress: () => {
                            navigation.replace('RequestStatus');
                        }
                    }
                ]
            );

            // Clear description, custom product name, invoice number, and photo, keep selection and name
            setIssueDescription('');
            setCustomProductName('');
            setInvoiceNumber('');
            setPhotoBase64('');
        } catch (error) {
            console.error("Failed to create request:", error);
            showAlert("Error", "Failed to submit request: " + (error.userMessage || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShowInfo = () => {
        showAlert(
            "Raise Support Ticket",
            "Submit a new ticket with details and photo proof, and our support team will get back to you shortly."
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={[styles.backBtn, { backgroundColor: theme.cardBg }]} 
                    onPress={() => navigation.goBack()} 
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Raise a Request</Text>
                <TouchableOpacity 
                    style={[styles.backBtn, { backgroundColor: theme.cardBg }]} 
                    onPress={handleShowInfo} 
                    activeOpacity={0.7}
                >
                    <Info size={20} color={theme.textPrimary} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Info Card */}
                    <View style={[styles.infoCard, { backgroundColor: theme.cardBg }]}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.white }]}>
                            <Bolt size={20} color={theme.textPrimary} />
                        </View>
                        <View style={styles.infoTextContainer}>
                            <Text style={[styles.infoCardTitle, { color: theme.textPrimary }]}>
                                New Support <Text style={{ color: '#00B074' }}>Ticket</Text>
                            </Text>
                            <Text style={[styles.infoCardSubtitle, { color: theme.textSecondary }]}>
                                Describe your issue and we'll handle the rest
                            </Text>
                        </View>
                    </View>

                    {/* Form Card */}
                    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.formHeaderRow}>
                            <View style={styles.verticalIndicator} />
                            <View>
                                <Text style={[styles.formHeaderTitle, { color: theme.textPrimary }]}>New Support Ticket</Text>
                                <Text style={[styles.formHeaderSubtitle, { color: theme.textSecondary }]}>Fill in the details below</Text>
                            </View>
                        </View>

                        {/* Customer Name */}
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Your Full Name</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.white }]}>
                            <User size={20} color={theme.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.textInput, { color: theme.textPrimary }]}
                                placeholder="Name goes here"
                                placeholderTextColor="#7E8E9F"
                                value={customerFullName}
                                onChangeText={setCustomerFullName}
                            />
                        </View>

                        {/* Product Dropdown */}
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Product / Module</Text>
                        <TouchableOpacity
                            style={[
                                styles.dropdownSelector,
                                { backgroundColor: theme.white },
                                showDropdown && styles.dropdownSelectorActive
                            ]}
                            onPress={() => setShowDropdown(!showDropdown)}
                            activeOpacity={0.8}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Bolt size={18} color={theme.textSecondary} style={{ marginRight: 12 }} />
                                <Text style={[styles.dropdownSelectorText, { color: theme.textPrimary }]}>{selectedProduct}</Text>
                            </View>
                            <ChevronDown size={20} color={theme.textSecondary} />
                        </TouchableOpacity>

                        {showDropdown && (
                            <View style={[styles.dropdownOptionsContainer, { backgroundColor: theme.white, borderTopColor: theme.divider }]}>
                                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
                                    {productOptions.map((opt) => {
                                        const isSelected = selectedProduct === opt;
                                        return (
                                            <TouchableOpacity
                                                key={opt}
                                                style={[
                                                    styles.dropdownOptionItem,
                                                    isSelected && [styles.dropdownOptionItemSelected, { backgroundColor: isDark ? 'rgba(0, 176, 116, 0.15)' : 'rgba(0, 176, 116, 0.08)' }]
                                                ]}
                                                onPress={() => {
                                                    setSelectedProduct(opt);
                                                    setShowDropdown(false);
                                                    if (opt !== 'Bentork Battery' && opt !== 'Other Battery') {
                                                        setInvoiceNumber('');
                                                    }
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[
                                                    styles.dropdownOptionItemText,
                                                    { color: theme.textSecondary },
                                                    isSelected && styles.dropdownOptionItemTextSelected
                                                ]}>
                                                    {opt}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* Custom Product Input (if 'Other' selected) */}
                        {selectedProduct === 'Other (Custom Product)' && (
                            <View>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Custom Product Name</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: theme.white }]}>
                                    <TextInput
                                        style={[styles.textInput, { color: theme.textPrimary }]}
                                        placeholder="Enter product name"
                                        placeholderTextColor="#7E8E9F"
                                        value={customProductName}
                                        onChangeText={setCustomProductName}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Invoice Number (for Battery Issues) */}
                        {(selectedProduct === 'Bentork Battery' || selectedProduct === 'Other Battery') && (
                            <View>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Invoice Number</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: theme.white }]}>
                                    <TextInput
                                        style={[styles.textInput, { color: theme.textPrimary }]}
                                        placeholder="e.g. INV-12345"
                                        placeholderTextColor="#7E8E9F"
                                        value={invoiceNumber}
                                        onChangeText={setInvoiceNumber}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Issue Description */}
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Describe your issue</Text>
                        <TextInput
                            style={[styles.textAreaInput, { backgroundColor: theme.white, color: theme.textPrimary }]}
                            placeholder="Type here..."
                            placeholderTextColor="#7E8E9F"
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                            value={issueDescription}
                            onChangeText={setIssueDescription}
                        />

                        {/* Photo Attachment Container */}
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Photo Attachment (Optional)</Text>
                        <View style={styles.photoContainer}>
                            {photoBase64 ? (
                                <View style={[styles.photoPreviewBox, { backgroundColor: theme.white }]}>
                                    <Image source={{ uri: photoBase64 }} style={styles.previewImage} />
                                    <View style={styles.photoInfoContainer}>
                                        <View style={styles.statusRow}>
                                            <CheckCircle2 size={16} color="#00B074" style={styles.statusIcon} />
                                            <Text style={styles.photoUploadedText}>Attached</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => setPhotoBase64('')} style={styles.removePhotoBtn}>
                                            <Text style={styles.removePhotoText}>Remove Photo</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={[styles.photoUploadBtn, { backgroundColor: theme.white, borderColor: theme.divider }]} 
                                    onPress={handleAttachPhoto}
                                    activeOpacity={0.7}
                                >
                                    <ImageIcon size={28} color={theme.textSecondary} style={{ marginBottom: 6 }} />
                                    <Text style={[styles.photoUploadBtnText, { color: theme.textPrimary }]}>Choose Photo</Text>
                                    <Text style={[styles.photoUploadSubtext, { color: theme.textSecondary }]}>Max size 2MB</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity 
                            style={[styles.submitBtn, { backgroundColor: theme.white }]} 
                            onPress={handleCreateRequest}
                            disabled={isSubmitting}
                            activeOpacity={0.8}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#00B074" />
                            ) : (
                                <Text style={[styles.submitBtnText, { color: theme.textPrimary }]}>Submit Request</Text>
                            )}
                        </TouchableOpacity>

                        <Text style={[styles.footerNote, { color: theme.textSecondary }]}>Your ticket will appear in Support Status</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
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
        paddingBottom: 15,
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
        fontSize: 18,
        fontWeight: '900',
        flex: 1,
        textAlign: 'center',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 28,
        padding: 20,
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 28,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '800',
        height: '100%',
        padding: 0,
    },
    dropdownSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 28,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
    },
    dropdownSelectorActive: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    dropdownSelectorText: {
        fontSize: 14,
        fontWeight: '800',
    },
    dropdownOptionsContainer: {
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        borderTopWidth: 1,
        paddingVertical: 8,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dropdownOptionItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    dropdownOptionItemSelected: {
    },
    dropdownOptionItemText: {
        fontSize: 14,
        fontWeight: '700',
    },
    dropdownOptionItemTextSelected: {
        color: '#00B074',
        fontWeight: '900',
    },
    textAreaInput: {
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 16,
        fontSize: 14,
        fontWeight: '800',
        height: 120,
        marginBottom: 20,
    },
    submitBtn: {
        borderRadius: 28,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    submitBtnText: {
        fontSize: 15,
        fontWeight: '900',
    },
    infoCard: {
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 16,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoTextContainer: {
        flex: 1,
    },
    infoCardTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    infoCardSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
        marginTop: 4,
    },
    photoContainer: {
        marginBottom: 20,
    },
    photoUploadBtn: {
        height: 140,
        borderRadius: 24,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoUploadBtnText: {
        fontSize: 14,
        fontWeight: '800',
    },
    photoUploadSubtext: {
        fontSize: 11,
        marginTop: 4,
        fontWeight: '600',
    },
    photoPreviewBox: {
        height: 110,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    previewImage: {
        width: 86,
        height: 86,
        borderRadius: 16,
        marginRight: 16,
    },
    photoInfoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    statusIcon: {
        marginRight: 6,
    },
    photoUploadedText: {
        color: '#00B074',
        fontSize: 13,
        fontWeight: '900',
    },
    removePhotoBtn: {
        marginTop: 4,
        alignSelf: 'flex-start',
    },
    removePhotoText: {
        color: '#EF5350',
        fontSize: 12,
        fontWeight: '800',
    },
    formHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    verticalIndicator: {
        width: 4,
        height: 24,
        backgroundColor: '#00B074',
        marginRight: 10,
        borderRadius: 2,
    },
    formHeaderTitle: {
        fontSize: 16,
        fontWeight: '900',
    },
    formHeaderSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    footerNote: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 12,
    }
});
