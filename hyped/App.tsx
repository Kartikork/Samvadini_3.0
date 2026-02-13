/**
 * Hyped App
 * 
 * Main entry point for the application
 * Uses Redux Persist to automatically persist auth state
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/state/store';
import { loadLanguage } from './src/state/languageSlice';
import { loadFontSize } from './src/state/fontSizeSlice';
import Toast from 'react-native-toast-message';
import MainNavigator from './src/navigation/MainNavigator';
import { NotificationService } from './src/services/NotificationService';
import CallOverlay from './src/components/CallOverlay';

// Loading component shown while rehydrating
const LoadingView = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#028BD3" />
  </View>
);

import { GestureHandlerRootView } from 'react-native-gesture-handler';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Load other persisted state on app start
  useEffect(() => {
    store.dispatch(loadLanguage());
    store.dispatch(loadFontSize());
    NotificationService.initialize().catch(err => {
      console.warn('[App] Notification init error:', err);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={<LoadingView />} persistor={persistor}>
          <SafeAreaProvider>
            <StatusBar
              barStyle={isDarkMode ? 'light-content' : 'dark-content'}
              translucent={false}
            />
            <MainNavigator />
            <CallOverlay />
            <Toast />
          </SafeAreaProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
});

export default App;
