/**
 * Hyped App
 * 
 * Main entry point for the application
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/state/store';
import { loadLanguage } from './src/state/languageSlice';
import { loadFontSize } from './src/state/fontSizeSlice';
import Toast from 'react-native-toast-message';
import MainNavigator from './src/navigation/MainNavigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Load persisted state on app start
  useEffect(() => {
    store.dispatch(loadLanguage());
    store.dispatch(loadFontSize());
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          translucent={false}
        />
        <MainNavigator />
        <Toast />
    </SafeAreaProvider>
    </Provider>
  );
}

export default App;
