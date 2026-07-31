import React, { useState, useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { requestUserPermission, getFCMToken, NotificationListener } from './src/services/fcmService';
import { AlertProvider } from './src/context/AlertContext';
import { ThemeProvider } from './src/context/ThemeContext';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    const initFCM = async () => {
      const hasPermission = await requestUserPermission();
      if (hasPermission) {
        await getFCMToken();
      }
    };
    initFCM();
    const unsubscribe = NotificationListener();
    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ThemeProvider>
        <AlertProvider>
          <AppNavigator />
        </AlertProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
