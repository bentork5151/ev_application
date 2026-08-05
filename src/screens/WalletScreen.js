import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Image, Dimensions, Platform, StatusBar, Animated, Easing, Share, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, ArrowDown, ArrowUp, X, Wallet as WalletIcon, Gift, Wifi } from 'lucide-react-native';
import { authService } from '../services/auth';
import { razorpayApi, referralApi, coinsApi } from '../services/api';
import LoginRequiredDialog from '../components/LoginRequiredDialog';
import api from '../services/api';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID } from '@env';
import ReactNativeBiometrics from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PinPromptModal from '../components/PinPromptModal';
import { useAlert } from '../context/AlertContext';
import remoteConfig from '@react-native-firebase/remote-config';
import { shouldRespectMaintenance } from '../utils/devSettings';
import WarningIcon from '../assets/icons/Rounded Fill/warning_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function WalletScreen({ navigation }) {
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [walletBalance, setWalletBalance] = useState('0.00');
    const [isGuest, setIsGuest] = useState(false);
    const [loginPromptVisible, setLoginPromptVisible] = useState(false);

    // Referral & Coin States
    const [showReferralModal, setShowReferralModal] = useState(false);
    const [activeReferralTab, setActiveReferralTab] = useState('share'); 
    const [referralCode, setReferralCode] = useState('');
    const [referralInfo, setReferralInfo] = useState(null);
    const [coinBalance, setCoinBalance] = useState(0);
    const [redeemableKwh, setRedeemableKwh] = useState(0);
    const [coinHistory, setCoinHistory] = useState([]);
    const [coinsToRedeem, setCoinsToRedeem] = useState('');
    const [redeemLoading, setRedeemLoading] = useState(false);

    // Skeleton Loading & Fade State
    const [isFetching, setIsFetching] = useState(true);
    const pulseAnim = useRef(new Animated.Value(0.3)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Security State
    const [isLocked, setIsLocked] = useState(false); 
    const [showPinModal, setShowPinModal] = useState(false);

    // Maintenance State
    const [isMaintenance, setIsMaintenance] = useState(false);

    useEffect(() => {
        const checkGuestMode = async () => {
            const guest = await authService.isGuestMode();
            setIsGuest(guest);
            if (guest) {
                setLoginPromptVisible(true);
            } else {
                fetchMaint();
                checkSecurity();
            }
        };

        const fetchMaint = async () => {
            const respectMaintenance = await shouldRespectMaintenance();
            if (!respectMaintenance) {
                setIsMaintenance(false);
                return;
            }
            try {
                const maint = remoteConfig().getValue('maintenance_key').asBoolean();
                setIsMaintenance(maint);
            } catch (e) {
                console.warn('Could not read remote config:', e);
            }
        };

        checkGuestMode();
    }, []);

    const checkSecurity = async () => {
        try {
            const secureWallet = await AsyncStorage.getItem('secureWallet');
            if (secureWallet === 'true') {
                setIsLocked(true);
                const rnBiometrics = new ReactNativeBiometrics();
                const { available, biometryType } = await rnBiometrics.isSensorAvailable();

                if (available && biometryType) {
                    rnBiometrics.simplePrompt({ promptMessage: 'Confirm fingerprint to access Wallet' })
                        .then((resultObject) => {
                            const { success } = resultObject;
                            if (success) {
                                setIsLocked(false);
                                startLoadingData(); 
                            } else {
                                setShowPinModal(true);
                            }
                        })
                        .catch(() => {
                            setShowPinModal(true);
                        });
                } else {
                    setShowPinModal(true);
                }
            } else {
                setIsLocked(false);
                startLoadingData();
            }
        } catch (e) {
            console.error("Security check failed:", e);
            startLoadingData();
        }
    };

    const startLoadingData = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        ).start();

        loadDataWithDelay();
    };

    const loadDataWithDelay = async () => {
        setIsFetching(true);
        const minLoadTime = new Promise(resolve => setTimeout(resolve, 1500));
        const dataLoad = loadData();

        await Promise.all([minLoadTime, dataLoad]);

        setIsFetching(false);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease)
        }).start();
    };

    const loadData = async () => {
        let maintenanceActive = false;
        const respectMaintenance = await shouldRespectMaintenance();
        if (respectMaintenance) {
            try {
                maintenanceActive = remoteConfig().getValue('maintenance_key').asBoolean();
            } catch (e) {
                console.warn('Could not read remote config in loadData:', e);
            }
        }

        const userData = await authService.getUser();
        setUser(userData);
        
        if (!maintenanceActive) {
            if (userData?.userId || userData?.id) {
                const userId = userData.userId || userData.id;
                await fetchTransactions(userId);
                await fetchReferralAndCoins(userId);
            }
            if (userData?.email) {
                await fetchWalletBalance(userData.email);
            }
        }
    };

    const fetchReferralAndCoins = async (userId) => {
        try {
            const refInfo = await referralApi.getInfo();
            if (refInfo) {
                setReferralInfo(refInfo);
                setReferralCode(refInfo.referralCode || '');
            }
        } catch (error) {
            console.warn("Failed to fetch referral details:", error.message);
        }

        try {
            const coinBal = await coinsApi.getBalance();
            if (coinBal) {
                setCoinBalance(coinBal.coinBalance !== undefined ? coinBal.coinBalance : 0);
                setRedeemableKwh(coinBal.redeemableKwh !== undefined ? coinBal.redeemableKwh : 0);
            }
        } catch (error) {
            console.warn("Failed to fetch coin balance:", error.message);
        }

        try {
            const history = await coinsApi.getHistory();
            if (history) {
                setCoinHistory(history);
            }
        } catch (error) {
            console.warn("Failed to fetch coin transaction history:", error.message);
        }
    };

    const fetchWalletBalance = async (email) => {
        try {
            const userDetails = await api.get(`/user/byemail/${email}`);
            if (userDetails.data) {
                setUser(prev => ({ ...prev, ...userDetails.data }));
                authService.setUser({ ...user, ...userDetails.data });
                if (userDetails.data.walletBalance !== undefined) {
                    setWalletBalance(userDetails.data.walletBalance);
                }
            }
        } catch (error) {
            console.error("Failed to fetch wallet balance", error);
        }
    };

    const fetchTransactions = async (userId) => {
        try {
            const response = await api.get(`/wallet/history/${userId}`);
            setTransactions(response.data || []);
        } catch (error) {
            console.error("Failed to fetch transactions", error);
        }
    };

    const handleAddAmount = (val) => {
        const current = parseFloat(amount) || 0;
        const next = current + val;
        setAmount(next > 100000 ? '100000' : next.toString());
    };

    const handlePayment = async () => {
        if (!amount) return;
        const userId = user?.id || user?.userId;

        if (!userId) {
            showAlert("Session Error", "Could not identify user. Please wait a moment or try logging in again.");
            return;
        }

        try {
            setLoading(true);
            const orderData = await razorpayApi.createOrder(amount);
            const orderId = orderData.id || orderData;

            const options = {
                description: 'Wallet Recharge',
                image: 'https://github.com/StartLedger/ev-ui/blob/main/src/assets/images/logo.png?raw=true',
                currency: 'INR',
                key: RAZORPAY_KEY_ID,
                amount: parseFloat(amount) * 100, 
                name: 'Bentork EV',
                order_id: orderId,
                prefill: {
                    email: user?.email || 'user@bentork.in',
                    contact: user?.phone || '9999999999',
                    name: user?.name || 'Bentork User'
                },
                theme: { color: '#00B074' }
            };

            RazorpayCheckout.open(options).then(async (data) => {
                try {
                    const verificationPayload = {
                        order_id: data.razorpay_order_id,
                        payment_id: data.razorpay_payment_id,
                        signature: data.razorpay_signature,
                        user_id: userId.toString()
                    };

                    const verificationResponse = await razorpayApi.verifyPayment(verificationPayload);
                    showAlert("Success", "Wallet updated successfully!");
                    setShowAddModal(false);
                    setAmount('');

                    if (verificationResponse.walletAmount) {
                        setWalletBalance(verificationResponse.walletAmount);
                    }
                    loadData();
                } catch (verifyErr) {
                    console.error("Verification Failed:", verifyErr);
                    showAlert("Payment Verification Failed", "Payment was successful but verification failed. Please contact support.");
                }
            }).catch((error) => {
                console.log(`Razorpay Error: ${error.code} | ${error.description}`);
                if (error.code !== 0) {
                    showAlert("Payment Failed", error.description);
                }
            });
        } catch (err) {
            console.error("Order Creation Failed:", err);
            showAlert("Error", "Failed to initiate payment. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleRedeemCoins = async () => {
        const coins = parseInt(coinsToRedeem, 10);
        if (isNaN(coins) || coins <= 0 || coins % 1000 !== 0) {
            showAlert("Invalid Amount", "Coins must be a positive multiple of 1000.");
            return;
        }
        if (coinBalance < coins) {
            showAlert("Insufficient Balance", `You only have ${coinBalance} coins, but you requested to redeem ${coins} coins.`);
            return;
        }

        try {
            setRedeemLoading(true);
            const res = await coinsApi.redeem(coins);
            showAlert("Redemption Successful", res.message || `Successfully redeemed ${coins} coins!`);
            setCoinsToRedeem('');
            loadData();
        } catch (error) {
            showAlert("Redemption Failed", error.userMessage || "Failed to redeem coins.");
        } finally {
            setRedeemLoading(false);
        }
    };

    const GST_RATE = 0.18;
    const baseAmount = (parseFloat(amount) || 0) * (1 - GST_RATE);
    const gstAmount = (parseFloat(amount) || 0) * GST_RATE;

    const renderTransactionItem = ({ item, isLast }) => {
        const isCredit = item.type === 'credit' || item.type === 'CREDIT';
        const iconColor = isCredit ? '#00B074' : '#EF5350';

        return (
            <View style={[styles.txItem, { borderBottomColor: theme.divider }, isLast && { borderBottomWidth: 0 }]}>
                <View style={styles.txLeft}>
                    <View style={[styles.txIconBox, { backgroundColor: theme.white }]}>
                        {isCredit ?
                            <ArrowDown size={18} color={iconColor} /> :
                            <ArrowUp size={18} color={iconColor} />
                        }
                    </View>
                    <View style={styles.txInfo}>
                        <Text style={[styles.txTitle, { color: theme.textPrimary }]}>{isCredit ? "Wallet Recharge" : "Deducted"}</Text>
                        <Text style={[styles.txDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                            {isCredit ? (item.method || "Payment") : "Charging Session"}
                        </Text>
                    </View>
                </View>
                <View style={styles.txRight}>
                    <Text style={[styles.amountText, { color: isCredit ? '#00B074' : theme.textPrimary }]}>
                        {isCredit ? "+" : "-"}₹{item.amount}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: theme.white }]}>
                        <Text style={[styles.statusText, { color: theme.textSecondary }]}>Done</Text>
                    </View>
                </View>
            </View>
        );
    };

    const SkeletonBlock = ({ width, height, style }) => (
        <Animated.View
            style={[
                {
                    width: width,
                    height: height,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.4)',
                    borderRadius: 8,
                    opacity: pulseAnim,
                },
                style
            ]}
        />
    );

    if (isLocked) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
                <View style={[styles.header, { position: 'absolute', top: 0, width: '100%', paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.cardBg }]} onPress={() => navigation.goBack()}>
                        <ChevronLeft size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>My Wallet</Text>
                </View>

                <Text style={{ color: theme.textPrimary, fontWeight: '800', fontSize: 16 }}>Authentication Required</Text>

                <PinPromptModal
                    visible={showPinModal}
                    title="Enter Access PIN"
                    onSuccess={() => {
                        setShowPinModal(false);
                        setIsLocked(false);
                        startLoadingData();
                    }}
                    onClose={() => {
                        setShowPinModal(false);
                        navigation.goBack();
                    }}
                />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.cardBg }]} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>My Wallet</Text>
                <View style={{ width: 40 }} />
            </View>

            {isFetching ? (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.balanceCard}>
                        <SkeletonBlock width={100} height={16} style={{ marginBottom: 15 }} />
                        <SkeletonBlock width={180} height={36} style={{ marginBottom: 20 }} />
                        <SkeletonBlock width="100%" height={50} style={{ borderRadius: 14 }} />
                    </View>
                    <SkeletonBlock width={150} height={20} style={{ marginBottom: 20 }} />
                    {[1, 2, 3, 4].map((key) => (
                        <View key={key} style={styles.txSkeletonItem}>
                            <SkeletonBlock width={42} height={42} style={{ borderRadius: 21, marginRight: 14 }} />
                            <View style={{ flex: 1 }}>
                                <SkeletonBlock width={100} height={16} style={{ marginBottom: 6 }} />
                                <SkeletonBlock width={60} height={12} />
                            </View>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                        {isMaintenance && (
                            <View style={styles.maintenanceReassurance}>
                                <WarningIcon width={16} height={16} fill="#FFAB00" style={{ marginRight: 8 }} />
                                <Text style={styles.maintenanceReassuranceText}>
                                    Don't worry, your balance is safe and will restore after the maintenance break.
                                </Text>
                            </View>
                        )}

                        {/* Balance Card - Sticking strictly to App Theme */}
                        <View style={[styles.balanceCard, { backgroundColor: theme.cardBg }]}>
                            <View style={styles.balanceLabelRow}>
                                <WalletIcon size={18} color={theme.textSecondary} />
                                <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Total Balance</Text>
                            </View>
                            <Text style={[styles.balanceAmount, { color: theme.textPrimary }]}>
                                ₹{parseFloat(walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                            <TouchableOpacity 
                                style={[styles.addMoneyBtn, { backgroundColor: isDark ? theme.buttonBg : '#ECEFF1' }]} 
                                onPress={() => setShowAddModal(true)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.addMoneyBtnText, { color: isDark ? theme.textPrimary : '#1A1A1A' }]}>+ Add Money</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Grid Menu Cards */}
                        <View style={styles.gridRow}>
                            <TouchableOpacity 
                                style={[styles.gridCard, { backgroundColor: theme.cardBg }]} 
                                onPress={() => navigation.navigate('Referral')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.gridCardHeader}>
                                    <View style={[styles.gridIconContainer, { backgroundColor: theme.white }]}>
                                        <Gift size={18} color="#00B074" />
                                    </View>
                                    <ChevronRight size={18} color={theme.textSecondary} />
                                </View>
                                <View style={styles.gridCardBody}>
                                    <Text style={[styles.gridCardTitle, { color: theme.textPrimary }]}>Refer a Friend</Text>
                                    <Text style={[styles.gridCardSub, { color: theme.textSecondary }]}>Share your code</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.gridCard, { backgroundColor: theme.cardBg }]} 
                                onPress={() => setShowReferralModal(true)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.gridCardHeader}>
                                    <View style={[styles.gridIconContainer, { backgroundColor: theme.white }]}>
                                        <Text style={styles.rupeeIcon}>₹</Text>
                                    </View>
                                    <ChevronRight size={18} color={theme.textSecondary} />
                                </View>
                                <View style={styles.gridCardBody}>
                                    <Text style={[styles.gridCardTitle, { color: theme.textPrimary }]}>My Coins</Text>
                                    <Text style={[styles.gridCardSub, { color: theme.textSecondary }]}>View Coins & Rewards</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Transactions Group Card */}
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Payment History</Text>

                        {transactions.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recent transactions</Text>
                            </View>
                        ) : (
                            <View style={[styles.transactionsCard, { backgroundColor: theme.cardBg }]}>
                                {transactions.map((item, index) => (
                                    <View key={index}>
                                        {renderTransactionItem({ item, isLast: index === transactions.length - 1 })}
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </Animated.View>
            )}

            {/* Add Money Modal */}
            <Modal
                visible={showAddModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: theme.overlayBg }]} activeOpacity={1} onPress={() => setShowAddModal(false)}>
                    <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add Balance</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)} style={[styles.closeBtn, { backgroundColor: theme.white }]}>
                                <X size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.inputGroup, { backgroundColor: theme.white }]}>
                            <Text style={[styles.currencySymbol, { color: theme.textPrimary }]}>₹</Text>
                            <TextInput
                                style={[styles.amountInput, { color: theme.textPrimary }]}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0"
                                placeholderTextColor={theme.placeholder}
                                keyboardType="numeric"
                            />
                            {amount.length > 0 && (
                                <TouchableOpacity onPress={() => setAmount('')}>
                                    <X size={18} color={theme.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.chipGroup}>
                            {[100, 200, 500, 1000].map(val => (
                                <TouchableOpacity key={val} style={[styles.amtChip, { backgroundColor: theme.white }]} onPress={() => handleAddAmount(val)}>
                                    <Text style={[styles.chipText, { color: theme.textSecondary }]}>+{val}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={[styles.billDetails, { backgroundColor: theme.cardBg }]}>
                            <View style={styles.billRow}>
                                <Text style={[styles.billLabel, { color: theme.textSecondary }]}>Base Amount</Text>
                                <Text style={[styles.billValue, { color: theme.textPrimary }]}>₹{baseAmount.toFixed(2)}</Text>
                            </View>
                            <View style={styles.billRow}>
                                <Text style={[styles.billLabel, { color: theme.textSecondary }]}>GST (18%)</Text>
                                <Text style={[styles.billValue, { color: theme.textPrimary }]}>₹{gstAmount.toFixed(2)}</Text>
                            </View>
                            <View style={[styles.billRow, styles.billTotal, { borderTopColor: theme.divider }]}>
                                <Text style={[styles.billTotalLabel, { color: theme.textPrimary }]}>Total Payable</Text>
                                <Text style={[styles.billTotalValue, { color: theme.textPrimary }]}>₹{parseFloat(amount || 0).toFixed(2)}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.payBtn, { backgroundColor: '#00B074', opacity: !amount ? 0.5 : 1 }]}
                            disabled={!amount}
                            onPress={handlePayment}
                        >
                            <Text style={[styles.payBtnText, { color: '#FFFFFF' }]}>Pay ₹{amount || 0}</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Coins / Referral Rewards Modal */}
            <Modal
                visible={showReferralModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowReferralModal(false)}
            >
                <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: theme.overlayBg }]} activeOpacity={1} onPress={() => setShowReferralModal(false)}>
                    <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Coins & Rewards</Text>
                            <TouchableOpacity onPress={() => setShowReferralModal(false)} style={[styles.closeBtn, { backgroundColor: theme.white }]}>
                                <X size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ width: '100%', maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                            <View style={styles.coinBalanceRow}>
                                <View style={styles.coinBalanceBox}>
                                    <Gift size={16} color="#FFD700" style={{ marginRight: 6 }} />
                                    <Text style={styles.coinBalanceText}>{coinBalance} Coins</Text>
                                </View>
                                <Text style={styles.coinKwhText}>≈ {redeemableKwh.toFixed(2)} kWh</Text>
                            </View>

                            <Text style={[styles.coinHintText, { color: theme.textSecondary }]}>Redeem in multiples of 1000 coins (1000 coins = 1 kWh = ₹18.00 credit to wallet)</Text>

                            <View style={[styles.inputGroup, { backgroundColor: theme.white }]}>
                                <TextInput
                                    style={[styles.amountInput, { color: theme.textPrimary }]}
                                    value={coinsToRedeem}
                                    onChangeText={setCoinsToRedeem}
                                    placeholder="1000"
                                    placeholderTextColor={theme.placeholder}
                                    keyboardType="numeric"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.payBtn, { backgroundColor: theme.white, width: '100%', marginBottom: 20, opacity: !coinsToRedeem || redeemLoading ? 0.5 : 1 }]}
                                onPress={handleRedeemCoins}
                                disabled={!coinsToRedeem || redeemLoading}
                            >
                                <Text style={[styles.payBtnText, { color: theme.textPrimary }]}>{redeemLoading ? 'Redeeming...' : 'Convert to Wallet Balance'}</Text>
                            </TouchableOpacity>

                            <Text style={[styles.coinHistoryTitle, { color: theme.textPrimary }]}>Coin History</Text>
                            {coinHistory.length === 0 ? (
                                <Text style={[styles.noHistoryText, { color: theme.textSecondary }]}>No transactions yet</Text>
                            ) : (
                                coinHistory.map((item, idx) => (
                                    <View key={idx} style={[styles.coinHistoryItem, { borderBottomColor: theme.divider }]}>
                                        <View style={{ flex: 1, paddingRight: 10 }}>
                                            <Text style={[styles.coinHistoryDesc, { color: theme.textPrimary }]}>{item.description}</Text>
                                            <Text style={[styles.coinHistoryDate, { color: theme.textSecondary }]}>
                                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                }) : ''}
                                            </Text>
                                        </View>
                                        <Text style={[styles.coinHistoryAmount, { color: item.amount > 0 ? '#00B074' : '#EF5350' }]}>
                                            {item.amount > 0 ? `+${item.amount}` : item.amount}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            <LoginRequiredDialog
                visible={loginPromptVisible}
                contextMessage="Sign in to view your wallet balance and transactions"
                onLoginPress={() => {
                    setLoginPromptVisible(false);
                    navigation.replace('Login', { returnRoute: 'Wallet' });
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
    pageTitle: {
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    maintenanceReassurance: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 171, 0, 0.1)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    maintenanceReassuranceText: {
        color: '#b26a00',
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    balanceCard: {
        borderRadius: 28,
        padding: 24,
        marginBottom: 24,
    },
    balanceLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    balanceLabel: {
        fontSize: 14,
        marginLeft: 8,
        fontWeight: '600',
    },
    balanceAmount: {
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 24,
    },
    addMoneyBtn: {
        borderRadius: 28,
        paddingVertical: 16,
        alignItems: 'center',
    },
    addMoneyBtnText: {
        fontSize: 15,
        fontWeight: '900',
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    gridCard: {
        borderRadius: 24,
        padding: 16,
        width: '48%',
    },
    gridCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    gridIconContainer: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rupeeIcon: {
        color: '#00B074',
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'center',
    },
    gridCardBody: {
        marginTop: 12,
    },
    gridCardTitle: {
        fontSize: 14,
        fontWeight: '900',
    },
    gridCardSub: {
        fontSize: 11,
        marginTop: 2,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 16,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    transactionsCard: {
        borderRadius: 28,
        paddingHorizontal: 16,
    },
    txItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    txLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    txIconBox: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    txInfo: {
        justifyContent: 'center',
    },
    txTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 2,
    },
    txDesc: {
        fontSize: 12,
        maxWidth: 150,
        fontWeight: '600',
    },
    txRight: {
        alignItems: 'flex-end',
    },
    amountText: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    txSkeletonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 28,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
    },
    currencySymbol: {
        fontSize: 18,
        fontWeight: '900',
        marginRight: 10,
    },
    amountInput: {
        flex: 1,
        fontSize: 18,
        fontWeight: '900',
        padding: 0,
    },
    chipGroup: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 8,
    },
    amtChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '850',
    },
    billDetails: {
        padding: 16,
        borderRadius: 24,
        marginBottom: 24,
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    billLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    billValue: {
        fontSize: 13,
        fontWeight: '800',
    },
    billTotal: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    billTotalLabel: {
        fontWeight: '900',
        fontSize: 14,
    },
    billTotalValue: {
        fontWeight: '900',
        fontSize: 14,
    },
    payBtn: {
        paddingVertical: 16,
        borderRadius: 28,
        alignItems: 'center',
    },
    payBtnText: {
        fontSize: 15,
        fontWeight: '900',
    },
    coinBalanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        width: '100%',
    },
    coinBalanceBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    coinBalanceText: {
        color: '#FFA726',
        fontWeight: '900',
        fontSize: 14,
    },
    coinKwhText: {
        color: '#00B074',
        fontSize: 13,
        fontWeight: '900',
    },
    coinHintText: {
        fontSize: 12,
        marginBottom: 16,
        lineHeight: 18,
        fontWeight: '600',
    },
    coinHistoryTitle: {
        fontSize: 15,
        fontWeight: '900',
        marginBottom: 12,
        marginTop: 10,
    },
    noHistoryText: {
        fontSize: 12,
        textAlign: 'center',
        paddingVertical: 12,
        fontStyle: 'italic',
    },
    coinHistoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    coinHistoryDesc: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
    coinHistoryDate: {
        fontSize: 11,
        marginTop: 4,
        fontWeight: '500',
    },
    coinHistoryAmount: {
        fontSize: 13,
        fontWeight: '900',
    }
});
