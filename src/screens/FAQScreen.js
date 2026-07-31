import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const faqData = [
    {
        q: "How do I start charging my vehicle?",
        a: "Select a charger, choose a plan or custom power, connect your vehicle, and tap Start Charging from the app."
    },
    {
        q: "What types of chargers are available?",
        a: "We offer AC chargers for regular charging and DC fast chargers for quicker charging."
    },
    {
        q: "How is charging cost calculated?",
        a: "Charging cost is calculated based on energy consumed (kWh) multiplied by the rate per kWh."
    },
    {
        q: "Can I choose custom charging power?",
        a: "Yes, you can select a custom power (kW) depending on charger availability and your vehicle compatibility."
    },
    {
        q: "What payment methods are supported?",
        a: "You can only pay using your wallet balance."
    },
    {
        q: "Is GST included in the charging amount?",
        a: "GST is not added separately to the charging amount; it is deducted from your TopPop wallet balance."
    },
    {
        q: "Will I receive an invoice after charging?",
        a: "The charging invoice is only shown , while the TopPop wallet invoice is automatically sent to your registered email."
    },
    {
        q: "What happens if charging is interrupted?",
        a: "If charging stops due to power or network issues, billing will be calculated only for the energy consumed."
    },
    {
        q: "Can I stop charging anytime?",
        a: "Yes, you can stop charging at any time from the app. Charges apply only for the energy used. An emergency stop button is also available at the charging station."
    },
    {
        q: "What should I do if the charger is unavailable?",
        a: "If a charger is busy or offline, please try another nearby charger or check again after some time."
    },
    {
        q: "Who can I contact for support?",
        a: "You can contact our support team from the Help section or email us at support@bentork.com."
    }
];

export default function FAQScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const [activeIndex, setActiveIndex] = useState(null);

    const toggleFaq = (index) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.cardBg }]}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Title Section */}
                <View style={styles.titleContainer}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>FAQs</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Everything you need to know</Text>
                </View>

                {/* FAQ List */}
                <View style={styles.listContainer}>
                    {faqData.map((item, index) => {
                        const isActive = activeIndex === index;
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[styles.faqItem, { backgroundColor: theme.cardBg }]}
                                onPress={() => toggleFaq(index)}
                                activeOpacity={0.9}
                            >
                                <View style={styles.questionRow}>
                                    <Text style={[styles.questionText, { color: theme.textPrimary }]}>{item.q}</Text>
                                    <View style={[styles.iconContainer, isActive && styles.iconActive]}>
                                        <ChevronDown
                                            size={20}
                                            color={isActive ? "#00B074" : theme.textSecondary}
                                        />
                                    </View>
                                </View>

                                {isActive && (
                                    <View style={styles.answerContainer}>
                                        <Text style={[styles.answerText, { color: theme.textSecondary }]}>{item.a}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Footer */}
                <View style={[styles.footer, { borderTopColor: theme.divider }]}>
                    <Text style={[styles.footerText, { color: theme.textSecondary }]}>Still have questions?</Text>
                    <Text style={styles.footerEmail}>support@bentork.com</Text>
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
        paddingBottom: 10,
        marginTop: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingBottom: 40,
    },
    titleContainer: {
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
    },
    listContainer: {
        paddingHorizontal: 24,
        gap: 12,
    },
    faqItem: {
        borderRadius: 24,
        marginBottom: 12,
        overflow: 'hidden',
    },
    questionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 18,
        paddingHorizontal: 20,
    },
    questionText: {
        fontSize: 15,
        fontWeight: '800',
        flex: 1,
        marginRight: 10,
        lineHeight: 22,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconActive: {
        transform: [{ rotate: '180deg' }]
    },
    answerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    answerText: {
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '500',
    },
    footer: {
        marginTop: 24,
        paddingTop: 20,
        borderTopWidth: 1,
        alignItems: 'center',
        marginHorizontal: 24,
    },
    footerText: {
        fontSize: 13,
        marginBottom: 4,
    },
    footerEmail: {
        fontSize: 13,
        color: '#00B074',
        fontWeight: '800',
    },
});
