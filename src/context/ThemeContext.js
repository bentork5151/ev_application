import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LightTheme = {
    background: '#D0D6DB',
    cardBg: '#E2E7EC',
    buttonBg: '#ECEFF1',
    textPrimary: '#1A1A1A',
    textSecondary: '#5A6B7C',
    placeholder: '#7E8E9F',
    divider: '#BFC7CE',
    accent: '#00B074',
    white: '#FFFFFF',
    overlayBg: 'rgba(0,0,0,0.5)',
};

const DarkTheme = {
    background: '#161616',
    cardBg: '#242424',
    buttonBg: '#2D2D2D',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    placeholder: '#707070',
    divider: '#333333',
    accent: '#00B074',
    white: '#1d1d1d',
    overlayBg: 'rgba(0,0,0,0.82)',
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const systemScheme = useColorScheme();
    const [themePreference, setThemePreference] = useState('system');

    useEffect(() => {
        loadThemePreference();
    }, []);

    const loadThemePreference = async () => {
        try {
            const saved = await AsyncStorage.getItem('theme_preference');
            if (saved) {
                setThemePreference(saved);
            }
        } catch (e) {
            console.error('Failed to load theme preference:', e);
        }
    };

    const setTheme = async (preference) => {
        try {
            setThemePreference(preference);
            await AsyncStorage.setItem('theme_preference', preference);
        } catch (e) {
            console.error('Failed to save theme preference:', e);
        }
    };

    const isDark = themePreference === 'system' ? systemScheme === 'dark' : themePreference === 'dark';
    const theme = isDark ? DarkTheme : LightTheme;

    return (
        <ThemeContext.Provider value={{ theme, themePreference, setTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
