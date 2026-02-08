/**
 * Hyped App
 *
 * Main entry point for the application
 * Uses Redux Persist to automatically persist auth state
 *
 * @format
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  StatusBar,
  useColorScheme,
  View,
  ActivityIndicator,
  StyleSheet,
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/state/store';
import { loadLanguage } from './src/state/languageSlice';
import { loadFontSize } from './src/state/fontSizeSlice';
import Toast from 'react-native-toast-message';
import MainNavigator from './src/navigation/MainNavigator';
import { NotificationService } from './src/services/NotificationService';
import DeviceBindingService from './src/services/DeviceBindingService';
import SecurityService from './src/services/SecurityService';
import SessionRevocationHandler from './src/services/SessionRevocationHandler';
import SecurityModal from './src/components/SecurityModal';
import CallOverlay from './src/components/CallOverlay';

// Loading component shown while rehydrating
const LoadingView = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#028BD3" />
  </View>
);

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [securityThreatData, setSecurityThreatData] = useState<{
    threats: string[];
    riskLevel?: string;
    details?: Record<string, any>;
    timestamp?: string;
  } | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Load other persisted state on app start
  useEffect(() => {
    store.dispatch(loadLanguage());
    store.dispatch(loadFontSize());
    NotificationService.initialize().catch(err => {
      console.warn('[App] Notification init error:', err);
    });
  }, []);

  // Security Service - threat detection modal
  useEffect(() => {
    SecurityService.setModalCallback((payload) => {
      setSecurityThreatData(payload);
    });
    SecurityService.performSecurityCheck().catch(() => { });
    SecurityService.startSecurityMonitoring(undefined, 3000);
    return () => SecurityService.stopSecurityMonitoring();
  }, []);

  // Device binding - validate session on app resume (Android)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      appStateRef.current = nextState;
      if (wasBackground && nextState === 'active') {
        const forceLogout = await AsyncStorage.getItem('forceLogout');
        if (forceLogout === 'true') {
          await AsyncStorage.removeItem('forceLogout');
          await SessionRevocationHandler.clearAllSessionData();
          SessionRevocationHandler.navigateToLogin('force_logout');
          return;
        }
        const uniqueId = await AsyncStorage.getItem('uniqueId');
        if (uniqueId && Platform.OS === 'android') {
          try {
            await DeviceBindingService.validateSession();
          } catch {
            // SessionRevocationHandler handles validation failure
          }
        }
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingView />} persistor={persistor}>
        <SafeAreaProvider>
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            translucent={false}
          />
          <MainNavigator />
          <CallOverlay />
          <SecurityModal visible={!!securityThreatData?.threats?.length} threatData={securityThreatData} />
          <Toast />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
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
