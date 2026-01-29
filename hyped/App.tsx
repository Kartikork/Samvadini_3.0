/**
 * Hyped App
 * 
 * Main entry point for the application
 *
 * @format
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import MainNavigator from './src/navigation/MainNavigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        translucent={false}
      />
      <MainNavigator />
      <Toast />
    </SafeAreaProvider>
  );
}

export default App;
