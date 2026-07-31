import React, { useEffect, useRef, useState } from 'react'
import { View, Image, StyleSheet, Dimensions, Animated, Easing, StatusBar, Platform, Linking, useColorScheme } from 'react-native'
import Svg, { Path, G } from 'react-native-svg'
import { authService } from '../services/auth';
import { NotificationService } from '../services/NotificationService';
import remoteConfig from '@react-native-firebase/remote-config';
import DeviceInfo from 'react-native-device-info';
import SpInAppUpdates from 'sp-react-native-in-app-updates';
import UpdateRequiredModal from '../components/UpdateRequiredModal';

import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window')

// SVG Paths from Web Version
const PATH_GREEN = "M41.3,-72.6C53.4,-65.3,63.2,-54.6,70.4,-42.1C77.6,-29.6,82.2,-15.3,81.3,-1.4C80.4,12.5,74,26,64.8,37.3C55.6,48.6,43.6,57.7,30.8,63.2C18,68.7,4.4,70.6,-8.3,69.7C-21,68.8,-32.8,65.1,-43.2,58.3C-53.6,51.5,-62.6,41.6,-68.9,30.1C-75.2,18.6,-78.8,5.5,-75.9,-6.2C-73,-17.9,-63.6,-28.2,-53.4,-36.5C-43.2,-44.8,-32.2,-51.1,-20.9,-58.5C-9.6,-65.9,2,-74.4,14.5,-76.6C27,-78.8,40.4,-74.7,41.3,-72.6Z"

export default function SplashScreen({ navigation, route } = {}) {
    const { theme, isDark } = useTheme();
    const styles = getStyles(theme, isDark);

    // Animation Values
    const riseAnim = useRef(new Animated.Value(0)).current // Entrance scale/translate
    const isNavigating = useRef(false); // Ref for navigation race-condition fix
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [isForceUpdate, setIsForceUpdate] = useState(true);
    const dismissSoftUpdateRef = useRef(null);

    // EXPLICIT EXIT ANIMATION REFS
    const blob1Exit = useRef(new Animated.Value(1)).current
    const blob2Exit = useRef(new Animated.Value(1)).current
    const blob3Exit = useRef(new Animated.Value(1)).current

    // EXPLICIT ENTRANCE ANIMATION REFS (Staggered Opacity)
    const blob1Enter = useRef(new Animated.Value(0)).current
    const blob2Enter = useRef(new Animated.Value(0)).current
    const blob3Enter = useRef(new Animated.Value(0)).current

    useEffect(() => {
        // Entrance: Parallel execution of Scale/Translate (Global) and Opacity (Staggered)
        Animated.parallel([
            // Global Container Rise & Scale
            Animated.timing(riseAnim, {
                toValue: 1,
                duration: 1200,
                easing: Easing.bezier(0.2, 0.8, 0.2, 1),
                useNativeDriver: true
            }),
            // Staggered Blob Appearances
            Animated.timing(blob3Enter, {
                toValue: 1,
                duration: 500,
                delay: 0,
                useNativeDriver: true
            }),
            Animated.timing(blob2Enter, {
                toValue: 1,
                duration: 500,
                delay: 200,
                useNativeDriver: true
            }),
            Animated.timing(blob1Enter, {
                toValue: 1,
                duration: 500,
                delay: 400,
                useNativeDriver: true
            })
        ]).start()

        const checkAuth = async () => {
            // Start the minimum splash timer
            const minSplashTime = new Promise(resolve => setTimeout(resolve, 5000));

            // Failsafe: Force navigation after 8 seconds if nothing else happens
            const safetyTimeout = setTimeout(() => {
                console.warn("Splash Screen Timeout - Forcing Navigation");
                handleNavigation();
            }, 8000);

            const handleNavigation = async () => {
                try {
                    if (isNavigating.current) return;
                    isNavigating.current = true;

                    clearTimeout(safetyTimeout); // Clear the failsafe if we get here normally

                    if (!navigation) {
                        console.error("Navigation prop is missing in SplashScreen");
                        return;
                    }

                    // Smooth Exit Animation: Fade out blobs individually with staggered delay
                    await new Promise(resolve => {
                        Animated.parallel([
                            Animated.timing(blob1Exit, {
                                toValue: 0,
                                duration: 200,
                                delay: 0,
                                useNativeDriver: true
                            }),
                            Animated.timing(blob2Exit, {
                                toValue: 0,
                                duration: 200,
                                delay: 200,
                                useNativeDriver: true
                            }),
                            Animated.timing(blob3Exit, {
                                toValue: 0,
                                duration: 200,
                                delay: 400,
                                useNativeDriver: true
                            })
                        ]).start(resolve);
                    });

                    const token = await authService.getToken();
                    const isValid = await authService.isTokenValid(token);

                    if (token && !isValid) {
                        console.log("Token expired during splash check, logging out...");
                        await authService.logout();
                    }

                    // Check for Deep Link from Route Params (React Navigation)
                    let deepLinkChargerId = route.params?.chargerId;

                    // Fallback: Check getInitialURL
                    if (!deepLinkChargerId) {
                        try {
                            const initialUrl = await Promise.race([
                                Linking.getInitialURL(),
                                new Promise(resolve => setTimeout(() => resolve(null), 1500))
                            ]);
                            if (initialUrl) {
                                const parts = initialUrl.split('/splash/');
                                if (parts.length > 1) {
                                    let id = parts[1];
                                    id = id.split('?')[0].split('#')[0];
                                    if (id.endsWith('/')) id = id.slice(0, -1);
                                    if (id) deepLinkChargerId = id;
                                }
                            }
                        } catch (linkError) {
                            console.warn("Deep link check failed:", linkError);
                        }
                    }

                    // Re-enabled Navigation Logic
                    if (deepLinkChargerId) {
                        const configParams = {
                            chargerId: deepLinkChargerId,
                            boxId: deepLinkChargerId,
                            stationName: 'Bentork Charger',
                            status: 'Available'
                        };

                        if (token && isValid) {
                            const tcAccepted = await authService.hasAcceptedTerms();
                            if (!tcAccepted) {
                                navigation.replace('TermsConsent', {
                                    nextScreen: 'Config',
                                    nextParams: configParams,
                                });
                            } else {
                                navigation.replace('Config', configParams);
                            }
                        } else {
                            navigation.replace('Login', {
                                postLoginTarget: 'Config',
                                postLoginParams: configParams
                            });
                        }
                    } else if (token && isValid) {
                        // Setup standard notification channels
                        await Promise.race([
                            NotificationService.setupPersonaChannels(),
                            new Promise(resolve => setTimeout(resolve, 2000))
                        ]);

                        const tcAccepted = await authService.hasAcceptedTerms();
                        if (!tcAccepted) {
                            navigation.replace('TermsConsent', { nextScreen: 'Home' });
                        } else {
                            navigation.replace('Home');
                        }
                    } else {
                        await authService.setGuestMode(true);
                        navigation.replace('Home');
                    }

                } catch (navError) {
                    console.error("Navigation logic failed:", navError);
                    if (navigation) {
                        await authService.setGuestMode(true);
                        navigation.replace('Home');
                    }
                }
            };

            // Check for Updates using Play Store and Firebase Remote Config
            if (Platform.OS === 'android') {
                try {
                    const inAppUpdates = new SpInAppUpdates(false);
                    const updateCheckPromise = inAppUpdates.checkNeedsUpdate();
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Update check timeout')), 3000)
                    );

                    const result = await Promise.race([updateCheckPromise, timeoutPromise]);

                    if (result.shouldUpdate) {
                        try {
                            await remoteConfig().setDefaults({
                                min_app_version: '0.0.1',
                            });
                            await remoteConfig().setConfigSettings({
                                minimumFetchIntervalMillis: 0,
                            });
                            
                            const rcFetchPromise = remoteConfig().fetchAndActivate();
                            const rcTimeoutPromise = new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('Remote Config timeout')), 3000)
                            );
                            
                            await Promise.race([rcFetchPromise, rcTimeoutPromise]);
                        } catch (rcError) {
                            console.log('[RemoteConfig] Fetch failed/timed out, using defaults:', rcError);
                        }

                        const minAppVersion = remoteConfig().getValue('min_app_version').asString();
                        const currentVersion = DeviceInfo.getVersion();

                        console.log(`[UpdateCheck] Local: ${currentVersion}, Required Min: ${minAppVersion}, Store Available: ${result.storeVersion || 'N/A'}`);

                        if (compareVersions(currentVersion, minAppVersion) < 0) {
                            setIsForceUpdate(true);
                            setShowUpdateModal(true);
                            return; 
                        } else {
                            setIsForceUpdate(false);
                            setShowUpdateModal(true);
                            
                            await new Promise((resolveDismiss) => {
                                dismissSoftUpdateRef.current = resolveDismiss;
                            });
                        }
                    }
                } catch (error) {
                    console.log('Update verification failed or timed out:', error);
                }
            }

            // Ensure we wait for the minimum splash time
            await minSplashTime;

            // Proceed to navigation
            await handleNavigation();
        };

        checkAuth();

    }, [navigation, route.params])

    return (
        <>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />

                {/* Foreground Layer: Logo with Dynamic Theme Tint Color */}
                <View style={styles.contentContainer}>
                    <Image
                        source={require('../assets/images/logo_inverted.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

            </View>

            {/* Dynamic Update Dialog */}
            <UpdateRequiredModal
                visible={showUpdateModal}
                isForce={isForceUpdate}
                onUpdate={() => {
                    if (!isForceUpdate) {
                        setShowUpdateModal(false);
                        if (dismissSoftUpdateRef.current) {
                            dismissSoftUpdateRef.current();
                        }
                    }
                }}
                onLater={() => {
                    setShowUpdateModal(false);
                    if (dismissSoftUpdateRef.current) {
                        dismissSoftUpdateRef.current();
                    }
                }}
            />
        </>
    )
}

// Stylesheet generator based on theme
const getStyles = (theme, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -100,
        overflow: 'visible'
    },
    contentContainer: {
        zIndex: 10,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    logo: {
        width: 200,
        height: 100,
        marginBottom: 10,
        tintColor: isDark ? '#FFFFFF' : '#1A1A1A',
    }
});
