import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { ChevronRight, Calendar, TrendingUp, Bolt, MapPin, Layout as LayoutIcon, Car } from 'lucide-react-native';
import { authService } from '../services/auth';
import { useTheme } from '../context/ThemeContext';

const MenuItem = ({ icon: Icon, title, onPress, subtitle, badgeText, showChevron = true, index = 0, isLast = false, theme, isDark }) => {
    const scale = React.useRef(new Animated.Value(1)).current;
    const opacity = React.useRef(new Animated.Value(1)).current;
    const enterAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(enterAnim, {
            toValue: 1,
            duration: 500,
            delay: index * 50,
            useNativeDriver: true,
        }).start();
    }, []);

    const animatedStyle = {
        transform: [
            { scale },
            {
                translateY: enterAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                }),
            },
        ],
        opacity: Animated.multiply(opacity, enterAnim),
    };

    const onPressIn = () => {
        Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
        Animated.timing(opacity, { toValue: 0.8, duration: 100, useNativeDriver: true }).start();
    };

    const onPressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={animatedStyle}>
            <Pressable
                style={styles.menuItem}
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
            >
                <View style={[styles.iconContainer, { backgroundColor: theme.white }]}>
                    <Icon size={18} color={isDark ? '#FFFFFF' : '#1A1A1A'} />
                </View>
                <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>{title}</Text>
                    {subtitle && <Text style={[styles.menuItemSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
                </View>
                {badgeText && (
                    <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>{badgeText}</Text>
                    </View>
                )}
                {showChevron && <ChevronRight size={18} color={theme.textSecondary} />}
            </Pressable>
            {!isLast && <View style={[styles.menuDivider, { backgroundColor: theme.divider }]} />}
        </Animated.View>
    );
};

export default function LibraryScreen({ navigation, activeBookingCount = 0 }) {
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const [user, setUser] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const scrollY = React.useRef(new Animated.Value(0)).current;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const { theme, isDark } = useTheme();

    useEffect(() => {
        if (isFocused) {
            const task = InteractionManager.runAfterInteractions(() => {
                loadUser();
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }).start();
            });
            return () => task.cancel();
        } else {
            fadeAnim.setValue(0);
        }
    }, [isFocused]);

    const loadUser = async () => {
        try {
            const userData = await authService.getUser();
            setUser(userData);
        } finally {
            setIsLoaded(true);
        }
    };

    return (
        <Animated.ScrollView
            onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={[styles.contentContainer]}
            showsVerticalScrollIndicator={false}
        >
            
            <Animated.View 
                style={[styles.sectionContainer, { opacity: fadeAnim }]}
            >
                <Animated.Text 
                    style={[styles.sectionTitle, {
                        color: theme.textSecondary,
                        transform: [{
                            translateY: fadeAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [20, 0],
                            })
                        }]
                    }]}
                >
                    My Activity
                </Animated.Text>
                
                <View style={[styles.menuGroup, { backgroundColor: theme.cardBg }]}>
                    <MenuItem
                        icon={Bolt}
                        title="Active Sessions"
                        onPress={() => navigation.navigate('ActiveSessions')}
                        index={0}
                        theme={theme}
                        isDark={isDark}
                    />
                    <MenuItem
                        icon={Calendar}
                        title="My Bookings"
                        onPress={() => navigation.navigate('MyBookings')}
                        badgeText={activeBookingCount > 0 ? `Upcoming` : null}
                        index={1}
                        theme={theme}
                        isDark={isDark}
                    />
                    <MenuItem
                        icon={TrendingUp}
                        title="Charging Insights"
                        onPress={() => navigation.navigate('ChargingInsights')}
                        index={2}
                        theme={theme}
                        isDark={isDark}
                    />
                    <MenuItem
                        icon={Car}
                        title="My Vehicles"
                        onPress={() => navigation.navigate('VehicleDetails')}
                        index={3}
                        isLast={true}
                        theme={theme}
                        isDark={isDark}
                    />
                </View>
            </Animated.View>

            {/* Developer Section */}
            {(user && (user.email?.toLowerCase().includes('om.lokhande34') || user.email?.toLowerCase().includes('jayeshmahajan340') || user.email?.toLowerCase().includes('sj020420'))) && (
                <Animated.View 
                    style={[styles.sectionContainer, { opacity: fadeAnim }]}
                >
                    <Animated.Text 
                        style={[styles.sectionTitle, {
                            color: theme.textSecondary,
                            transform: [{
                                translateY: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0],
                                })
                            }]
                        }]}
                    >
                        Developer
                    </Animated.Text>
                    
                    <View style={[styles.menuGroup, { backgroundColor: theme.cardBg }]}>
                        <MenuItem
                            icon={LayoutIcon}
                            title="Developer Options"
                            onPress={() => navigation.navigate('DeveloperOptions')}
                            index={6}
                            isLast={true}
                            theme={theme}
                            isDark={isDark}
                        />
                    </View>
                </Animated.View>
            )}

            <View style={{ height: 120 + insets.bottom }} />
        </Animated.ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    menuGroup: {
        borderRadius: 28,
        paddingVertical: 12,
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuItemText: {
        fontSize: 14,
        fontWeight: '800',
    },
    menuItemSubtitle: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '600',
    },
    menuDivider: {
        height: 1,
    },
    menuBadge: {
        backgroundColor: 'rgba(0, 176, 116, 0.1)',
        borderColor: '#00B074',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginRight: 8,
    },
    menuBadgeText: {
        color: '#00B074',
        fontSize: 11,
        fontWeight: '700',
    },
});
