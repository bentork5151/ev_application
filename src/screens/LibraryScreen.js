import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Wallet, Clock, Settings, HelpCircle, MessageCircle, Info, User } from 'lucide-react-native';

const MenuItem = ({ icon: Icon, title, onPress }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={styles.menuItemLeft}>
            <Icon size={24} color="#fff" />
            <Text style={styles.menuItemText}>{title}</Text>
        </View>
        <ChevronRight size={20} color="#fff" />
    </TouchableOpacity>
);

export default function LibraryScreen() {
    // We don't need SafeAreaView here if the Header provides the top spacing, 
    // but the HomeScreen Header is not sticky/absolute? It is in the flow.
    // So this component will just render below the header.
    // We need padding bottom to avoid the absolute bottom nav.

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* User Profile Card */}
            <View style={styles.profileCard}>
                <View style={styles.userInfoRow}>
                    <View style={styles.avatarContainer}>
                        {/* Placeholder for Avatar if no image */}
                        <User size={40} color="#fff" />
                    </View>
                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>User name</Text>
                        <Text style={styles.balanceLabel}>Current Balance</Text>
                    </View>
                    <TouchableOpacity style={styles.viewBalanceBtn}>
                        <Text style={styles.viewBalanceText}>View Balance</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Menu Items */}
            <View style={styles.menuContainer}>
                <MenuItem icon={Wallet} title="Wallet" onPress={() => { }} />
                <MenuItem icon={Clock} title="Charging History" onPress={() => { }} />
                <MenuItem icon={Settings} title="Settings" onPress={() => { }} />
                <MenuItem icon={HelpCircle} title="FAQs" onPress={() => { }} />
                <MenuItem icon={MessageCircle} title="Contact Us" onPress={() => { }} />
                <MenuItem icon={Info} title="About" onPress={() => { }} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 100, // Space for Bottom Nav
    },
    profileCard: {
        backgroundColor: '#1E1E1E', // Dark card background
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 2,
        borderColor: '#fff',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    balanceLabel: {
        color: '#aaa',
        fontSize: 12,
    },
    viewBalanceBtn: {
        backgroundColor: '#2A2A2A',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#444',
    },
    viewBalanceText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    menuContainer: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A2A',
    },
    // Remove border for the last item if needed, but simple CSS doesn't support :last-child easily without logic. 
    // We'll leave it or logic it out.
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemText: {
        color: '#fff',
        fontSize: 16,
        marginLeft: 15,
        fontWeight: '500',
    },
});
