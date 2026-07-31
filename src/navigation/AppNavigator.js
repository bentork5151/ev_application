import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef, DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators, TransitionPresets } from '@react-navigation/stack';
import { DeviceEventEmitter } from 'react-native';

import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import OtpScreen from '../screens/OtpScreen';
import DeveloperScreen from '../screens/DeveloperScreen';
import ConfigScreen from '../screens/ConfigScreen';
import SessionScreen from '../screens/SessionScreen';
import WalletScreen from '../screens/WalletScreen';
import AccountsScreen from '../screens/AccountsScreen';
import AboutScreen from '../screens/AboutScreen';
import FAQScreen from '../screens/FAQScreen';
import NotificationScreen from '../screens/NotificationScreen';
import MapScreen from '../screens/MapScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import InvoiceScreen from '../screens/InvoiceScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TermsScreen from '../screens/TermsScreen';
import TermsConsentScreen from '../screens/TermsConsentScreen';
import MobileLoginScreen from '../screens/MobileLoginScreen';
import TripPlannerScreen from '../screens/TripPlannerScreen';
import VehicleDetailsScreen from '../screens/VehicleDetailsScreen';
import ChargingInsightsScreen from '../screens/ChargingInsightsScreen';
import StationReviewsScreen from '../screens/StationReviewsScreen';
import StationDetailsScreen from '../screens/StationDetailsScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import ActiveSessionsScreen from '../screens/ActiveSessionsScreen';
import TestScreen from '../screens/TestScreen';
import ContactsScreen from '../screens/ContactsScreen';
import RfidScreen from '../screens/RfidScreen';
import RaiseRequestScreen from '../screens/RaiseRequestScreen';
import RequestStatusScreen from '../screens/RequestStatusScreen';
import ReferralScreen from '../screens/ReferralScreen';
import BatteryWarrantyScreen from '../screens/BatteryWarrantyScreen';
import BatteryWarrantyStatusScreen from '../screens/BatteryWarrantyStatusScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';

import { useAlert } from '../context/AlertContext';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/auth';
 
 
// Navigation Reference for external access or handling resets
export const navigationRef = createNavigationContainerRef();
const Stack = createStackNavigator();
 
export default function AppNavigator() {
    const { showAlert } = useAlert();
    const { theme, isDark } = useTheme();

    const customNavTheme = {
        ...(isDark ? NavDarkTheme : NavDefaultTheme),
        colors: {
            ...(isDark ? NavDarkTheme.colors : NavDefaultTheme.colors),
            background: theme.background,
            card: theme.cardBg,
            text: theme.textPrimary,
            border: theme.divider,
        },
    };

    useEffect(() => {
        // Listen for Session Expired Events (401 from API)
        const subscription = DeviceEventEmitter.addListener('auth_session_expired', async () => {
            console.log("Session Expired Event Received");
            await authService.logout();

            showAlert(
                "Session Expired",
                "Your session has expired. Please login again to continue.",
                [{
                    text: "Login",
                    onPress: () => {
                        if (navigationRef.isReady()) {
                            navigationRef.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        }
                    }
                }]
            );
        });

        return () => subscription.remove();
    }, []);

    const linking = {
        prefixes: ['https://web.bentork.in', 'bentork://'],
        config: {
            screens: {
                Splash: {
                    path: 'splash/:chargerId',
                    parse: {
                        chargerId: (id) => `${id}`,
                    },
                },
                // Add other screens if needed
            },
        },
    };

    return (
        <NavigationContainer ref={navigationRef} linking={linking} theme={customNavTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                <Stack.Screen name="OtpLogin" component={OtpScreen} />
                <Stack.Screen name="DeveloperOptions" component={DeveloperScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen 
                    name="Config" 
                    component={ConfigScreen} 
                    options={{
                        ...TransitionPresets.ModalSlideFromBottomIOS,
                        gestureEnabled: true,
                        cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS
                    }}
                />
                <Stack.Screen name="Session" component={SessionScreen} />
                <Stack.Screen name="Wallet" component={WalletScreen} />
                <Stack.Screen
                    name="Accounts"
                    component={AccountsScreen}
                    options={{
                        presentation: 'transparentModal',
                        animation: 'none',
                    }}
                />
                <Stack.Screen name="About" component={AboutScreen} />
                <Stack.Screen name="FAQ" component={FAQScreen} />
                <Stack.Screen name="Notification" component={NotificationScreen} />
                <Stack.Screen name="Map" component={MapScreen} />
                <Stack.Screen name="QRScanner" component={QRScannerScreen} />
                <Stack.Screen name="Invoice" component={InvoiceScreen} />
                <Stack.Screen name="Search" component={SearchScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="Terms" component={TermsScreen} />
                <Stack.Screen
                    name="TermsConsent"
                    component={TermsConsentScreen}
                    options={{ gestureEnabled: false }}
                />
                <Stack.Screen name="MobileLogin" component={MobileLoginScreen} />
                <Stack.Screen name="TripPlanner" component={TripPlannerScreen} />
                <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} />
                <Stack.Screen name="ChargingInsights" component={ChargingInsightsScreen} />
                <Stack.Screen name="StationReviews" component={StationReviewsScreen} />
                <Stack.Screen name="StationDetails" component={StationDetailsScreen} />
                <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
                <Stack.Screen name="ActiveSessions" component={ActiveSessionsScreen} />
                <Stack.Screen name="ActiveSessionScreen" component={SessionScreen} />
                <Stack.Screen 
                    name="Test" 
                    component={TestScreen} 
                    options={{ animation: 'none', headerShown: false }}
                />
                <Stack.Screen name="Contacts" component={ContactsScreen} />
                <Stack.Screen name="RfidApplication" component={RfidScreen} />
                <Stack.Screen name="RaiseRequest" component={RaiseRequestScreen} />
                <Stack.Screen name="RequestStatus" component={RequestStatusScreen} />
                <Stack.Screen name="Referral" component={ReferralScreen} />
                <Stack.Screen name="BatteryWarranty" component={BatteryWarrantyScreen} />
                <Stack.Screen name="BatteryWarrantyStatus" component={BatteryWarrantyStatusScreen} />
                <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
                <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

