import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar, Alert, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, ShieldCheck, ShieldAlert, AlertTriangle, Image as ImageIcon, Calendar, Barcode, User, Cpu, Info, CheckCircle2, ChevronDown } from 'lucide-react-native';
import { authService } from '../services/auth';
import { batteryApi, warrantyClaimApi } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import LoginRequiredDialog from '../components/LoginRequiredDialog';
import { useTheme } from '../context/ThemeContext';

export default function BatteryWarrantyScreen({ navigation }) {
    const { theme, isDark } = useTheme();
    const { showAlert } = useAlert();
    const [isGuest, setIsGuest] = useState(false);
    const [loginPromptVisible, setLoginPromptVisible] = useState(false);

    // Bentork Battery Flow states
    const [currentStep, setCurrentStep] = useState(1);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchedBattery, setSearchedBattery] = useState(null); 
    const [searchResults, setSearchResults] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [showBatchDropdown, setShowBatchDropdown] = useState(false);

    // Claim Form states
    const [claimIssueDescription, setClaimIssueDescription] = useState('');
    const [photoBase64, setPhotoBase64] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTncModal, setShowTncModal] = useState(false);
    const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

    // Input Focus states
    const [focusedField, setFocusedField] = useState(null);

    // App User Full Name
    const [customerFullName, setCustomerFullName] = useState('');

    // Load active user's details for form fields
    const loadUser = useCallback(async () => {
        try {
            const userData = await authService.getUser();
            if (userData?.name) {
                setCustomerFullName(userData.name);
            }
        } catch (error) {
            console.error("Failed to load user info:", error);
        }
    }, []);

    useEffect(() => {
        const checkGuest = async () => {
            const guest = await authService.isGuestMode();
            setIsGuest(guest);
            if (guest) {
                setLoginPromptVisible(true);
            } else {
                loadUser();
            }
        };
        checkGuest();
    }, [loadUser]);

    // Handle searching Battery by Invoice
    const handleSearchBattery = async () => {
        if (!invoiceNumber.trim()) {
            showAlert("Required", "Please enter an invoice number to search.");
            return;
        }

        setIsSearching(true);
        setSearchedBattery(null);
        setSearchResults([]);
        setSearchPerformed(true);

        try {
            const results = await batteryApi.searchByInvoice(invoiceNumber.trim());
            if (results && results.length > 0) {
                setSearchResults(results);
                // Take first matched battery
                setSearchedBattery(results[0]);
                setSelectedBatch(results[0].barcode || 'N/A');
                setCurrentStep(2);
            } else {
                setSearchResults([]);
                setSearchedBattery(null);
                setSelectedBatch('');
            }
        } catch (error) {
            console.error("Search failed:", error);
            showAlert("Search Error", error.userMessage || error.message || "Failed to search battery database.");
        } finally {
            setIsSearching(false);
        }
    };

    // Handle raising a warranty claim
    const handleSubmitClaim = async () => {
        if (!searchedBattery) return;

        if (!claimIssueDescription.trim()) {
            showAlert("Required", "Please enter a description of the issue.");
            return;
        }
        if (!photoBase64) {
            showAlert("Required", "Please select/simulate a photo upload.");
            return;
        }
        if (!termsAccepted) {
            showAlert("Terms & Conditions", "You must accept the terms and conditions to proceed.");
            return;
        }

        setIsSubmittingClaim(true);
        try {
            const payload = {
                batteryDataId: searchedBattery.id,
                issueDescription: claimIssueDescription.trim(),
                photoBase64: photoBase64,
                termsAccepted: termsAccepted
            };

            const response = await warrantyClaimApi.createClaim(payload);
            showAlert(
                "Claim Created",
                `Warranty claim successfully submitted!\nClaim ID: ${response.id}\nStatus: ${response.status}`,
                [{ text: "Done", onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error("Failed to create claim:", error);
            showAlert("Submission Error", error.userMessage || error.message || "Failed to submit warranty claim.");
        } finally {
            setIsSubmittingClaim(false);
        }
    };

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
            "Upload Defect Photo",
            "Choose a source to attach your defect proof",
            [
                { text: "Take Photo (Camera)", onPress: handleLaunchCamera },
                { text: "Choose from Gallery", onPress: handleLaunchGallery },
                { text: "Cancel", style: "cancel" }
            ],
            { cancelable: true }
        );
    };

    const handleBackPress = () => {
        if (currentStep === 3) {
            setCurrentStep(2);
        } else if (currentStep === 2) {
            setCurrentStep(1);
            setSearchPerformed(false);
        } else {
            navigation.goBack();
        }
    };

    const styles = getStyles(theme, isDark);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={handleBackPress} activeOpacity={0.7}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Claim a Warranty</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Visual Step Tracker */}
            <View style={styles.stepsWrapper}>
                <View style={styles.stepContainer}>
                    <View style={[
                        styles.stepCircle,
                        currentStep === 1 && styles.stepCircleActive,
                        currentStep > 1 && styles.stepCircleCompleted
                    ]}>
                        {currentStep > 1 ? (
                            <Text style={styles.stepCheck}>✓</Text>
                        ) : (
                            <Text style={[styles.stepNumber, currentStep === 1 && styles.stepNumberActive]}>1</Text>
                        )}
                    </View>
                    <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>LOOKUP</Text>
                </View>

                <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />

                <View style={styles.stepContainer}>
                    <View style={[
                        styles.stepCircle,
                        currentStep === 2 && styles.stepCircleActive,
                        currentStep > 2 && styles.stepCircleCompleted
                    ]}>
                        {currentStep > 2 ? (
                            <Text style={styles.stepCheck}>✓</Text>
                        ) : (
                            <Text style={[styles.stepNumber, currentStep === 2 && styles.stepNumberActive]}>2</Text>
                        )}
                    </View>
                    <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>SELECT</Text>
                </View>

                <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />

                <View style={styles.stepContainer}>
                    <View style={[
                        styles.stepCircle,
                        currentStep === 3 && styles.stepCircleActive
                    ]}>
                        <Text style={[styles.stepNumber, currentStep === 3 && styles.stepNumberActive]}>3</Text>
                    </View>
                    <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>FILE</Text>
                </View>
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
                    {/* Step 1: Lookup screen */}
                    {currentStep === 1 && (
                        <View style={styles.card}>
                            <View style={styles.cardHeaderWithIcon}>
                                <ShieldCheck size={24} color="#00B074" style={{ marginRight: 8 }} />
                                <Text style={styles.cardHeaderTitle}>Battery Warranty Support</Text>
                            </View>
                            <Text style={styles.cardHeaderDesc}>
                                Enter your invoice number to look up registered batterie(s).
                            </Text>

                            <Text style={styles.inputLabel}>Invoice Number</Text>
                            <View style={styles.searchContainer}>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Enter Invoice Number"
                                    placeholderTextColor="#7E8E9F"
                                    value={invoiceNumber}
                                    onChangeText={setInvoiceNumber}
                                    onFocus={() => setFocusedField('invoice')}
                                    onBlur={() => setFocusedField(null)}
                                />
                                <TouchableOpacity
                                    style={styles.searchBtn}
                                    onPress={handleSearchBattery}
                                    disabled={isSearching}
                                    activeOpacity={0.8}
                                >
                                    {isSearching ? (
                                        <ActivityIndicator color={theme.textPrimary} size="small" />
                                    ) : (
                                        <Search size={20} color={theme.textPrimary} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Loading State */}
                    {isSearching && (
                        <View style={styles.centerLoading}>
                            <ActivityIndicator size="large" color="#00B074" />
                            <Text style={styles.loadingText}>Searching battery records...</Text>
                        </View>
                    )}

                    {/* Step 1 Not Found Error */}
                    {currentStep === 1 && searchPerformed && !searchedBattery && !isSearching && (
                        <View style={styles.errorCard}>
                            <AlertTriangle size={28} color="#EF5350" />
                            <Text style={styles.errorTitle}>Battery Not Found</Text>
                            <Text style={styles.errorDesc}>
                                No registered battery data was found for invoice "{invoiceNumber}". Please verify the invoice number or contact support.
                            </Text>
                        </View>
                    )}

                    {/* Step 2: Select registered battery */}
                    {currentStep === 2 && searchedBattery && !isSearching && (
                        <View style={styles.card}>
                            <View style={styles.cardHeaderWithIcon}>
                                <ShieldCheck size={24} color="#00B074" style={{ marginRight: 8 }} />
                                <Text style={styles.cardHeaderTitle}>Battery Registered Data</Text>
                            </View>

                            {/* Batch/Serial Number switcher dropdown */}
                            {searchResults.length > 0 && (
                                <View style={styles.switcherContainer}>
                                    <Text style={styles.switcherLabel}>Select Barcode</Text>
                                    <TouchableOpacity
                                        style={[
                                            styles.dropdownSelector,
                                            showBatchDropdown && styles.dropdownSelectorActive
                                        ]}
                                        onPress={() => setShowBatchDropdown(!showBatchDropdown)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.dropdownSelectorText}>
                                            {searchedBattery?.barcode || `N/A`}
                                        </Text>
                                        <ChevronDown size={20} color={theme.textSecondary} />
                                    </TouchableOpacity>

                                    {showBatchDropdown && (
                                        <View style={styles.dropdownOptionsContainer}>
                                            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
                                                {searchResults.map((battery, idx) => {
                                                    const isSelected = searchedBattery?.id === battery.id;
                                                    return (
                                                        <TouchableOpacity
                                                            key={battery.id || idx}
                                                            style={[
                                                                styles.dropdownOptionItem,
                                                                isSelected && styles.dropdownOptionItemSelected
                                                            ]}
                                                            onPress={() => {
                                                                setSearchedBattery(battery);
                                                                setSelectedBatch(battery.barcode || 'N/A');
                                                                setShowBatchDropdown(false);
                                                            }}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Text style={[
                                                                styles.dropdownOptionItemText,
                                                                isSelected && styles.dropdownOptionItemTextSelected
                                                            ]}>
                                                                {isSelected ? `✓ ${battery.barcode || `BAT${idx + 1}`}` : (battery.barcode || `BAT${idx + 1}`)}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Battery Details Subcard */}
                            <View style={styles.detailsSubCard}>
                                <View style={styles.detailRow}>
                                    <User size={16} color={theme.textSecondary} style={styles.detailIcon} />
                                    <View>
                                        <Text style={styles.detailLabel}>Customer Name</Text>
                                        <Text style={styles.detailValue}>{searchedBattery.customerName}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailRow}>
                                    <Cpu size={16} color={theme.textSecondary} style={styles.detailIcon} />
                                    <View>
                                        <Text style={styles.detailLabel}>Product Details</Text>
                                        <Text style={styles.detailValue}>{searchedBattery.productDetails}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailRow}>
                                    <Info size={16} color={theme.textSecondary} style={styles.detailIcon} />
                                    <View>
                                        <Text style={styles.detailLabel}>Invoice Number</Text>
                                        <Text style={styles.detailValue}>{searchedBattery.invoiceNumber}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailRow}>
                                    <Barcode size={16} color={theme.textSecondary} style={styles.detailIcon} />
                                    <View>
                                        <Text style={styles.detailLabel}>Barcode</Text>
                                        <Text style={styles.detailValue}>{searchedBattery.barcode || searchedBattery.productSerialNumber || 'N/A'}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailRow}>
                                    <Calendar size={16} color={theme.textSecondary} style={styles.detailIcon} />
                                    <View>
                                        <Text style={styles.detailLabel}>Warranty Dates</Text>
                                        <Text style={styles.detailValue}>
                                            {searchedBattery.warrantyStartDate} to {searchedBattery.warrantyEndDate}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.cardDivider} />

                                <View style={styles.activeLabelRow}>
                                    <View style={[
                                        styles.statusDotCircle,
                                        { backgroundColor: searchedBattery.warrantyActive ? '#00B074' : '#EF5350' }
                                    ]} />
                                    <Text style={[
                                        styles.activeWarrantyText,
                                        { color: searchedBattery.warrantyActive ? '#00B074' : '#EF5350' }
                                    ]}>
                                        {searchedBattery.warrantyActive ? 'WARRANTY IS ACTIVE' : 'WARRANTY EXPIRED'}
                                    </Text>
                                </View>
                            </View>

                            {/* Action Button inside step 2 */}
                            {searchedBattery.warrantyActive ? (
                                <TouchableOpacity
                                    style={styles.claimBtn}
                                    onPress={() => {
                                        setCurrentStep(3);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.claimBtnText}>Claim Warranty</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.expiredInlineCard}>
                                    <ShieldAlert size={20} color="#EF5350" style={{ marginRight: 8 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.expiredTitle}>Warranty Expired</Text>
                                        <Text style={styles.expiredDescInline}>
                                            Warranty expired on {searchedBattery.warrantyEndDate}. You cannot file a claim.
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Step 3: File warranty claim */}
                    {currentStep === 3 && searchedBattery && searchedBattery.warrantyActive && (
                        <View style={styles.card}>
                            <View style={styles.cardHeaderWithIcon}>
                                <ShieldCheck size={24} color="#00B074" style={{ marginRight: 8 }} />
                                <Text style={styles.cardHeaderTitle}>File Warranty Claim</Text>
                            </View>

                            {/* Autofill box */}
                            <Text style={styles.inputLabel}>Product Details</Text>
                            <View style={styles.autofillBox}>
                                <Text style={styles.autofillText}>
                                    • Customer: <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>{searchedBattery.customerName}</Text>
                                </Text>
                                <Text style={styles.autofillText}>
                                    • Invoice: <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>{searchedBattery.invoiceNumber}</Text>
                                </Text>
                                <Text style={styles.autofillText}>
                                    • Model: <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>{searchedBattery.productDetails}</Text>
                                </Text>
                                <Text style={styles.autofillText}>
                                    • Barcode: <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>{searchedBattery.barcode}</Text>
                                </Text>
                                <Text style={styles.autofillText}>
                                    • Warranty: <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>{searchedBattery.warrantyStartDate} to {searchedBattery.warrantyEndDate}</Text>
                                </Text>
                            </View>

                            {/* Issue description input */}
                            <Text style={styles.inputLabel}>Describe Your Issue <Text style={{ color: '#EF5350' }}>*</Text></Text>
                            <TextInput
                                style={styles.textAreaInput}
                                placeholder="Explain the defect / issue with the battery in detail..."
                                placeholderTextColor="#7E8E9F"
                                value={claimIssueDescription}
                                onChangeText={setClaimIssueDescription}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                onFocus={() => setFocusedField('claimDesc')}
                                onBlur={() => setFocusedField(null)}
                            />

                            {/* Photo attachment proof */}
                            <Text style={styles.inputLabel}>Attach Photo <Text style={{ color: '#EF5350' }}>*</Text></Text>
                            <View style={styles.photoContainer}>
                                {photoBase64 ? (
                                    <View style={styles.photoPreviewBox}>
                                        <Image 
                                            source={{ uri: photoBase64 }} 
                                            style={styles.previewImage} 
                                        />
                                        <View style={styles.photoInfoContainer}>
                                            <View style={styles.statusRow}>
                                                <CheckCircle2 size={18} color="#00B074" style={styles.statusIcon} />
                                                <Text style={styles.photoUploadedText}>Photo Attached</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.removePhotoBtn}
                                                onPress={() => setPhotoBase64('')}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.removePhotoText}>Remove Photo</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.photoUploadBtn}
                                        onPress={handleAttachPhoto}
                                        activeOpacity={0.8}
                                    >
                                        <ImageIcon size={24} color={theme.textSecondary} style={{ marginBottom: 6 }} />
                                        <Text style={styles.photoUploadBtnText}>Attach Defect Photo</Text>
                                        <Text style={styles.photoUploadSubtext}>Capture or select from gallery</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Terms checkbox */}
                            <TouchableOpacity
                                style={styles.termsRow}
                                onPress={() => {
                                    if (termsAccepted) {
                                        setTermsAccepted(false);
                                    } else {
                                        setShowTncModal(true);
                                    }
                                }}
                                activeOpacity={0.8}
                            >
                                <View style={[
                                    styles.checkbox,
                                    termsAccepted && styles.checkboxChecked
                                ]}>
                                    {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                                <Text style={styles.termsText}>
                                    I accept the{' '}
                                    <Text 
                                        style={styles.termsLink}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            setShowTncModal(true);
                                        }}
                                    >
                                        Terms & Conditions
                                    </Text>
                                    {' '}of Bentork Warranty services.
                                </Text>
                            </TouchableOpacity>

                            {/* Submit CTA button */}
                            <TouchableOpacity
                                style={[
                                    styles.submitBtn,
                                    isSubmittingClaim && { opacity: 0.7 }
                                ]}
                                onPress={handleSubmitClaim}
                                disabled={isSubmittingClaim}
                                activeOpacity={0.8}
                            >
                                {isSubmittingClaim ? (
                                    <ActivityIndicator color={theme.textPrimary} size="small" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Submit Warranty Claim</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Login Required Dialog */}
            <LoginRequiredDialog
                visible={loginPromptVisible}
                contextMessage="Sign in to view your warranty claim"
                onLoginPress={() => {
                    setLoginPromptVisible(false);
                    navigation.replace('Login', {
                        returnRoute: 'BatteryWarranty'
                    });
                }}
                onClose={() => {
                    setLoginPromptVisible(false);
                    navigation.goBack();
                }}
            />

            {/* Terms & Conditions Modal */}
            <Modal
                visible={showTncModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTncModal(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Terms & Conditions</Text>
                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            <Text style={styles.tncText}>
                                • I confirm that all information and documents provided by me for this warranty claim are true, correct, and complete to the best of my knowledge.
                            </Text>
                            <Text style={styles.tncText}>
                                • I confirm that the battery for which I am claiming warranty was purchased from Bentork Industries LLP.
                            </Text>
                            <Text style={styles.tncText}>
                                • I declare that this warranty claim is being submitted only for the above-mentioned Bentork battery and not for any battery purchased from any other brand, dealer, or service provider.
                            </Text>
                            <Text style={styles.tncText}>
                                • I understand that providing false information, incorrect documents, or misrepresenting the battery details may result in rejection of the warranty claim.
                            </Text>
                            <Text style={styles.tncText}>
                                • I hereby agree to Bentork's warranty verification process and authorize Bentork to inspect and validate the battery and purchase details before approving the claim.
                            </Text>
                        </ScrollView>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowTncModal(false)}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalAcceptBtn}
                                onPress={() => {
                                    setTermsAccepted(true);
                                    setShowTncModal(false);
                                }}
                            >
                                <Text style={styles.modalAcceptBtnText}>Accept</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (theme, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
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
        backgroundColor: theme.cardBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: theme.textPrimary,
        fontSize: 18,
        fontWeight: '900',
        flex: 1,
        textAlign: 'center',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 40,
    },
    stepsWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 16,
        marginTop: 10,
    },
    stepContainer: {
        alignItems: 'center',
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.divider,
    },
    stepCircleActive: {
        borderColor: '#00B074',
    },
    stepCircleCompleted: {
        backgroundColor: '#00B074',
        borderColor: '#00B074',
    },
    stepCheck: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepNumber: {
        fontSize: 12,
        fontWeight: '900',
        color: theme.textSecondary,
    },
    stepNumberActive: {
        color: '#00B074',
    },
    stepLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: theme.textSecondary,
        marginTop: 6,
        letterSpacing: 0.5,
    },
    stepLabelActive: {
        color: theme.textPrimary,
    },
    stepLine: {
        flex: 1,
        height: 2,
        backgroundColor: theme.divider,
        marginHorizontal: 8,
        marginTop: -15,
    },
    stepLineActive: {
        backgroundColor: '#00B074',
    },
    card: {
        backgroundColor: theme.cardBg,
        borderRadius: 28,
        paddingHorizontal: 20,
        paddingVertical: 24,
        marginBottom: 16,
    },
    cardHeaderWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardHeaderTitle: {
        color: theme.textPrimary,
        fontSize: 16,
        fontWeight: '900',
    },
    cardHeaderDesc: {
        color: theme.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 20,
        fontWeight: '600',
    },
    inputLabel: {
        color: theme.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        backgroundColor: theme.white,
        borderRadius: 28,
        paddingHorizontal: 16,
        height: 56,
        color: theme.textPrimary,
        fontSize: 14,
        fontWeight: '800',
        marginRight: 10,
    },
    searchBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerLoading: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        color: theme.textSecondary,
        fontSize: 13,
        marginTop: 10,
        fontWeight: '600',
    },
    errorCard: {
        backgroundColor: theme.cardBg,
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        color: '#EF5350',
        fontSize: 15,
        fontWeight: '950',
        marginTop: 8,
        marginBottom: 4,
    },
    errorDesc: {
        color: theme.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '600',
    },
    switcherContainer: {
        marginBottom: 20,
    },
    switcherLabel: {
        color: theme.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        marginLeft: 4,
    },
    dropdownSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.white,
        borderRadius: 28,
        paddingHorizontal: 16,
        height: 56,
    },
    dropdownSelectorActive: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    dropdownSelectorText: {
        color: theme.textPrimary,
        fontSize: 14,
        fontWeight: '800',
    },
    dropdownOptionsContainer: {
        backgroundColor: theme.white,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        borderTopWidth: 1,
        borderTopColor: theme.divider,
        paddingVertical: 8,
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
        backgroundColor: isDark ? 'rgba(0, 176, 116, 0.15)' : 'rgba(0, 176, 116, 0.08)',
    },
    dropdownOptionItemText: {
        color: theme.textSecondary,
        fontSize: 14,
        fontWeight: '700',
    },
    dropdownOptionItemTextSelected: {
        color: '#00B074',
        fontWeight: '900',
    },
    detailsSubCard: {
        backgroundColor: theme.white,
        borderRadius: 24,
        padding: 16,
        gap: 12,
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIcon: {
        marginRight: 12,
    },
    detailLabel: {
        color: theme.textSecondary,
        fontSize: 11,
        fontWeight: '600',
    },
    detailValue: {
        color: theme.textPrimary,
        fontSize: 13,
        fontWeight: '900',
        marginTop: 2,
    },
    cardDivider: {
        height: 1,
        backgroundColor: theme.divider,
        marginVertical: 4,
    },
    activeLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    statusDotCircle: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    activeWarrantyText: {
        fontSize: 12,
        fontWeight: '900',
    },
    claimBtn: {
        backgroundColor: theme.white,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    claimBtnText: {
        color: theme.textPrimary,
        fontSize: 15,
        fontWeight: '900',
    },
    expiredInlineCard: {
        flexDirection: 'row',
        backgroundColor: theme.white,
        borderRadius: 24,
        padding: 16,
        alignItems: 'center',
    },
    expiredTitle: {
        color: '#EF5350',
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 2,
    },
    expiredDescInline: {
        color: theme.textSecondary,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '600',
    },
    autofillBox: {
        backgroundColor: theme.white,
        borderRadius: 24,
        padding: 16,
        gap: 8,
        marginBottom: 20,
    },
    autofillText: {
        color: theme.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    textAreaInput: {
        backgroundColor: theme.white,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 16,
        color: theme.textPrimary,
        fontSize: 14,
        fontWeight: '800',
        height: 120,
        marginBottom: 20,
    },
    photoContainer: {
        marginBottom: 20,
    },
    photoPreviewBox: {
        flexDirection: 'row',
        backgroundColor: theme.white,
        borderRadius: 24,
        padding: 12,
        alignItems: 'center',
    },
    previewImage: {
        width: 80,
        height: 80,
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
        marginBottom: 8,
    },
    statusIcon: {
        marginRight: 6,
    },
    photoUploadedText: {
        color: '#00B074',
        fontSize: 14,
        fontWeight: '900',
    },
    removePhotoBtn: {
        alignSelf: 'flex-start',
    },
    removePhotoText: {
        color: '#EF5350',
        fontSize: 13,
        fontWeight: '800',
    },
    photoUploadBtn: {
        backgroundColor: theme.white,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: theme.divider,
        borderStyle: 'dashed',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoUploadBtnText: {
        color: theme.textPrimary,
        fontSize: 14,
        fontWeight: '800',
    },
    photoUploadSubtext: {
        color: theme.textSecondary,
        fontSize: 11,
        marginTop: 4,
        fontWeight: '600',
    },
    termsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: theme.divider,
        backgroundColor: theme.white,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#00B074',
        borderColor: '#00B074',
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    termsText: {
        color: theme.textSecondary,
        fontSize: 12,
        lineHeight: 18,
        flex: 1,
        fontWeight: '600',
    },
    termsLink: {
        color: '#00B074',
        fontWeight: '800',
        textDecorationLine: 'underline',
    },
    submitBtn: {
        backgroundColor: theme.white,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitBtnText: {
        color: theme.textPrimary,
        fontSize: 15,
        fontWeight: '900',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: theme.overlayBg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        backgroundColor: theme.background,
        borderRadius: 28,
        padding: 24,
        maxHeight: '80%',
    },
    modalTitle: {
        color: theme.textPrimary,
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 16,
    },
    modalScroll: {
        marginBottom: 20,
    },
    tncText: {
        color: theme.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 12,
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalCancelBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: theme.white,
    },
    modalCancelBtnText: {
        color: theme.textSecondary,
        fontSize: 14,
        fontWeight: '800',
    },
    modalAcceptBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: '#00B074',
    },
    modalAcceptBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
});
