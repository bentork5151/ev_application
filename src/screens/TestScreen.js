import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Star, Zap, Coffee } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { sessionApi, cafesApi, locationsApi } from '../services/api';
import placesService from '../services/placesService';
import { authService } from '../services/auth';

import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

export default function TestScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  // const { isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Handshake route params if present
  const initialSession = route?.params?.resumeSessionId
    ? { sessionId: route.params.resumeSessionId, ...route.params }
    : null;

  // Real backend states
  const [activeSession, setActiveSession] = useState(initialSession);
  const [liveEnergy, setLiveEnergy] = useState(0);
  const [livePower, setLivePower] = useState(0);
  const [isStopping, setIsStopping] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(!initialSession);
  const [backendCafes, setBackendCafes] = useState([]);
  const [isLoadingCafes, setIsLoadingCafes] = useState(true);

  // Warmup stage state (hooking user for 9 seconds on session initiation)
  const [isWarmingUp, setIsWarmingUp] = useState(true);

  // 9-second warmup timer when active session is present
  useEffect(() => {
    if (activeSession) {
      setIsWarmingUp(true);
      const warmupTimer = setTimeout(() => {
        setIsWarmingUp(false);
      }, 9000);
      return () => clearTimeout(warmupTimer);
    } else {
      setIsWarmingUp(false);
    }
  }, [activeSession?.sessionId]);

  // Ref to hold current activeSession for interval closure safety
  const activeSessionRef = useRef(activeSession);
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Infinite pulse animation on status text
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [pulseAnim]);

  // Fetch cafes for the session's station or station location
  useEffect(() => {
    const fetchCafes = async () => {
      const stationId = activeSession?.stationId || route?.params?.stationId;
      const lat = activeSession?.latitude || route?.params?.latitude;
      const lng = activeSession?.longitude || route?.params?.longitude;

      try {
        setIsLoadingCafes(true);
        let cafeList = [];

        // 1. Try station-specific cafes from backend
        if (stationId) {
          try {
            const data = await cafesApi.getCafesByStation(stationId);
            if (Array.isArray(data) && data.length > 0) {
              cafeList = data;
            }
          } catch (e) {
            console.log('TestScreen: Station cafe fetch failed, falling back:', e?.message);
          }
        }

        // 2. Fall back to nearby cafes by coordinates
        if (cafeList.length === 0 && lat && lng) {
          try {
            const data = await cafesApi.getNearbyCafes(lat, lng);
            if (Array.isArray(data) && data.length > 0) {
              cafeList = data;
            }
          } catch (e) {
            console.log('TestScreen: Backend nearby cafe fetch failed:', e?.message);
          }

          if (cafeList.length === 0) {
            try {
              const amenities = await placesService.fetchNearbyAmenities(lat, lng);
              if (Array.isArray(amenities) && amenities.length > 0) {
                cafeList = amenities;
              }
            } catch (e) {
              console.log('TestScreen: Google Places fetch failed:', e?.message);
            }
          }
        }

        // 3. Fall back to generic locations if no station/location data available
        if (cafeList.length === 0) {
          try {
            const data = await locationsApi.getAllLocations();
            if (Array.isArray(data)) cafeList = data;
          } catch (e) {
            console.log('TestScreen: Fallback getAllLocations failed:', e?.message);
          }
        }

        const getCafeImage = (loc) => {
          const uri = loc?.photoUrl || loc?.imageUrl || loc?.image_url || loc?.photo_url || loc?.photo || loc?.image;
          if (uri && typeof uri === 'string' && (uri.startsWith('http://') || uri.startsWith('https://'))) {
            return uri;
          }
          return null;
        };

        const mappedLocations = cafeList.map((loc) => ({
          id: loc.id || loc.locationId || Math.random().toString(),
          title: loc.name || loc.title || loc.locationName || 'Amenity',
          rating: loc.rating || loc.stars || '4.5',
          status: (loc.open !== false && loc.isOpen !== false) ? 'Open' : 'Closed',
          image: getCafeImage(loc),
          imgError: false,
        }));
        setBackendCafes(mappedLocations);
      } catch (err) {
        console.warn('TestScreen: Failed to fetch cafes for station:', err);
        setBackendCafes([]);
      } finally {
        setIsLoadingCafes(false);
      }
    };

    fetchCafes();
  }, [
    activeSession?.stationId,
    activeSession?.latitude,
    activeSession?.longitude,
    route?.params?.stationId,
    route?.params?.latitude,
    route?.params?.longitude,
  ]);

  // Fetch active session & poll live telemetry and status check
  useEffect(() => {
    let energyInterval;

    const fetchSession = async () => {
      try {
        const user = await authService.getCurrentUser();
        const userId = user?.id || user?.email;
        if (userId) {
          const session = await sessionApi.getActiveSession(userId);
          if (session) {
            setActiveSession(session);
            fetchTelemetry(session.sessionId);
          } else {
            setActiveSession(null);
          }
        }
      } catch (err) {
        console.warn('TestScreen: Error fetching active session:', err);
      } finally {
        setIsLoadingSession(false);
      }
    };

    const fetchTelemetry = async (sId) => {
      const sessionId = sId || activeSessionRef.current?.sessionId;
      if (!sessionId) return;

      try {
        // 1. Fetch live energy
        const energy = await sessionApi.getSessionEnergy(sessionId);
        setLiveEnergy(energy || 0);

        if (activeSessionRef.current?.rate) {
          setLivePower(activeSessionRef.current.rate);
        } else {
          setLivePower(0);
        }

        // 2. Check if session completed on backend
        const statusData = await sessionApi.getSessionStatus(sessionId);
        const currentStatus = String(statusData?.status || '').toUpperCase();
        if (currentStatus === 'COMPLETED' || currentStatus === 'STOPPED' || currentStatus === 'FINISHED') {
          setActiveSession(null);
          setLiveEnergy(0);
          setLivePower(0);
          Alert.alert('Session Finished', 'Your charging session has completed.');
        }
      } catch (e) {
        // Silent catch for live polling
      }
    };

    fetchSession();

    // Poll live energy & status every 5 seconds
    energyInterval = setInterval(() => {
      if (activeSessionRef.current?.sessionId) {
        fetchTelemetry(activeSessionRef.current.sessionId);
      }
    }, 5000);

    return () => {
      if (energyInterval) clearInterval(energyInterval);
    };
  }, []);

  // Backend stop session logic
  const handleStopSession = async () => {
    const sId = activeSession?.sessionId || route?.params?.resumeSessionId;
    if (!sId) {
      Alert.alert('Notice', 'No active charging session to stop.');
      return;
    }

    try {
      setIsStopping(true);
      await sessionApi.stopSession(sId);
      setActiveSession(null);
      setLiveEnergy(0);
      setLivePower(0);
      Alert.alert('Session Stopped', 'Charging session has been successfully stopped.');
    } catch (error) {
      console.error('TestScreen: Failed to stop session:', error);
      Alert.alert('Error', error?.message || 'Failed to stop session. Please try again.');
    } finally {
      setIsStopping(false);
    }
  };

  const defaultHero = isDark
    ? require('../assets/images/dark/login_hero.webp')
    : require('../assets/images/login_hero.webp');
  const stationImage = activeSession?.stationImage || defaultHero;
  const energyDisplay = liveEnergy > 0 ? liveEnergy.toFixed(2) : '0.00';
  const powerDisplay = livePower > 0 ? livePower.toFixed(2) : '0.00';

  // Dynamic Status Text: Warmup stage -> Speed stage (Supercharging vs Charging)
  const getSessionStatusText = () => {
    if (!activeSession) return 'No Active Session';
    if (isWarmingUp) return 'Warming up...';

    // Determine speed tier based on charger type or live power output
    const isFastCharger =
      activeSession?.chargerType?.toLowerCase().includes('fast') ||
      activeSession?.chargerType?.toLowerCase().includes('dc') ||
      livePower >= 22 ||
      (activeSession?.rate && activeSession.rate >= 22);

    return isFastCharger ? 'Supercharging' : 'Charging';
  };

  const sessionStatusText = getSessionStatusText();

  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Top Hero Charging Station Image (Behind Status Bar) */}
      <View style={styles.heroContainer}>
        <Image
          source={typeof stationImage === 'string' ? { uri: stationImage } : stationImage}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={
            isDark
              ? ['transparent', 'rgba(19, 17, 20, 0.4)', 'rgba(19, 17, 20, 0.95)', theme.background]
              : ['transparent', 'rgba(208, 214, 219, 0.4)', 'rgba(208, 214, 219, 0.95)', theme.background]
          }
          style={styles.heroGradient}
          pointerEvents="none"
        />
      </View>

      {/* Content Body wrapped in SafeAreaView for safe top/bottom margins */}
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <View style={styles.container}>
          {/* Content Body */}
          <View style={styles.contentBody}>
            {/* Brand Header */}
            <View style={styles.brandContainer}>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.brandLogoImage}
                resizeMode="contain"
              />
            </View>

            {/* Charging Status */}
            <View style={styles.statusContainer}>
              <Animated.Text style={[styles.statusTitle, { opacity: pulseAnim }]}>
                {sessionStatusText}
              </Animated.Text>
            </View>

            {/* Live Metrics Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  <Text style={styles.metricTilde}>~</Text>
                  {energyDisplay} <Text style={styles.metricUnit}>kWh</Text>
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {powerDisplay} <Text style={styles.metricUnit}>kW</Text>
                </Text>
              </View>
            </View>

            {/* Nearby Amenities Cards dynamically loaded from backend */}
            <View style={styles.cardsRowContainer}>
              {isLoadingCafes ? (
                <ActivityIndicator size="small" color={theme.textPrimary} style={{ width: '100%' }} />
              ) : backendCafes.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.scrollCardsContent}
                >
                  {backendCafes.map((item, idx) => (
                    <View key={item.id || idx} style={styles.amenityCard}>
                      <View style={styles.cardImageContainer}>
                        {item.image && !item.imgError ? (
                          <Image
                            source={{ uri: item.image }}
                            style={styles.cardImage}
                            resizeMode="cover"
                            onError={() => {
                              setBackendCafes((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, imgError: true } : c))
                              );
                            }}
                          />
                        ) : (
                          <View style={[styles.cardImage, styles.placeholderImage]}>
                            <Coffee size={24} color={theme.textSecondary} />
                          </View>
                        )}
                        <View style={styles.cardBadge}>
                          <Sparkles size={10} color="#fff" />
                        </View>
                      </View>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.cardFooter}>
                        <View style={styles.ratingRow}>
                          <Star size={12} color="#FFB800" fill="#FFB800" />
                          <Text style={styles.ratingText}>{item.rating}</Text>
                        </View>
                        <Text style={styles.statusOpen}>{item.status}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          </View>

          {/* Bottom Bar containing Sticky Stop Charging CTA Button */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              style={styles.stopButton}
              activeOpacity={0.8}
              onPress={handleStopSession}
              disabled={isStopping}
            >
              {isStopping ? (
                <ActivityIndicator size="small" color={theme.textPrimary} />
              ) : (
                <Text style={styles.stopButtonText}>Stop Charging</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  heroContainer: {
    width: '100%',
    height: '40%',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  contentBody: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 4,
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandLogoImage: {
    marginTop: -36,
    width: 140,
    height: 32,
    tintColor: theme.textPrimary,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  metricTilde: {
    fontWeight: '400',
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  cardsRowContainer: {
    width: '100%',
  },
  scrollCardsContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  amenityCard: {
    width: CARD_WIDTH,
    backgroundColor: theme.cardBg,
    borderRadius: 18,
    padding: 8,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImageContainer: {
    width: '100%',
    height: 124,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: isDark ? '#252525' : '#E2E7EC',
    justify: 'center',
    alignItems: 'center',
  },
  cardBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    padding: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  statusOpen: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00B074',
  },
  bottomBar: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 62,
    borderRadius: 26,
    backgroundColor: theme.buttonBg,
    borderWidth: 1,
    borderColor: theme.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  stopButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
  },
});




