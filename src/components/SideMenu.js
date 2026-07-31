import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image, PanResponder, Easing, Modal, Linking, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, User, ChevronRight, Wallet, Settings, HelpCircle, MessageCircle, Info, FileText, LogOut, MapPin, CheckCircle, Users, ShieldCheck, Lock, Package } from 'lucide-react-native';
import { authService } from '../services/auth';
import LoginRequiredDialog from './LoginRequiredDialog';
import { useTheme } from '../context/ThemeContext';

const MenuItem = ({ icon: Icon, label, onPress, active = false, rightElement = null, locked = false }) => {
    const { theme, isDark } = useTheme();
    return (
        <TouchableOpacity
            style={[
                styles.menuItem, 
                active && styles.menuItemActive,
                active && { backgroundColor: isDark ? 'rgba(0, 176, 116, 0.2)' : 'rgba(0, 176, 116, 0.1)' }
            ]}
            onPress={onPress}
            activeOpacity={locked ? 0.8 : 0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: theme.white }]}>
                <Icon size={18} color={locked ? '#BFC7CE' : (active ? '#00B074' : theme.textPrimary)} />
            </View>
            <Text style={[styles.menuLabel, { color: theme.textPrimary }, active && styles.menuLabelActive, locked && { color: '#BFC7CE' }, { flex: 1 }]}>{label}</Text>
            {locked ? (
                <Lock size={16} color="#BFC7CE" />
            ) : (
                rightElement || <ChevronRight size={16} color={theme.textSecondary} />
            )}
        </TouchableOpacity>
    );
};

export default function SideMenu({ visible, onClose, navigation }) {
    const { width } = useWindowDimensions();
    const { theme, isDark } = useTheme();
    const DRAWER_WIDTH = Math.min(width * 0.85, 340);

    const insets = useSafeAreaInsets();
    const [user, setUser] = useState(null);

    const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(-1000)).current; 
    const fadeAnim = useRef(new Animated.Value(0)).current; 

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
            },
            onPanResponderMove: (evt, gestureState) => {
                if (gestureState.dx < 0) {
                    slideAnim.setValue(gestureState.dx);
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (gestureState.dx < -DRAWER_WIDTH / 3 || gestureState.vx < -0.5) {
                    Animated.parallel([
                        Animated.timing(slideAnim, {
                            toValue: -DRAWER_WIDTH,
                            duration: 200,
                            useNativeDriver: true,
                            easing: Easing.in(Easing.poly(4)),
                        }),
                        Animated.timing(fadeAnim, {
                            toValue: 0,
                            duration: 200,
                            useNativeDriver: true,
                            easing: Easing.in(Easing.poly(4)),
                        }),
                    ]).start(() => {
                        onClose();
                    });
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            loadUser();
            if (slideAnim._value < -DRAWER_WIDTH) {
                slideAnim.setValue(-DRAWER_WIDTH);
            }
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.poly(4)),
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.poly(4)),
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -DRAWER_WIDTH,
                    duration: 250,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.poly(4)),
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.poly(4)),
                }),
            ]).start();
        }
    }, [visible, DRAWER_WIDTH]);

    const [isGuest, setIsGuest] = useState(false);
    const [loginPromptVisible, setLoginPromptVisible] = useState(false);
    const [loginPromptMessage, setLoginPromptMessage] = useState('');

    const loadUser = async () => {
        const guest = await authService.isGuestMode();
        setIsGuest(guest);
        if (guest) {
            setUser(null);
        } else {
            const userData = await authService.getUser();
            setUser(userData);
        }
    };

    const handleNavigation = (screen, params) => {
        onClose();
        setTimeout(() => {
            navigation.navigate(screen, params);
        }, 300);
    };

    const handleBuyStation = () => {
        setIsBuyModalVisible(true);
    };

    const closeBuyModal = () => {
        setIsBuyModalVisible(false);
    };

    const contactWhatsApp = () => {
        const phoneNumber = "+918237943808";
        const message = "Hi Bentork team, I'm interested in buying/hosting an EV charging station for my property. Please guide me through the process.";
        const url = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(err => console.error("Failed to open WhatsApp", err));
    };

    const handleLogout = async () => {
        onClose();
        setTimeout(async () => {
            await authService.logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }, 300);
    };

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents={visible ? 'auto' : 'none'}>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
            </Animated.View>

            {/* Drawer */}
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.drawer,
                    {
                        backgroundColor: theme.background,
                        transform: [{ translateX: slideAnim }],
                        width: DRAWER_WIDTH,
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom
                    }
                ]}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Image
                        source={require('../assets/images/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                        tintColor={theme.textPrimary}
                    />
                    <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.cardBg }]}>
                        <X size={20} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* User Profile Card */}
                <View style={[styles.profileSection, { backgroundColor: theme.cardBg }]}>
                    <View style={[styles.avatar, { backgroundColor: theme.white }]}>
                        {(user?.imageUrl || user?.image_url || user?.profilePic || user?.profile_pic) ? (
                            <Image 
                                source={{ uri: user.imageUrl || user.image_url || user.profilePic || user.profile_pic }} 
                                style={styles.avatarImg} 
                                resizeMode="cover"
                            />
                        ) : (
                            <User size={22} color={theme.textSecondary} />
                        )}
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: theme.textPrimary }]} numberOfLines={1}>{isGuest ? 'Guest User' : user?.name || 'Guest User'}</Text>
                        {isGuest ? (
                            <TouchableOpacity onPress={() => {
                                onClose();
                                setTimeout(() => {
                                    navigation.navigate('Login');
                                }, 300);
                            }}>
                                <Text style={styles.signInText}>Sign In →</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={[styles.userEmail, { color: theme.textSecondary }]} numberOfLines={1}>{user?.email || 'Sign in'}</Text>
                        )}
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.divider }]} />

                {/* Menu Items */}
                <ScrollView
                    style={styles.menuContainer}
                    contentContainerStyle={{ flexGrow: 1, paddingVertical: 10 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ACCOUNT Section */}
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Account</Text>
                    <MenuItem 
                        icon={Wallet} 
                        label="Wallet" 
                        onPress={() => {
                            if (isGuest) {
                                setLoginPromptMessage("Sign in to add money to your wallet");
                                setLoginPromptVisible(true);
                            } else {
                                handleNavigation('Wallet');
                            }
                        }} 
                    />
                    <MenuItem 
                        icon={Package} 
                        label="My Orders" 
                        onPress={() => {
                            if (isGuest) {
                                setLoginPromptMessage("Sign in to view your orders");
                                setLoginPromptVisible(true);
                            } else {
                                handleNavigation('MyOrders');
                            }
                        }} 
                    />
                    <MenuItem icon={MapPin} label="Buy Station" onPress={handleBuyStation} />
                    <MenuItem icon={Settings} label="Settings" onPress={() => handleNavigation('Settings')} />

                    <View style={[styles.menuDivider, { backgroundColor: theme.divider }]} />

                    {/* SUPPORT Section */}
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Support</Text>
                    <MenuItem 
                        icon={MessageCircle} 
                        label="Raise a Request" 
                        onPress={() => {
                            if (isGuest) {
                                setLoginPromptMessage("Sign in to view your support requests status");
                                setLoginPromptVisible(true);
                            } else {
                                handleNavigation('RequestStatus');
                            }
                        }}
                    />
                    <MenuItem icon={HelpCircle} label="FAQs" onPress={() => handleNavigation('FAQ')} />
                    <MenuItem icon={Users} label="Contacts" onPress={() => handleNavigation('Contacts')} />

                    <View style={[styles.menuDivider, { backgroundColor: theme.divider }]} />

                    {/* PRODUCT Section */}
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Product</Text>
                    <MenuItem 
                        icon={ShieldCheck} 
                        label="Battery Warranty" 
                        onPress={() => {
                            if (isGuest) {
                                setLoginPromptMessage("Sign in to view your warranty claim");
                                setLoginPromptVisible(true);
                            } else {
                                handleNavigation('BatteryWarrantyStatus');
                            }
                        }}
                    />
                    <MenuItem icon={FileText} label="Terms & Conditions" onPress={() => handleNavigation('Terms')} />
                    <MenuItem icon={Lock} label="Privacy Policy" onPress={() => handleNavigation('TermsConsent', { readOnly: true })} />
                    <MenuItem icon={Info} label="About" onPress={() => handleNavigation('About')} />

                    <View style={{ flex: 1, minHeight: 30 }} />

                    {isGuest ? (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.loginBtn]}
                            onPress={() => {
                                onClose();
                                setTimeout(() => {
                                    navigation.navigate('Login');
                                }, 300);
                            }}
                        >
                            <LogOut size={18} color="#00B074" style={{ transform: [{ rotate: '180deg' }] }} />
                            <Text style={styles.loginBtnText}>Sign In</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.actionBtn, styles.logoutBtn, { backgroundColor: theme.cardBg }]} onPress={handleLogout}>
                            <LogOut size={18} color="#EF5350" />
                            <Text style={styles.logoutBtnText}>Log Out</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </Animated.View>

            {/* Buy Station Modal */}
            <Modal
                transparent={true}
                visible={isBuyModalVisible}
                animationType="fade"
                onRequestClose={closeBuyModal}
            >
                <View style={[styles.modalOverlay, { backgroundColor: theme.overlayBg }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Buy Station</Text>
                            <TouchableOpacity onPress={closeBuyModal} style={[styles.closeModalBtn, { backgroundColor: theme.white }]}>
                                <X size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Join our network and earn by hosting an EV charging station.</Text>

                            <View style={styles.stepsContainer}>
                                <View style={styles.stepRow}>
                                    <CheckCircle size={18} color="#00B074" style={styles.stepIcon} />
                                    <Text style={[styles.stepText, { color: theme.textPrimary }]}>Contact our support team with your property details.</Text>
                                </View>
                                <View style={styles.stepRow}>
                                    <CheckCircle size={18} color="#00B074" style={styles.stepIcon} />
                                    <Text style={[styles.stepText, { color: theme.textPrimary }]}>Our team will verify the location and feasibility.</Text>
                                </View>
                                <View style={styles.stepRow}>
                                    <CheckCircle size={18} color="#00B074" style={styles.stepIcon} />
                                    <Text style={[styles.stepText, { color: theme.textPrimary }]}>Once approved, we will assist with installation and setup.</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.white }]} onPress={contactWhatsApp}>
                                <Text style={[styles.primaryBtnText, { color: theme.textPrimary }]}>Contact on WhatsApp</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Login required dialog */}
            <LoginRequiredDialog
                visible={loginPromptVisible}
                contextMessage={loginPromptMessage}
                onLoginPress={() => {
                    setLoginPromptVisible(false);
                    onClose();
                    setTimeout(() => {
                        navigation.navigate('Login', { returnRoute: 'Home' });
                    }, 300);
                }}
                onClose={() => setLoginPromptVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    drawer: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    logo: {
        width: 100,
        height: 35,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 16,
        borderRadius: 24,
        marginBottom: 16,
        marginTop: 10,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: '900',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 12,
        fontWeight: '600',
    },
    signInText: {
        color: '#00B074',
        fontWeight: '900',
        fontSize: 13,
        marginTop: 2,
    },
    divider: {
        height: 1,
        marginHorizontal: 16,
        marginBottom: 10,
    },
    menuContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 16,
        marginBottom: 4,
    },
    menuItemActive: {
        backgroundColor: 'rgba(0, 176, 116, 0.1)',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuLabel: {
        fontSize: 14,
        fontWeight: '800',
    },
    menuLabelActive: {
        color: '#00B074',
        fontWeight: '900',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 28,
        marginTop: 10,
        marginBottom: 20,
    },
    loginBtn: {
        backgroundColor: 'rgba(0, 176, 116, 0.1)',
    },
    loginBtnText: {
        color: '#00B074',
        fontSize: 15,
        fontWeight: '900',
        marginLeft: 10,
    },
    logoutBtnText: {
        color: '#EF5350',
        fontSize: 15,
        fontWeight: '900',
        marginLeft: 10,
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase',
        marginTop: 12,
        marginBottom: 6,
        paddingHorizontal: 10,
        letterSpacing: 1.2,
    },
    menuDivider: {
        height: 1,
        marginVertical: 10,
        marginHorizontal: 10,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        width: '100%',
        borderRadius: 28,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    closeModalBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900'
    },
    modalBody: {
        alignItems: 'flex-start'
    },
    modalSubtitle: {
        fontSize: 13,
        marginBottom: 20,
        lineHeight: 20,
        fontWeight: '600'
    },
    stepsContainer: {
        marginBottom: 24,
        width: '100%'
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16
    },
    stepIcon: {
        marginTop: 2,
        marginRight: 12
    },
    stepText: {
        fontSize: 13,
        flex: 1,
        lineHeight: 20,
        fontWeight: '600'
    },
    primaryBtn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center'
    },
    primaryBtnText: {
        fontSize: 15,
        fontWeight: '900'
    }
});
