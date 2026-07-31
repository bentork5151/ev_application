import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function AboutScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const appVersion = "1.0.0"; 

    return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.cardBg }]}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>About Us</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* Brand Logo Card Container */}
                <View style={styles.logoCard}>
                    <Image
                        source={require('../assets/images/logo_inverted.png')}
                        style={[styles.logoImage, { tintColor: theme.textPrimary }]}
                        resizeMode="contain"
                    />
                </View>

                {/* About Content Card */}
                <View style={[styles.descriptionCard, { backgroundColor: theme.cardBg }]}>
                    <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
                        Bentork Industries is a leading manufacturer of Lithium-ion and LFP
                        battery packs in India with over five years of experience delivering
                        safe, high-performance, and long-lasting energy solutions for EVs,
                        solar, industrial, and other applications.
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
                        Building on this expertise, we are expanding into EV charging
                        infrastructure, providing safe, reliable, and user-friendly charging
                        experiences with smart technology, real-time monitoring, and seamless
                        digital payments.
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.textSecondary, marginBottom: 0 }]}>
                        Our commitment: “Connecting to the Modern World” through innovation,
                        quality, and accessible energy solutions for businesses and everyday
                        users.
                    </Text>
                </View>

                {/* Footer Version Details */}
                <View style={styles.footer}>
                    <Text style={[styles.versionText, { color: theme.textSecondary }]}>Version {appVersion}</Text>
                </View>
            </ScrollView>
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
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    logoCard: {
        width: '100%',
        height: 140,
        backgroundColor: '#e2e7ec00',
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        padding: 24,
    },
    logoImage: {
        width: '80%',
        height: '100%',
    },
    descriptionCard: {
        borderRadius: 28,
        padding: 24,
        marginBottom: 24,
    },
    paragraph: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 16,
        textAlign: 'justify',
    },
    footer: {
        alignItems: 'center',
        marginTop: 10,
    },
    versionText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
