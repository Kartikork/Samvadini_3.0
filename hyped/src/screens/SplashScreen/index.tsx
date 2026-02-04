import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ImageStyle,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../state/hooks';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { splashScreen } from '../../assets';
import { AppBootstrap } from '../../services/AppBootstrap';

type SplashScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash'
>;

export default function SplashScreen() {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initStatus, setInitStatus] = useState<string>('Loading...');
  
  // Get auth from Redux (already restored by Redux Persist)
  const { token, uniqueId } = useAppSelector(state => state.auth);

  useEffect(() => {
    // Small delay to ensure Redux Persist has finished rehydration
    const timer = setTimeout(() => {
      initializeApp();
    }, 100);

    return () => clearTimeout(timer);
  }, [token, uniqueId]);

  const initializeApp = async () => {
    try {
      setInitStatus('Checking authentication...');
      
      // Step 1: Check if user is logged in (Redux Persist has already restored state)
      const isLoggedIn = AppBootstrap.isUserLoggedIn();
      
      if (isLoggedIn) {
        // Step 2: User is logged in - Bootstrap the app
        setInitStatus('Loading your data...');
        console.log('[SplashScreen] User logged in - starting app bootstrap');
        
        const result = await AppBootstrap.bootstrapOnAppLaunch();
        
        if (result.success) {
          // Bootstrap successful - navigate to Home
          console.log('[SplashScreen] Bootstrap successful - navigating to Home');
          setInitStatus('Ready!');
          
          // Small delay to show "Ready!" message
          setTimeout(() => {
            navigation.replace('ChatList');
          }, 500);
        } else {
          // Bootstrap failed - maybe token expired, go to login
          console.warn('[SplashScreen] Bootstrap failed:', result.error);
          setInitStatus('Session expired');
          
          setTimeout(() => {
            navigation.replace('LanguageSelection');
          }, 1000);
        }
      } else {
        // Step 3: User not logged in - go to language selection
        console.log('[SplashScreen] User not logged in - navigating to LanguageSelection');
        setInitStatus('Welcome!');
        
        setTimeout(() => {
          navigation.replace('LanguageSelection');
        }, 1000);
      }
    } catch (error) {
      console.error('[SplashScreen] Initialization error:', error);
      setInitStatus('Error loading app');
      
      // On error, go to language selection
      setTimeout(() => {
        navigation.replace('LanguageSelection');
      }, 1500);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Splash Screen Image */}
      <Image
        source={splashScreen}
        style={styles.splashImage}
        resizeMode="cover"
      />
      
      {/* Loading Indicator */}
      {isInitializing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#028BD3" />
          <Text style={styles.statusText}>{initStatus}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  } as ImageStyle,
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
