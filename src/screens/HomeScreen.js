import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, StatusBar, FlatList, Platform } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Minus, HelpCircle, Navigation, Share2, Home, Library, Zap, Wallet, Bell, MapPin, WrapText } from 'lucide-react-native';
import LibraryScreen from './LibraryScreen';

export default function HomeScreen() {
    const [currentTab, setCurrentTab] = useState('Home');
    const [region, setRegion] = useState({
        latitude: 18.5204, // Pune approx
        longitude: 73.8567,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });


    const markers = [
        { id: 1, lat: 18.5204, lng: 73.8567 },
        { id: 2, lat: 18.5304, lng: 73.8667 },
        { id: 3, lat: 18.5104, lng: 73.8467 },
        { id: 4, lat: 18.5404, lng: 73.8367 },
        { id: 5, lat: 18.5004, lng: 73.8767 },
    ];

    const StarRating = ({ rating }) => {
        return (
            <View style={{ flexDirection: 'row' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Text key={star} style={{ color: star <= Math.floor(rating) ? '#FFD700' : '#555', fontSize: 14 }}>
                        ★
                    </Text>
                ))}
            </View>
        );
    };
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Map */}
            {currentTab === 'Home' && (
                <MapView
                    style={styles.map}
                    initialRegion={region}
                    mapType={Platform.OS === 'android' ? 'none' : 'standard'} // Use 'none' for tiles on Android
                    rotateEnabled={false}
                >
                    {/* Use CartoDB Dark Matter tiles for dark theme without API Key */}
                    <UrlTile
                        urlTemplate="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                        maximumZ={19}
                        flipY={false}
                    />

                    {markers.map(marker => (
                        <Marker
                            key={marker.id}
                            coordinate={{ latitude: marker.lat, longitude: marker.lng }}
                            pinColor="#4CAF50" // Green
                        >
                            <View style={styles.customMarker}>
                                <MapPin size={24} color="#4CAF50" fill="#4CAF50" />
                                <View style={styles.markerDot} />
                            </View>
                        </Marker>
                    ))}
                </MapView>
            )}

            {/* Header */}
            <SafeAreaView style={styles.headerContainer} edges={['top']}>
                <View style={styles.headerContent}>
                    <Image
                        source={require('../assets/images/logo_inverted.png')} // Assuming this exists, tint it black
                        style={styles.logo}
                        resizeMode="contain"
                        tintColor="#ffffffff"
                    />
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.iconBtn}>
                            <Wallet color="#ffffffff" size={18} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn}>
                            <Bell color="#ffffffff" size={18} />
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>7</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>



            {/* Floating Controls */}
            {currentTab === 'Home' && (
                <>
                    <TouchableOpacity style={styles.searchButton}>
                        <Search color="#fff" size={24} />
                    </TouchableOpacity>

                    <View style={styles.zoomControls}>
                        <TouchableOpacity style={styles.zoomBtn}>
                            <Plus color="#000" size={24} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.zoomBtn}>
                            <Minus color="#000" size={24} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.helpButton}>
                        <HelpCircle color="#fff" size={28} />
                    </TouchableOpacity>

                    {/* Station Card */}
                    <View style={styles.cardContainer}>
                        <View style={styles.cardContentRow}>
                            <View style={styles.leftColumn}>

                                <Text style={styles.stationName}>Bentork Charging Station</Text>
                                <View style={styles.ratingRow}>
                                    <Text style={styles.ratingText}>4.3</Text>
                                    <StarRating rating={4.3} />
                                </View>
                                <Text style={styles.addressText}>
                                    City Center, 15 & 15A, Connaught Rd, near Lemon Tree Premier Hotel, Modi Colony, Pune, Maharashtra 411001
                                </Text>
                                <Text style={styles.statusText}>Available</Text>

                                <View style={styles.connectorRow}>
                                    <View style={styles.connectorItem}>
                                        <Zap size={14} color="#00E5FF" />
                                        <Text style={styles.connectorText}> CCS • 60kW</Text>
                                        <Text style={styles.totalText}>Total 2</Text>
                                    </View>
                                    <View style={styles.connectorItem}>
                                        <Zap size={14} color="#00E5FF" />
                                        <Text style={styles.connectorText}> Type 2 • 15kW</Text>
                                        <Text style={styles.totalText}>Total 2</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.rightColumn}>
                                <View style={styles.imageContainer}>
                                    <Image
                                        source={{ uri: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' }}
                                        style={styles.stationImage}
                                    />
                                    <View style={styles.imageOverlay} />
                                </View>

                                <View style={styles.cardActions}>
                                    <TouchableOpacity style={styles.actionBtn}>
                                        <View style={styles.actionIconCircle}>
                                            <Navigation color="#000" size={24} />
                                        </View>
                                        <Text style={styles.actionText}>Directions</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn}>
                                        <View style={styles.actionIconCircle}>
                                            <Share2 color="#000" size={24} />
                                        </View>
                                        <Text style={styles.actionText}>Share</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </>
            )}

            {/* Library Screen */}
            {currentTab === 'Library' && <LibraryScreen />}

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('Home')}>
                    <View style={currentTab === 'Home' ? styles.activeNavPill : null}>
                        <Home color={currentTab === 'Home' ? "#000" : "#fff"} size={24} />
                    </View>
                    <Text style={currentTab === 'Home' ? styles.navTextActive : styles.navText}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.centerNavBtnContainer}>
                    <View style={styles.centerNavBtn}>
                        <Zap color="#000" size={32} fill="#000" />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('Library')}>
                    <View style={currentTab === 'Library' ? styles.activeNavPill : null}>
                        <Library color={currentTab === 'Library' ? "#000" : "#fff"} size={24} />
                    </View>
                    <Text style={currentTab === 'Library' ? styles.navTextActive : styles.navText}>Library</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    headerContainer: {
        backgroundColor: 'rgba(33, 33, 33, 0.9)', // Matte black with transparency
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 15,
        zIndex: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    logo: {
        width: 100,
        height: 50,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBtn: {
        marginLeft: 20,
    },
    badge: {
        position: 'absolute',
        right: -6,
        top: -6,
        backgroundColor: 'red',
        borderRadius: 10,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    searchButton: {
        position: 'absolute',
        top: 100,
        right: 20,
        backgroundColor: '#212121', // Dark grey/black
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    zoomControls: {
        position: 'absolute',
        bottom: 380, // Adjust based on screen height
        left: 20,
        backgroundColor: '#fff',
        borderRadius: 25,
        width: 50,
        alignItems: 'center',
        paddingVertical: 5,
        elevation: 5,
    },
    zoomBtn: {
        padding: 10,
    },
    divider: {
        width: '60%',
        height: 1,
        backgroundColor: '#ddd',
    },
    helpButton: {
        position: 'absolute',
        bottom: 380,
        right: 20,
        backgroundColor: '#212121',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    customMarker: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
        position: 'absolute',
        top: 8,
    },
    // Station Card
    cardContainer: {
        position: 'absolute',
        bottom: 100, // Above nav bar
        left: 15,
        right: 15,
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    cardContentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    leftColumn: {
        flex: 1,
        paddingRight: 15,
    },
    rightColumn: {
        width: 110,
        alignItems: 'center',
    },
    stationName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    ratingText: {
        color: '#fff',
        marginRight: 5,
        fontWeight: 'bold',
    },
    addressText: {
        color: '#aaa',
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 10,
    },
    statusText: {
        color: '#00E676', // Green
        fontWeight: 'bold',
        marginBottom: 10,
    },
    connectorRow: {
        marginTop: 5,
    },
    connectorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    connectorText: {
        color: '#fff',
        fontSize: 12,
        marginRight: 10,
    },
    totalText: {
        color: '#777',
        fontSize: 12,
    },
    imageContainer: {
        width: 100,
        height: 100,
        borderRadius: 15,
        marginBottom: 15,
        overflow: 'hidden',
        backgroundColor: '#333',
    },
    stationImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)'
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 5,
    },
    actionBtn: {
        alignItems: 'center',
    },
    actionIconCircle: {
        backgroundColor: '#fff',
        width: 45,
        height: 45,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
    },

    // Bottom Nav
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1E1E1E',
        height: 80,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start', // Top align to handle the floating btn
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
    },
    activeNavPill: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 5,
        marginBottom: 5,
    },
    navTextActive: {
        color: '#fff',
        fontSize: 12,
    },
    navText: {
        color: '#888',
        fontSize: 12,
        marginTop: 5,
    },
    centerNavBtnContainer: {
        top: -30, // Move up
        alignItems: 'center',
    },
    centerNavBtn: {
        backgroundColor: '#fff',
        width: 65,
        height: 65,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
});
