// src/styles/GlobalStyles.js
import { StyleSheet } from 'react-native';

const Colors = {
    // Color Palette
    matteBlack: '#212121',
    white: '#ffffff',
    cardBg: '#303030',

    primaryContainer: '#39e29b',
    onPrimaryContainer: '#09231a',

    // Glass Effect Tokens
    glassBgLight: 'rgba(255, 255, 255, 0.042)',
    glassBgDark: 'rgba(48, 48, 48, 0.55)',
    glassBgPrimary: 'rgba(57, 226, 155, 0.45)',

    glassBorderLight: 'rgba(255, 255, 255, 0.25)',
    glassBorderDark: 'rgba(255, 255, 255, 0.15)',
};

const Metrics = {
    // Border Radius Scale
    radiusInner: 12,
    radiusOuter: 16,
    radiusLarge: 28,
};

const Fonts = {
    // Typography
    // Note: React Native uses font family names directly. Ensure 'Inter' is linked if you use it.
    // For now, these are standard system font stacks or placeholders.
    primary: 'System', // Replace with 'Inter' if linked
    weightLight: '300',
    weightRegular: '400',
    weightMedium: '500',
    weightSemibold: '600',
    weightBold: '700',
    weightExtrabold: '800',
    weightBlack: '900',
};

// Global Stylesheet
const GlobalStyles = StyleSheet.create({
    // Base Element Defaults
    container: {
        flex: 1,
        backgroundColor: Colors.matteBlack,
    },
    textBase: {
        color: Colors.white,
        fontFamily: Fonts.primary,
        fontWeight: Fonts.weightRegular,
        fontSize: 16,
    },

    // Typography Utilities
    textLight: { fontWeight: Fonts.weightLight },
    textRegular: { fontWeight: Fonts.weightRegular },
    textMedium: { fontWeight: Fonts.weightMedium },
    textSemibold: { fontWeight: Fonts.weightSemibold },
    textBold: { fontWeight: Fonts.weightBold },
    textExtrabold: { fontWeight: Fonts.weightExtrabold },
    textBlack: { fontWeight: Fonts.weightBlack },

    // Common Utility Classes
    bgCard: {
        backgroundColor: Colors.cardBg,
        borderRadius: Metrics.radiusOuter,
    },
    bgPrimary: {
        backgroundColor: Colors.primaryContainer,
        // Text color for primary bg context often needs to be handled on textual children
    },

    // Radius Utilities
    radiusInner: { borderRadius: Metrics.radiusInner },
    radiusOuter: { borderRadius: Metrics.radiusOuter },
    radiusLarge: { borderRadius: Metrics.radiusLarge },

    // Glass Utilities
    // Note: React Native doesn't support 'backdrop-filter' natively in the same way as CSS (requires BlurView).
    // These styles simulate the background color and border aspect.
    glass: {
        backgroundColor: Colors.glassBgLight,
        // backdropFilter: blur(10px) -> Requires @react-native-community/blur
        borderColor: Colors.glassBorderLight,
        borderWidth: 1,
        // box-shadow simulation
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 10, // Android shadow
    },
    glassDark: {
        backgroundColor: Colors.glassBgDark,
    },
    glassPrimary: {
        backgroundColor: Colors.glassBgPrimary,
    },
});

export { Colors, Metrics, Fonts, GlobalStyles };
